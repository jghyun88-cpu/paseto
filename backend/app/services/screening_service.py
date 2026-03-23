"""스크리닝 서비스 — 점수 계산 + 등급 산정 + 인계 자동 트리거 (§18 #2)"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage, NotificationType
from app.models.screening import Screening
from app.models.startup import Startup
from app.models.user import User
from app.schemas.screening import ScreeningUpdate
from app.services import activity_log_service, deal_flow_service, notification_service
from app.services.handover_service import create_from_screening


def calculate_score_and_grade(
    fulltime_commitment: int,
    problem_clarity: int,
    tech_differentiation: int,
    market_potential: int,
    initial_validation: int,
    legal_clear: bool,
    strategy_fit: int,
) -> tuple[float, str]:
    """SRC-F02 총점 계산 + 등급 산정

    총점 = 6개 항목 합산 + (5 if legal_clear else 0)
    30-35 → pass (A등급), 20-29 → review (B등급), <20 → reject (C/D등급)
    """
    score = (
        fulltime_commitment
        + problem_clarity
        + tech_differentiation
        + market_potential
        + initial_validation
        + strategy_fit
        + (5 if legal_clear else 0)
    )
    if score >= 30:
        recommendation = "pass"
    elif score >= 20:
        recommendation = "review"
    else:
        recommendation = "reject"
    return float(score), recommendation


async def get_by_startup(
    db: AsyncSession, startup_id: uuid.UUID,
) -> list[Screening]:
    result = await db.execute(
        select(Screening)
        .where(Screening.startup_id == startup_id, Screening.is_deleted == False)  # noqa: E712
        .order_by(Screening.created_at.desc())
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, screening_id: uuid.UUID,
) -> Screening | None:
    result = await db.execute(
        select(Screening).where(Screening.id == screening_id, Screening.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    startup: Startup,
    user: User,
    fulltime_commitment: int,
    problem_clarity: int,
    tech_differentiation: int,
    market_potential: int,
    initial_validation: int,
    legal_clear: bool,
    strategy_fit: int,
    risk_notes: str | None,
    handover_memo: str | None,
    handover_to_review: bool,
) -> Screening:
    """스크리닝 생성 + 자동화 #2 트리거"""
    overall_score, recommendation = calculate_score_and_grade(
        fulltime_commitment, problem_clarity, tech_differentiation,
        market_potential, initial_validation, legal_clear, strategy_fit,
    )

    screening = Screening(
        startup_id=startup.id,
        screener_id=user.id,
        fulltime_commitment=fulltime_commitment,
        problem_clarity=problem_clarity,
        tech_differentiation=tech_differentiation,
        market_potential=market_potential,
        initial_validation=initial_validation,
        legal_clear=legal_clear,
        strategy_fit=strategy_fit,
        overall_score=overall_score,
        recommendation=recommendation,
        risk_notes=risk_notes,
        handover_memo=handover_memo,
    )
    db.add(screening)
    await db.flush()

    # ActivityLog
    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "screening", "score": overall_score, "recommendation": recommendation},
        startup_id=startup.id,
    )

    # 스크리닝 제출 시 INBOUND → FIRST_SCREENING 자동 전환
    if startup.current_deal_stage == DealStage.INBOUND:
        await deal_flow_service.move_stage(
            db, startup, DealStage.FIRST_SCREENING, user,
            notes=f"1차 스크리닝 제출 (점수 {overall_score}, 등급 {recommendation})",
        )

    # 자동화 #2: pass + 인계 요청 → HandoverDocument + 심사팀 알림
    if recommendation == "pass" and handover_to_review:
        await create_from_screening(db, startup, screening, user)

        # FIRST_SCREENING → DEEP_REVIEW 단계 이동
        await deal_flow_service.move_stage(
            db, startup, DealStage.DEEP_REVIEW, user,
            notes=f"스크리닝 Pass (점수 {overall_score}) → 심사팀 인계",
        )

        # 심사팀에 알림
        await notification_service.notify_team(
            db, "review",
            title=f"인계 도착: {startup.company_name}",
            message=f"소싱팀에서 {startup.company_name}을(를) 인계했습니다. 스크리닝 점수: {overall_score}",
            notification_type=NotificationType.HANDOVER_REQUEST,
            related_entity_type="startup",
            related_entity_id=startup.id,
        )

    await db.refresh(screening)
    return screening


async def update(
    db: AsyncSession,
    screening: Screening,
    data: ScreeningUpdate,
    user: User,
) -> Screening:
    """스크리닝 수정 + 점수 재계산"""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(screening, field, value)

    # 점수 재계산
    score, recommendation = calculate_score_and_grade(
        screening.fulltime_commitment,
        screening.problem_clarity,
        screening.tech_differentiation,
        screening.market_potential,
        screening.initial_validation,
        screening.legal_clear,
        screening.strategy_fit,
    )
    screening.overall_score = score
    screening.recommendation = recommendation

    db.add(screening)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "screening", "score": score, "recommendation": recommendation},
        startup_id=screening.startup_id,
    )
    await db.refresh(screening)
    return screening


async def soft_delete(
    db: AsyncSession,
    screening: Screening,
    user: User,
) -> None:
    """스크리닝 소프트 삭제"""
    screening.is_deleted = True
    db.add(screening)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "delete",
        {"entity": "screening", "screening_id": str(screening.id)},
        startup_id=screening.startup_id,
    )

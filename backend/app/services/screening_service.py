"""스크리닝 서비스 — 점수 계산 + 등급 산정 + 인계 자동 트리거 (§18 #2)"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage, NotificationType
from app.models.screening import Screening
from app.models.startup import Startup
from app.models.user import User
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
        .where(Screening.startup_id == startup_id)
        .order_by(Screening.created_at.desc())
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, screening_id: uuid.UUID,
) -> Screening | None:
    result = await db.execute(
        select(Screening).where(Screening.id == screening_id)
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

    # 자동화 #2: pass + 인계 요청 → HandoverDocument + 심사팀 알림
    if recommendation == "pass" and handover_to_review:
        await create_from_screening(db, startup, screening, user)

        # DealFlow → DEEP_REVIEW 단계 이동
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

    await db.commit()
    await db.refresh(screening)
    return screening

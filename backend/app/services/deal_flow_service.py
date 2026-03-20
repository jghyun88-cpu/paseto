"""딜플로우 서비스 — 단계 이동 + Startup 동기화 + ActivityLog"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.errors import invalid_deal_stage_transition
from app.models.deal_flow import DealFlow
from app.models.startup import Startup
from app.models.user import User
from app.services import activity_log_service

# 허용된 단계 전환 맵 (현재 단계 → 이동 가능한 단계들)
VALID_TRANSITIONS: dict[DealStage, set[DealStage]] = {
    DealStage.INBOUND: {DealStage.FIRST_SCREENING, DealStage.REJECTED},
    DealStage.FIRST_SCREENING: {DealStage.DEEP_REVIEW, DealStage.INBOUND, DealStage.REJECTED},
    DealStage.DEEP_REVIEW: {DealStage.INTERVIEW, DealStage.FIRST_SCREENING, DealStage.REJECTED},
    DealStage.INTERVIEW: {DealStage.DUE_DILIGENCE, DealStage.DEEP_REVIEW, DealStage.REJECTED},
    DealStage.DUE_DILIGENCE: {DealStage.IC_PENDING, DealStage.INTERVIEW, DealStage.REJECTED},
    DealStage.IC_PENDING: {DealStage.IC_REVIEW},
    DealStage.IC_REVIEW: {
        DealStage.APPROVED, DealStage.CONDITIONAL,
        DealStage.ON_HOLD, DealStage.INCUBATION_FIRST, DealStage.REJECTED,
    },
    DealStage.APPROVED: {DealStage.CONTRACT},
    DealStage.CONDITIONAL: {DealStage.CONTRACT, DealStage.REJECTED},
    DealStage.ON_HOLD: {DealStage.IC_REVIEW, DealStage.REJECTED},
    DealStage.INCUBATION_FIRST: {DealStage.IC_REVIEW, DealStage.PORTFOLIO},
    DealStage.CONTRACT: {DealStage.CLOSED},
    DealStage.CLOSED: {DealStage.PORTFOLIO},
}


async def get_by_startup(
    db: AsyncSession, startup_id: uuid.UUID,
) -> list[DealFlow]:
    """스타트업의 딜플로우 이력 조회 (시간순)"""
    result = await db.execute(
        select(DealFlow)
        .where(DealFlow.startup_id == startup_id)
        .order_by(DealFlow.moved_at.asc())
    )
    return list(result.scalars().all())


async def move_stage(
    db: AsyncSession,
    startup: Startup,
    to_stage: DealStage,
    user: User,
    notes: str | None = None,
) -> DealFlow:
    """칸반 단계 이동 → DealFlow 기록 + Startup.current_deal_stage 동기화"""
    old_stage = startup.current_deal_stage

    # 단계 전환 유효성 검증
    if old_stage and old_stage in VALID_TRANSITIONS:
        allowed = VALID_TRANSITIONS[old_stage]
        if to_stage not in allowed:
            raise invalid_deal_stage_transition(
                old_stage.value if old_stage else "none",
                to_stage.value,
            )

    # DealFlow 레코드 생성
    deal_flow = DealFlow(
        startup_id=startup.id,
        stage=to_stage,
        moved_by=user.id,
        notes=notes,
    )
    db.add(deal_flow)

    # Startup 동기화
    startup.current_deal_stage = to_stage

    # ActivityLog
    await activity_log_service.log(
        db, user.id, "update",
        {
            "entity": "deal_flow",
            "from_stage": old_stage.value if old_stage else None,
            "to_stage": to_stage.value,
            "company_name": startup.company_name,
        },
        startup_id=startup.id,
    )

    await db.commit()
    await db.refresh(deal_flow)
    return deal_flow

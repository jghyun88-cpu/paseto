"""IC 결정 서비스 — 결정 기록 + DealStage 자동 전환 (#4)"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage, ICDecisionType
from app.models.ic_decision import ICDecision
from app.models.investment_memo import InvestmentMemo
from app.models.startup import Startup
from app.models.user import User
from app.schemas.ic_decision import ICDecisionCreate
from app.services import activity_log_service, deal_flow_service

# ICDecisionType → DealStage 매핑
_DECISION_TO_STAGE: dict[ICDecisionType, DealStage] = {
    ICDecisionType.APPROVED: DealStage.CONTRACT,
    ICDecisionType.CONDITIONAL: DealStage.CONDITIONAL,
    ICDecisionType.ON_HOLD: DealStage.ON_HOLD,
    ICDecisionType.INCUBATION_FIRST: DealStage.INCUBATION_FIRST,
    ICDecisionType.REJECTED: DealStage.REJECTED,
}


async def get_by_startup(
    db: AsyncSession, startup_id: uuid.UUID,
) -> list[ICDecision]:
    result = await db.execute(
        select(ICDecision)
        .where(ICDecision.startup_id == startup_id, ICDecision.is_deleted == False)  # noqa: E712
        .order_by(ICDecision.decided_at.desc())
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, decision_id: uuid.UUID,
) -> ICDecision | None:
    result = await db.execute(
        select(ICDecision).where(ICDecision.id == decision_id, ICDecision.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    startup: Startup,
    memo: InvestmentMemo,
    user: User,
    data: ICDecisionCreate,
) -> ICDecision:
    """IC 결정 기록 + 자동화 #4: DealStage 자동 전환"""
    decision_type = ICDecisionType(data.decision)

    ic = ICDecision(
        startup_id=startup.id,
        memo_id=memo.id,
        decision=decision_type,
        conditions=data.conditions,
        monitoring_points=data.monitoring_points,
        attendees=data.attendees,
        contract_assignee_id=data.contract_assignee_id,
        program_assignee_id=data.program_assignee_id,
        notes=data.notes,
    )
    db.add(ic)
    await db.flush()

    # 자동화 #4: IC 결정 → DealStage 자동 전환
    to_stage = _DECISION_TO_STAGE.get(decision_type)
    if to_stage:
        await deal_flow_service.move_stage(
            db, startup, to_stage, user,
            notes=f"IC 결정: {decision_type.value}",
        )

    await activity_log_service.log(
        db, user.id, "decision",
        {"entity": "ic_decision", "decision": decision_type.value},
        startup_id=startup.id,
    )

    await db.refresh(ic)
    return ic

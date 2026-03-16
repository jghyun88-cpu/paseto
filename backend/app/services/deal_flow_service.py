"""딜플로우 서비스 — 단계 이동 + Startup 동기화 + ActivityLog"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.deal_flow import DealFlow
from app.models.startup import Startup
from app.models.user import User
from app.services import activity_log_service


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

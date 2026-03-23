"""후속투자 서비스 — 라운드 관리 + 투자자맵"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow_on_investment import FollowOnInvestment
from app.models.user import User
from app.schemas.follow_on_investment import FollowOnCreate, FollowOnUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    startup_id: uuid.UUID | None = None,
    status: str | None = None,
) -> tuple[list[FollowOnInvestment], int]:
    query = select(FollowOnInvestment).where(FollowOnInvestment.is_deleted == False)  # noqa: E712

    if startup_id:
        query = query.where(FollowOnInvestment.startup_id == startup_id)
    if status:
        query = query.where(FollowOnInvestment.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(FollowOnInvestment.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, follow_on_id: uuid.UUID) -> FollowOnInvestment | None:
    result = await db.execute(
        select(FollowOnInvestment).where(
            FollowOnInvestment.id == follow_on_id, FollowOnInvestment.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: FollowOnCreate, user: User) -> FollowOnInvestment:
    follow_on = FollowOnInvestment(**data.model_dump())
    db.add(follow_on)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "follow_on_investment", "id": str(follow_on.id)},
        startup_id=data.startup_id,
    )

    # FR-04: 후속투자 등록 → OI→심사 역인계
    from app.services import handover_service
    from app.models.startup import Startup
    startup_result = await db.execute(
        select(Startup).where(Startup.id == data.startup_id)
    )
    startup = startup_result.scalar_one_or_none()
    if startup:
        await handover_service.create_oi_to_review(
            db, startup, user,
            strategic_investment_potential=data.round_type or "",
            follow_on_points=[f"후속투자 목표금액: {data.target_amount or 'N/A'}"],
        )

    await db.refresh(follow_on)
    return follow_on


async def update(db: AsyncSession, follow_on: FollowOnInvestment, data: FollowOnUpdate, user: User) -> FollowOnInvestment:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(follow_on, field, value)

    db.add(follow_on)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "follow_on_investment", "fields": list(update_data.keys())},
        startup_id=follow_on.startup_id,
    )
    await db.refresh(follow_on)
    return follow_on

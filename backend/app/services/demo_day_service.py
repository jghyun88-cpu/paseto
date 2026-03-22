"""데모데이 서비스 — Demo Day 관리 + 후속추적"""

import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.demo_day import DemoDay
from app.models.user import User
from app.schemas.demo_day import DemoDayCreate, DemoDayUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[DemoDay], int]:
    query = select(DemoDay).where(DemoDay.is_deleted == False)  # noqa: E712

    if status:
        query = query.where(DemoDay.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(DemoDay.event_date.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(
    db: AsyncSession, demo_day_id: uuid.UUID,
) -> DemoDay | None:
    result = await db.execute(
        select(DemoDay).where(
            DemoDay.id == demo_day_id,
            DemoDay.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: DemoDayCreate, user: User,
) -> DemoDay:
    follow_up_deadline = data.event_date + timedelta(weeks=data.follow_up_weeks)

    demo_day = DemoDay(
        title=data.title,
        event_date=data.event_date,
        batch_id=data.batch_id,
        follow_up_deadline=follow_up_deadline,
        status="planning",
    )
    db.add(demo_day)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "demo_day", "demo_day_id": str(demo_day.id)},
    )

    await db.refresh(demo_day)
    return demo_day


async def update(
    db: AsyncSession, demo_day: DemoDay, data: DemoDayUpdate, user: User,
) -> DemoDay:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(demo_day, field, value)

    db.add(demo_day)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "demo_day", "fields": list(update_data.keys())},
    )

    await db.refresh(demo_day)
    return demo_day

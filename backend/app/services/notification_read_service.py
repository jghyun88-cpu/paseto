"""알림 읽음 서비스 — 조회 + 읽음 처리"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def get_my_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_type: str | None = None,
    is_read: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Notification], int]:
    query = select(Notification).where(Notification.user_id == user_id)

    if notification_type:
        query = query.where(Notification.notification_type == notification_type)
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(Notification.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def mark_read(db: AsyncSession, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification | None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.refresh(notif)
    return notif


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    return result.rowcount

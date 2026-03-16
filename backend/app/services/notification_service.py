"""알림 서비스 — 범용 Notification 생성"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import NotificationType
from app.models.notification import Notification
from app.models.user import User


async def create(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: NotificationType,
    related_entity_type: str | None = None,
    related_entity_id: uuid.UUID | None = None,
) -> Notification:
    """단일 사용자에게 알림 생성"""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
    )
    db.add(notif)
    return notif


async def notify_team(
    db: AsyncSession,
    team: str,
    title: str,
    message: str,
    notification_type: NotificationType,
    related_entity_type: str | None = None,
    related_entity_id: uuid.UUID | None = None,
) -> int:
    """팀 전체에 알림 생성 — 해당 팀 활성 사용자 모두에게 전송"""
    result = await db.execute(
        select(User).where(User.team == team, User.is_active == True)  # noqa: E712
    )
    users = result.scalars().all()
    count = 0
    for user in users:
        await create(
            db, user.id, title, message, notification_type,
            related_entity_type, related_entity_id,
        )
        count += 1
    return count

"""알림 라우터 — /api/v1/notifications/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services import notification_read_service

router = APIRouter()


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    notification_type: str | None = None,
    is_read: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> NotificationListResponse:
    """내 알림 목록"""
    items, total = await notification_read_service.get_my_notifications(
        db, current_user.id,
        notification_type=notification_type, is_read=is_read,
        page=page, page_size=page_size,
    )
    return NotificationListResponse(
        data=[NotificationResponse.model_validate(n) for n in items],
        total=total, page=page, page_size=page_size,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> NotificationResponse:
    """알림 읽음 처리"""
    notif = await notification_read_service.mark_read(db, notification_id, current_user.id)
    if notif is None:
        from app.errors import notification_not_found
        raise notification_not_found()
    return NotificationResponse.model_validate(notif)


@router.patch("/read-all")
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict:
    """전체 읽음 처리"""
    count = await notification_read_service.mark_all_read(db, current_user.id)
    return {"count": count}

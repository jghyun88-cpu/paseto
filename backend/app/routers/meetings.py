"""회의 라우터 — /api/v1/meetings/"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import meeting_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.meeting import (
    MeetingCreate,
    MeetingListResponse,
    MeetingResponse,
    MeetingUpdate,
)
from app.services import meeting_service

router = APIRouter()


@router.get("/", response_model=MeetingListResponse)
async def list_meetings(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
    meeting_type: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> MeetingListResponse:
    items, total = await meeting_service.get_list(
        db, page=page, page_size=page_size,
        meeting_type=meeting_type, from_date=from_date, to_date=to_date,
    )
    return MeetingListResponse(
        data=[MeetingResponse.model_validate(m) for m in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> MeetingResponse:
    meeting = await meeting_service.get_by_id(db, meeting_id)
    if meeting is None:
        raise meeting_not_found()
    return MeetingResponse.model_validate(meeting)


@router.post("/", response_model=MeetingResponse, status_code=201)
async def create_meeting(
    data: MeetingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "full"))],
) -> MeetingResponse:
    meeting = await meeting_service.create(db, data, current_user)
    return MeetingResponse.model_validate(meeting)


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "full"))],
) -> MeetingResponse:
    meeting = await meeting_service.get_by_id(db, meeting_id)
    if meeting is None:
        raise meeting_not_found()
    updated = await meeting_service.update(db, meeting, data, current_user)
    return MeetingResponse.model_validate(updated)


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "full"))],
) -> None:
    meeting = await meeting_service.get_by_id(db, meeting_id)
    if meeting is None:
        raise meeting_not_found()
    await meeting_service.delete(db, meeting, current_user)

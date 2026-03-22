"""투자자 미팅 라우터 — /api/v1/investor-meetings/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import investor_meeting_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.investor_meeting import (
    InvestorMeetingCreate,
    InvestorMeetingListResponse,
    InvestorMeetingResponse,
    InvestorMeetingUpdate,
)
from app.services import investor_meeting_service

router = APIRouter()


@router.get("/", response_model=InvestorMeetingListResponse)
async def list_investor_meetings(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
    startup_id: uuid.UUID | None = None,
    demo_day_id: uuid.UUID | None = None,
    outcome: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> InvestorMeetingListResponse:
    """투자자 미팅 목록"""
    items, total = await investor_meeting_service.get_list(
        db, startup_id=startup_id, demo_day_id=demo_day_id, outcome=outcome,
        page=page, page_size=page_size,
    )
    return InvestorMeetingListResponse(
        data=[InvestorMeetingResponse.model_validate(m) for m in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{meeting_id}", response_model=InvestorMeetingResponse)
async def get_investor_meeting(
    meeting_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
) -> InvestorMeetingResponse:
    """투자자 미팅 상세"""
    meeting = await investor_meeting_service.get_by_id(db, meeting_id)
    if meeting is None:
        raise investor_meeting_not_found()
    return InvestorMeetingResponse.model_validate(meeting)


@router.post("/", response_model=InvestorMeetingResponse, status_code=201)
async def create_investor_meeting(
    data: InvestorMeetingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> InvestorMeetingResponse:
    """투자자 미팅 기록"""
    meeting = await investor_meeting_service.create(db, data, current_user)
    return InvestorMeetingResponse.model_validate(meeting)


@router.patch("/{meeting_id}", response_model=InvestorMeetingResponse)
async def update_investor_meeting(
    meeting_id: uuid.UUID,
    data: InvestorMeetingUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> InvestorMeetingResponse:
    """투자자 미팅 수정"""
    meeting = await investor_meeting_service.get_by_id(db, meeting_id)
    if meeting is None:
        raise investor_meeting_not_found()
    updated = await investor_meeting_service.update(db, meeting, data, current_user)
    return InvestorMeetingResponse.model_validate(updated)

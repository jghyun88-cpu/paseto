"""멘토 풀 라우터 — /api/v1/mentors/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import mentor_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.mentor import (
    MentorCreate,
    MentorListResponse,
    MentorResponse,
    MentorUpdate,
)
from app.services import mentor_service

router = APIRouter()


@router.get("/", response_model=MentorListResponse)
async def list_mentors(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
    is_active: bool | None = None,
    mentor_type: str | None = None,
    expertise: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> MentorListResponse:
    """멘토 목록"""
    items, total = await mentor_service.get_list(
        db, is_active=is_active, mentor_type=mentor_type, expertise=expertise,
        page=page, page_size=page_size,
    )
    return MentorListResponse(
        data=[MentorResponse.model_validate(m) for m in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{mentor_id}", response_model=MentorResponse)
async def get_mentor(
    mentor_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
) -> MentorResponse:
    """멘토 상세"""
    mentor = await mentor_service.get_by_id(db, mentor_id)
    if mentor is None:
        raise mentor_not_found()
    return MentorResponse.model_validate(mentor)


@router.post("/", response_model=MentorResponse, status_code=201)
async def create_mentor(
    data: MentorCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> MentorResponse:
    """멘토 등록"""
    mentor = await mentor_service.create(db, data, current_user)
    return MentorResponse.model_validate(mentor)


@router.patch("/{mentor_id}", response_model=MentorResponse)
async def update_mentor(
    mentor_id: uuid.UUID,
    data: MentorUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> MentorResponse:
    """멘토 정보 수정"""
    mentor = await mentor_service.get_by_id(db, mentor_id)
    if mentor is None:
        raise mentor_not_found()
    updated = await mentor_service.update(db, mentor, data, current_user)
    return MentorResponse.model_validate(updated)

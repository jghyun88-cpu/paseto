"""멘토링 세션 라우터 — /api/v1/mentoring-sessions/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import mentoring_session_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.mentoring_session import (
    ActionItemsBatchUpdate,
    MentoringSessionCreate,
    MentoringSessionListResponse,
    MentoringSessionResponse,
    MentoringSessionUpdate,
)
from app.services import mentoring_service

router = APIRouter()


@router.get("/", response_model=MentoringSessionListResponse)
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("mentoring", "read"))],
    startup_id: uuid.UUID | None = None,
    mentor_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> MentoringSessionListResponse:
    """멘토링 세션 목록"""
    items, total = await mentoring_service.get_list(
        db, startup_id=startup_id, mentor_id=mentor_id, page=page, page_size=page_size,
    )
    return MentoringSessionListResponse(
        data=[MentoringSessionResponse.model_validate(s) for s in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{session_id}", response_model=MentoringSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("mentoring", "read"))],
) -> MentoringSessionResponse:
    """멘토링 세션 상세"""
    session = await mentoring_service.get_by_id(db, session_id)
    if session is None:
        raise mentoring_session_not_found()
    return MentoringSessionResponse.model_validate(session)


@router.post("/", response_model=MentoringSessionResponse, status_code=201)
async def create_session(
    data: MentoringSessionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("mentoring", "full"))],
) -> MentoringSessionResponse:
    """멘토링 기록 생성 (PRG-F03)"""
    session = await mentoring_service.create(db, data, current_user)
    return MentoringSessionResponse.model_validate(session)


@router.patch("/{session_id}", response_model=MentoringSessionResponse)
async def update_session(
    session_id: uuid.UUID,
    data: MentoringSessionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("mentoring", "full"))],
) -> MentoringSessionResponse:
    """멘토링 기록 수정"""
    session = await mentoring_service.get_by_id(db, session_id)
    if session is None:
        raise mentoring_session_not_found()
    updated = await mentoring_service.update(db, session, data, current_user)
    return MentoringSessionResponse.model_validate(updated)


@router.patch("/{session_id}/action-items", response_model=MentoringSessionResponse)
async def update_action_items(
    session_id: uuid.UUID,
    data: ActionItemsBatchUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("mentoring", "full"))],
) -> MentoringSessionResponse:
    """액션아이템 상태 업데이트"""
    session = await mentoring_service.get_by_id(db, session_id)
    if session is None:
        raise mentoring_session_not_found()
    updated = await mentoring_service.update_action_items_status(db, session, data, current_user)
    return MentoringSessionResponse.model_validate(updated)

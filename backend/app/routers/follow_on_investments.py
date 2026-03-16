"""후속투자 라우터 — /api/v1/follow-on-investments/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import follow_on_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.follow_on_investment import (
    FollowOnCreate,
    FollowOnListResponse,
    FollowOnResponse,
    FollowOnUpdate,
)
from app.services import follow_on_service

router = APIRouter()


@router.get("/", response_model=FollowOnListResponse)
async def list_follow_on(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
    startup_id: uuid.UUID | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> FollowOnListResponse:
    items, total = await follow_on_service.get_list(
        db, page=page, page_size=page_size, startup_id=startup_id, status=status,
    )
    return FollowOnListResponse(
        data=[FollowOnResponse.model_validate(f) for f in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{follow_on_id}", response_model=FollowOnResponse)
async def get_follow_on(
    follow_on_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
) -> FollowOnResponse:
    follow_on = await follow_on_service.get_by_id(db, follow_on_id)
    if follow_on is None:
        raise follow_on_not_found()
    return FollowOnResponse.model_validate(follow_on)


@router.post("/", response_model=FollowOnResponse, status_code=201)
async def create_follow_on(
    data: FollowOnCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> FollowOnResponse:
    follow_on = await follow_on_service.create(db, data, current_user)
    return FollowOnResponse.model_validate(follow_on)


@router.put("/{follow_on_id}", response_model=FollowOnResponse)
async def update_follow_on(
    follow_on_id: uuid.UUID,
    data: FollowOnUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> FollowOnResponse:
    follow_on = await follow_on_service.get_by_id(db, follow_on_id)
    if follow_on is None:
        raise follow_on_not_found()
    updated = await follow_on_service.update(db, follow_on, data, current_user)
    return FollowOnResponse.model_validate(updated)

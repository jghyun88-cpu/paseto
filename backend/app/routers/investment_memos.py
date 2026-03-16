"""투자메모 라우터 — /api/v1/investment-memos/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.investment_memo import MemoCreate, MemoResponse, MemoUpdate
from app.services import investment_memo_service, startup_service

router = APIRouter()


@router.get("/", response_model=list[MemoResponse])
async def list_memos(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("review_dd_memo", "read"))],
) -> list[MemoResponse]:
    items = await investment_memo_service.get_by_startup(db, startup_id)
    return [MemoResponse.model_validate(m) for m in items]


@router.get("/{memo_id}", response_model=MemoResponse)
async def get_memo(
    memo_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("review_dd_memo", "read"))],
) -> MemoResponse:
    memo = await investment_memo_service.get_by_id(db, memo_id)
    if memo is None:
        from app.errors import memo_not_found
        raise memo_not_found()
    return MemoResponse.model_validate(memo)


@router.post("/", response_model=MemoResponse, status_code=201)
async def create_memo(
    data: MemoCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("review_dd_memo", "full"))],
) -> MemoResponse:
    startup = await startup_service.get_by_id(db, data.startup_id)
    if startup is None:
        raise startup_not_found()
    memo = await investment_memo_service.create(db, startup, current_user, data)
    return MemoResponse.model_validate(memo)


@router.patch("/{memo_id}", response_model=MemoResponse)
async def update_memo(
    memo_id: uuid.UUID,
    data: MemoUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("review_dd_memo", "full"))],
) -> MemoResponse:
    memo = await investment_memo_service.get_by_id(db, memo_id)
    if memo is None:
        from app.errors import memo_not_found
        raise memo_not_found()
    updated = await investment_memo_service.update(db, memo, data, current_user)
    return MemoResponse.model_validate(updated)

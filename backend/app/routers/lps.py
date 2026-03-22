"""LP(출자자) 관리 라우터 — /api/v1/lps/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_active_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.lp import LPCreate, LPListResponse, LPResponse, LPUpdate
from app.services import lp_service

router = APIRouter()


@router.get("", response_model=LPListResponse)
async def list_lps(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
) -> LPListResponse:
    items, total = await lp_service.list_all(db, page, page_size, search)
    return LPListResponse(
        data=[LPResponse.model_validate(lp) for lp in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{lp_id}", response_model=LPResponse)
async def get_lp(
    lp_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
) -> LPResponse:
    lp = await lp_service.get_by_id(db, lp_id)
    if lp is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="해당 LP를 찾을 수 없습니다.")
    return LPResponse.model_validate(lp)


@router.post("", response_model=LPResponse, status_code=201)
async def create_lp(
    data: LPCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> LPResponse:
    lp = await lp_service.create(db, data, current_user)
    return LPResponse.model_validate(lp)


@router.patch("/{lp_id}", response_model=LPResponse)
async def update_lp(
    lp_id: uuid.UUID,
    data: LPUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> LPResponse:
    lp = await lp_service.get_by_id(db, lp_id)
    if lp is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="해당 LP를 찾을 수 없습니다.")
    updated = await lp_service.update(db, lp, data, current_user)
    return LPResponse.model_validate(updated)


@router.delete("/{lp_id}", status_code=204)
async def delete_lp(
    lp_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> None:
    lp = await lp_service.get_by_id(db, lp_id)
    if lp is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="해당 LP를 찾을 수 없습니다.")
    await lp_service.soft_delete(db, lp, current_user)

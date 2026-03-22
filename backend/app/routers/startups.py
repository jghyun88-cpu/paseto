"""스타트업 CRUD 라우터 — /api/v1/startups/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import startup_not_found
from app.middleware.auth import get_current_active_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.startup import (
    StartupCreate,
    StartupListResponse,
    StartupResponse,
    StartupUpdate,
)
from app.services import startup_service

router = APIRouter()


@router.get("", response_model=StartupListResponse)
@router.get("/", response_model=StartupListResponse, include_in_schema=False)
async def list_startups(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    industry: str | None = None,
    stage: str | None = None,
    current_deal_stage: str | None = None,
    sourcing_channel: str | None = None,
    is_portfolio: bool | None = None,
    assigned_manager_id: uuid.UUID | None = None,
    has_deal_flow: bool | None = None,
) -> StartupListResponse:
    """스타트업 목록 조회 (페이지네이션 + 필터)"""
    items, total = await startup_service.get_list(
        db,
        page=page,
        page_size=page_size,
        search=search,
        industry=industry,
        stage=stage,
        current_deal_stage=current_deal_stage,
        sourcing_channel=sourcing_channel,
        is_portfolio=is_portfolio,
        assigned_manager_id=assigned_manager_id,
        has_deal_flow=has_deal_flow,
    )
    return StartupListResponse(
        data=[StartupResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{startup_id}", response_model=StartupResponse)
async def get_startup(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> StartupResponse:
    """스타트업 상세 조회"""
    startup = await startup_service.get_by_id(db, startup_id)
    if startup is None:
        raise startup_not_found()
    return StartupResponse.model_validate(startup)


@router.post("", response_model=StartupResponse, status_code=201)
@router.post("/", response_model=StartupResponse, status_code=201, include_in_schema=False)
async def create_startup(
    data: StartupCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "full"))],
) -> StartupResponse:
    """스타트업 생성 → DealFlow(inbound) + ActivityLog 자동 생성"""
    startup = await startup_service.create(db, data, current_user)
    return StartupResponse.model_validate(startup)


@router.patch("/{startup_id}", response_model=StartupResponse)
async def update_startup(
    startup_id: uuid.UUID,
    data: StartupUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "write"))],
) -> StartupResponse:
    """스타트업 수정"""
    startup = await startup_service.get_by_id(db, startup_id)
    if startup is None:
        raise startup_not_found()
    updated = await startup_service.update(db, startup, data, current_user)
    return StartupResponse.model_validate(updated)


@router.delete("/{startup_id}", status_code=204)
async def delete_startup(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "full"))],
) -> None:
    """스타트업 소프트 삭제"""
    startup = await startup_service.get_by_id(db, startup_id)
    if startup is None:
        raise startup_not_found()
    await startup_service.soft_delete(db, startup, current_user)

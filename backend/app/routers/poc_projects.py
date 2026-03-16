"""PoC 프로젝트 라우터 — /api/v1/poc-projects/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import poc_project_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.poc_project import (
    PoCProgressUpdate,
    PoCProjectCreate,
    PoCProjectListResponse,
    PoCProjectResponse,
    PoCProjectUpdate,
    PoCStatusChange,
)
from app.services import poc_service

router = APIRouter()


@router.get("/", response_model=PoCProjectListResponse)
async def list_poc_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
    status: str | None = None,
    startup_id: uuid.UUID | None = None,
    partner_demand_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PoCProjectListResponse:
    items, total = await poc_service.get_list(
        db, page=page, page_size=page_size, status=status,
        startup_id=startup_id, partner_demand_id=partner_demand_id,
    )
    return PoCProjectListResponse(
        data=[PoCProjectResponse.model_validate(p) for p in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{poc_id}", response_model=PoCProjectResponse)
async def get_poc_project(
    poc_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
) -> PoCProjectResponse:
    poc = await poc_service.get_by_id(db, poc_id)
    if poc is None:
        raise poc_project_not_found()
    return PoCProjectResponse.model_validate(poc)


@router.post("/", response_model=PoCProjectResponse, status_code=201)
async def create_poc_project(
    data: PoCProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> PoCProjectResponse:
    """PoC 생성 (OI-F02)"""
    poc = await poc_service.create(db, data, current_user)
    return PoCProjectResponse.model_validate(poc)


@router.put("/{poc_id}", response_model=PoCProjectResponse)
async def update_poc_project(
    poc_id: uuid.UUID,
    data: PoCProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> PoCProjectResponse:
    poc = await poc_service.get_by_id(db, poc_id)
    if poc is None:
        raise poc_project_not_found()
    updated = await poc_service.update(db, poc, data, current_user)
    return PoCProjectResponse.model_validate(updated)


@router.patch("/{poc_id}/status", response_model=PoCProjectResponse)
async def change_poc_status(
    poc_id: uuid.UUID,
    data: PoCStatusChange,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> PoCProjectResponse:
    """PoC 상태 변경"""
    poc = await poc_service.get_by_id(db, poc_id)
    if poc is None:
        raise poc_project_not_found()
    updated = await poc_service.change_status(db, poc, data, current_user)
    return PoCProjectResponse.model_validate(updated)


@router.patch("/{poc_id}/progress", response_model=PoCProjectResponse)
async def update_poc_progress(
    poc_id: uuid.UUID,
    data: PoCProgressUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> PoCProjectResponse:
    """PoC 진행 업데이트 (OI-F03) — 자동화 #8 포함"""
    poc = await poc_service.get_by_id(db, poc_id)
    if poc is None:
        raise poc_project_not_found()
    updated = await poc_service.update_progress(db, poc, data, current_user)
    return PoCProjectResponse.model_validate(updated)

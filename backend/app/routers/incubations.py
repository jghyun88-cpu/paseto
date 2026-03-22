"""보육 포트폴리오 라우터 — /api/v1/incubations/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import PortfolioGrade
from app.errors import incubation_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.incubation import (
    ActionPlanUpdate,
    GradeChangeRequest,
    IncubationCreate,
    IncubationListResponse,
    IncubationResponse,
    IncubationUpdate,
)
from app.services import incubation_service

router = APIRouter()


@router.get("/", response_model=IncubationListResponse)
async def list_incubations(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    grade: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> IncubationListResponse:
    """포트폴리오 목록 (등급·상태 필터)"""
    items, total = await incubation_service.get_list(
        db, page=page, page_size=page_size, grade=grade, status=status, search=search,
    )
    return IncubationListResponse(
        data=[IncubationResponse.model_validate(i) for i in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{incubation_id}", response_model=IncubationResponse)
async def get_incubation(
    incubation_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
) -> IncubationResponse:
    """포트폴리오 상세"""
    incubation = await incubation_service.get_by_id(db, incubation_id)
    if incubation is None:
        raise incubation_not_found()
    return IncubationResponse.model_validate(incubation)


@router.post("/", response_model=IncubationResponse, status_code=201)
async def create_incubation(
    data: IncubationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> IncubationResponse:
    """온보딩 생성 (PRG-F01)"""
    incubation = await incubation_service.create(db, data, current_user)
    return IncubationResponse.model_validate(incubation)


@router.patch("/{incubation_id}", response_model=IncubationResponse)
async def update_incubation(
    incubation_id: uuid.UUID,
    data: IncubationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> IncubationResponse:
    """온보딩 정보 수정"""
    incubation = await incubation_service.get_by_id(db, incubation_id)
    if incubation is None:
        raise incubation_not_found()
    updated = await incubation_service.update(db, incubation, data, current_user)
    return IncubationResponse.model_validate(updated)


@router.patch("/{incubation_id}/grade", response_model=IncubationResponse)
async def change_grade(
    incubation_id: uuid.UUID,
    data: GradeChangeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("portfolio_grade", "full"))],
) -> IncubationResponse:
    """포트폴리오 등급 변경 (PM/Partner만)"""
    incubation = await incubation_service.get_by_id(db, incubation_id)
    if incubation is None:
        raise incubation_not_found()
    updated = await incubation_service.change_grade(
        db, incubation, PortfolioGrade(data.grade), data.reason, current_user,
    )
    return IncubationResponse.model_validate(updated)


@router.patch("/{incubation_id}/action-plan", response_model=IncubationResponse)
async def update_action_plan(
    incubation_id: uuid.UUID,
    data: ActionPlanUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> IncubationResponse:
    """90일 액션플랜 저장/수정 (PRG-F02)"""
    incubation = await incubation_service.get_by_id(db, incubation_id)
    if incubation is None:
        raise incubation_not_found()
    updated = await incubation_service.update_action_plan(db, incubation, data, current_user)
    return IncubationResponse.model_validate(updated)

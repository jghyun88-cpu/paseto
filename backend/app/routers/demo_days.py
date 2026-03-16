"""데모데이 라우터 — /api/v1/demo-days/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import demo_day_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.demo_day import (
    DemoDayCreate,
    DemoDayListResponse,
    DemoDayResponse,
    DemoDayUpdate,
)
from app.services import demo_day_service

router = APIRouter()


@router.get("/", response_model=DemoDayListResponse)
async def list_demo_days(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> DemoDayListResponse:
    """데모데이 목록"""
    items, total = await demo_day_service.get_list(
        db, status=status, page=page, page_size=page_size,
    )
    return DemoDayListResponse(
        data=[DemoDayResponse.model_validate(d) for d in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{demo_day_id}", response_model=DemoDayResponse)
async def get_demo_day(
    demo_day_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("incubation", "read"))],
) -> DemoDayResponse:
    """데모데이 상세"""
    demo_day = await demo_day_service.get_by_id(db, demo_day_id)
    if demo_day is None:
        raise demo_day_not_found()
    return DemoDayResponse.model_validate(demo_day)


@router.post("/", response_model=DemoDayResponse, status_code=201)
async def create_demo_day(
    data: DemoDayCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> DemoDayResponse:
    """데모데이 생성"""
    demo_day = await demo_day_service.create(db, data, current_user)
    return DemoDayResponse.model_validate(demo_day)


@router.put("/{demo_day_id}", response_model=DemoDayResponse)
async def update_demo_day(
    demo_day_id: uuid.UUID,
    data: DemoDayUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("incubation", "full"))],
) -> DemoDayResponse:
    """데모데이 수정"""
    demo_day = await demo_day_service.get_by_id(db, demo_day_id)
    if demo_day is None:
        raise demo_day_not_found()
    updated = await demo_day_service.update(db, demo_day, data, current_user)
    return DemoDayResponse.model_validate(updated)

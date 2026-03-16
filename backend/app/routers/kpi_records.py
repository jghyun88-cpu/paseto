"""KPI 기록 라우터 — /api/v1/kpi-records/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import kpi_record_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.kpi_record import (
    KPIRecordCreate,
    KPIRecordListResponse,
    KPIRecordResponse,
    KPIRecordUpdate,
    KPITrendResponse,
)
from app.services import kpi_service

router = APIRouter()


@router.get("/", response_model=KPIRecordListResponse)
async def list_kpi_records(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("kpi", "read"))],
    startup_id: uuid.UUID | None = None,
    period: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> KPIRecordListResponse:
    """KPI 기록 목록"""
    items, total = await kpi_service.get_list(
        db, startup_id=startup_id, period=period, page=page, page_size=page_size,
    )
    return KPIRecordListResponse(
        data=[KPIRecordResponse.model_validate(r) for r in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{startup_id}/trend", response_model=KPITrendResponse)
async def get_kpi_trend(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("kpi", "read"))],
    months: int = Query(6, ge=1, le=24),
) -> KPITrendResponse:
    """KPI 트렌드 (최근 N개월)"""
    return await kpi_service.get_trend(db, startup_id, months=months)


@router.post("/", response_model=KPIRecordResponse, status_code=201)
async def create_kpi_record(
    data: KPIRecordCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("kpi", "full"))],
) -> KPIRecordResponse:
    """월간 KPI 입력 (PRG-F04)"""
    record = await kpi_service.create(db, data, current_user)
    return KPIRecordResponse.model_validate(record)


@router.put("/{record_id}", response_model=KPIRecordResponse)
async def update_kpi_record(
    record_id: uuid.UUID,
    data: KPIRecordUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("kpi", "full"))],
) -> KPIRecordResponse:
    """KPI 기록 수정"""
    record = await kpi_service.get_by_id(db, record_id)
    if record is None:
        raise kpi_record_not_found()
    updated = await kpi_service.update(db, record, data, current_user)
    return KPIRecordResponse.model_validate(updated)

"""팀별 KPI 라우터 — /api/v1/team-kpis/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import team_kpi_not_found
from app.middleware.auth import get_current_active_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.team_kpi import (
    ExecutiveKPIResponse,
    TeamKPICreate,
    TeamKPIListResponse,
    TeamKPIResponse,
    TeamKPIUpdate,
)
from app.services import kpi_executive_service, team_kpi_service

router = APIRouter()


@router.get("/", response_model=TeamKPIListResponse)
async def list_team_kpis(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
    team: str | None = None,
    period: str | None = None,
    kpi_layer: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> TeamKPIListResponse:
    """팀별 KPI 목록"""
    items, total = await team_kpi_service.get_list(
        db, team=team, period=period, kpi_layer=kpi_layer, page=page, page_size=page_size,
    )
    return TeamKPIListResponse(
        data=[TeamKPIResponse.model_validate(k) for k in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/executive", response_model=ExecutiveKPIResponse)
async def executive_kpi(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
    period: str | None = None,
) -> ExecutiveKPIResponse:
    """전사 경영 KPI 대시보드"""
    if not period:
        from datetime import date
        today = date.today()
        period = f"{today.year}-{today.month:02d}"
    return await kpi_executive_service.get_executive_summary(db, period)


@router.get("/{team}/{period}", response_model=TeamKPIListResponse)
async def get_team_period_kpis(
    team: str,
    period: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> TeamKPIListResponse:
    """특정 팀·기간 KPI 전체"""
    items = await team_kpi_service.get_by_team_period(db, team, period)
    return TeamKPIListResponse(
        data=[TeamKPIResponse.model_validate(k) for k in items],
        total=len(items), page=1, page_size=len(items),
    )


@router.post("/", response_model=TeamKPIResponse, status_code=201)
async def create_team_kpi(
    data: TeamKPICreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> TeamKPIResponse:
    """KPI 값 입력"""
    kpi = await team_kpi_service.create(db, data, current_user)
    return TeamKPIResponse.model_validate(kpi)


@router.patch("/{kpi_id}", response_model=TeamKPIResponse)
async def update_team_kpi(
    kpi_id: uuid.UUID,
    data: TeamKPIUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> TeamKPIResponse:
    """KPI 값 수정"""
    kpi = await team_kpi_service.get_by_id(db, kpi_id)
    if kpi is None:
        raise team_kpi_not_found()
    updated = await team_kpi_service.update(db, kpi, data, current_user)
    return TeamKPIResponse.model_validate(updated)


@router.post("/seed")
async def seed_kpis(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    period: str | None = None,
) -> dict:
    """39개 KPI 시드 데이터 생성"""
    if not period:
        from datetime import date
        today = date.today()
        period = f"{today.year}-{today.month:02d}"
    count = await team_kpi_service.seed_kpis(db, period, current_user)
    return {"seeded": count, "period": period}

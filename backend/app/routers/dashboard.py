"""대시보드 라우터 — /api/v1/dashboard/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.schemas.dashboard import ExecutiveDashboardResponse, TimelineItem, TimelineResponse
from app.services import dashboard_service

router = APIRouter()


@router.get("/executive", response_model=ExecutiveDashboardResponse)
async def executive_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
) -> ExecutiveDashboardResponse:
    """통합 대시보드 (8대 KPI + 위기 감지)"""
    return await dashboard_service.get_executive_dashboard(db)


@router.get("/timeline/{startup_id}", response_model=TimelineResponse)
async def startup_timeline(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> TimelineResponse:
    """기업 타임라인 (ActivityLog)"""
    items, total = await dashboard_service.get_timeline(db, startup_id, page, page_size)
    return TimelineResponse(
        data=[TimelineItem(
            id=log.id,
            action_type=log.action_type,
            action_detail=log.action_detail,
            created_at=log.created_at.isoformat(),
        ) for log in items],
        total=total, page=page, page_size=page_size,
    )

"""인계 라우터 — /api/v1/handovers/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import handover_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.handover import HandoverResponse
from app.services import handover_service

router = APIRouter()


@router.get("/", response_model=list[HandoverResponse])
async def list_handovers(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
    from_team: str | None = None,
    to_team: str | None = None,
) -> list[HandoverResponse]:
    """인계 목록 조회 (from_team / to_team 필터)"""
    items = await handover_service.get_list(db, from_team=from_team, to_team=to_team)
    return [HandoverResponse.model_validate(h) for h in items]


@router.get("/{handover_id}", response_model=HandoverResponse)
async def get_handover(
    handover_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> HandoverResponse:
    """인계 상세 조회"""
    handover = await handover_service.get_by_id(db, handover_id)
    if handover is None:
        raise handover_not_found()
    return HandoverResponse.model_validate(handover)


@router.post("/{handover_id}/acknowledge", response_model=HandoverResponse)
async def acknowledge_handover(
    handover_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("review_dd_memo", "write"))],
) -> HandoverResponse:
    """인계 수신 확인 (심사팀)"""
    handover = await handover_service.get_by_id(db, handover_id)
    if handover is None:
        raise handover_not_found()
    updated = await handover_service.acknowledge(db, handover, current_user)
    return HandoverResponse.model_validate(updated)

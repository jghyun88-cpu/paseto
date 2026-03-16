"""딜플로우 라우터 — /api/v1/deal-flows/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import DealStage
from app.errors import startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.deal_flow import DealFlowMoveRequest, DealFlowResponse
from app.services import deal_flow_service, startup_service

router = APIRouter()


@router.get("/", response_model=list[DealFlowResponse])
async def list_deal_flows(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> list[DealFlowResponse]:
    """스타트업의 딜플로우 이력 조회"""
    items = await deal_flow_service.get_by_startup(db, startup_id)
    return [DealFlowResponse.model_validate(f) for f in items]


@router.post("/move", response_model=DealFlowResponse)
async def move_deal_stage(
    data: DealFlowMoveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "full"))],
) -> DealFlowResponse:
    """칸반 단계 이동 (드래그앤드롭)"""
    startup = await startup_service.get_by_id(db, data.startup_id)
    if startup is None:
        raise startup_not_found()
    deal_flow = await deal_flow_service.move_stage(
        db, startup, DealStage(data.to_stage), current_user, data.notes,
    )
    return DealFlowResponse.model_validate(deal_flow)

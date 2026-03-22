"""파트너 수요 라우터 — /api/v1/partner-demands/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import partner_demand_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.partner_demand import (
    PartnerDemandCreate,
    PartnerDemandListResponse,
    PartnerDemandResponse,
    PartnerDemandUpdate,
)
from app.services import partner_demand_service

router = APIRouter()


@router.get("/", response_model=PartnerDemandListResponse)
async def list_partner_demands(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
    demand_type: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PartnerDemandListResponse:
    """파트너 수요 목록"""
    items, total = await partner_demand_service.get_list(
        db, page=page, page_size=page_size, demand_type=demand_type, status=status, search=search,
    )
    return PartnerDemandListResponse(
        data=[PartnerDemandResponse.model_validate(d) for d in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{demand_id}", response_model=PartnerDemandResponse)
async def get_partner_demand(
    demand_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
) -> PartnerDemandResponse:
    demand = await partner_demand_service.get_by_id(db, demand_id)
    if demand is None:
        raise partner_demand_not_found()
    return PartnerDemandResponse.model_validate(demand)


@router.post("/", response_model=PartnerDemandResponse, status_code=201)
async def create_partner_demand(
    data: PartnerDemandCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> PartnerDemandResponse:
    """수요 등록 (OI-F01)"""
    demand = await partner_demand_service.create(db, data, current_user)
    return PartnerDemandResponse.model_validate(demand)


@router.patch("/{demand_id}", response_model=PartnerDemandResponse)
async def update_partner_demand(
    demand_id: uuid.UUID,
    data: PartnerDemandUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> PartnerDemandResponse:
    demand = await partner_demand_service.get_by_id(db, demand_id)
    if demand is None:
        raise partner_demand_not_found()
    updated = await partner_demand_service.update(db, demand, data, current_user)
    return PartnerDemandResponse.model_validate(updated)


@router.delete("/{demand_id}", status_code=204)
async def delete_partner_demand(
    demand_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> None:
    demand = await partner_demand_service.get_by_id(db, demand_id)
    if demand is None:
        raise partner_demand_not_found()
    await partner_demand_service.delete(db, demand, current_user)

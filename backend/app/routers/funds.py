"""조합 관리 라우터 — /api/v1/funds/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import fund_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.fund import FundCreate, FundResponse, FundUpdate
from app.schemas.fund_lp import (
    FundInvestmentCreate, FundInvestmentResponse,
    FundLPCreate, FundLPResponse,
)
from app.services import fund_lp_service, fund_service

router = APIRouter()


# --- All LPs (전체 LP 조회 — /{fund_id}보다 먼저 등록) ---

@router.get("/lps/all", response_model=list[FundLPResponse])
async def list_all_lps(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
    search: str | None = None,
) -> list[FundLPResponse]:
    items = await fund_lp_service.get_all_lps(db, search=search)
    return [FundLPResponse.model_validate(lp) for lp in items]


# --- Fund CRUD ---

@router.get("", response_model=list[FundResponse])
async def list_funds(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> list[FundResponse]:
    items = await fund_service.list_all(db)
    return [FundResponse.model_validate(f) for f in items]


@router.get("/{fund_id}", response_model=FundResponse)
async def get_fund(
    fund_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> FundResponse:
    fund = await fund_service.get_by_id(db, fund_id)
    if fund is None:
        raise fund_not_found()
    return FundResponse.model_validate(fund)


@router.post("", response_model=FundResponse, status_code=201)
async def create_fund(
    data: FundCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> FundResponse:
    fund = await fund_service.create(db, data, current_user)
    return FundResponse.model_validate(fund)


@router.patch("/{fund_id}", response_model=FundResponse)
async def update_fund(
    fund_id: uuid.UUID,
    data: FundUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> FundResponse:
    fund = await fund_service.get_by_id(db, fund_id)
    if fund is None:
        raise fund_not_found()
    updated = await fund_service.update(db, fund, data, current_user)
    return FundResponse.model_validate(updated)


@router.delete("/{fund_id}", status_code=204)
async def delete_fund(
    fund_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> None:
    fund = await fund_service.get_by_id(db, fund_id)
    if fund is None:
        raise fund_not_found()
    await fund_service.delete(db, fund, current_user)


# --- Fund LP ---

@router.get("/{fund_id}/lps", response_model=list[FundLPResponse])
async def list_fund_lps(
    fund_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> list[FundLPResponse]:
    items = await fund_lp_service.get_lps_by_fund(db, fund_id)
    return [FundLPResponse.model_validate(lp) for lp in items]


@router.post("/{fund_id}/lps", response_model=FundLPResponse, status_code=201)
async def create_fund_lp(
    fund_id: uuid.UUID,
    data: FundLPCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> FundLPResponse:
    fund = await fund_service.get_by_id(db, fund_id)
    if fund is None:
        raise fund_not_found()
    lp = await fund_lp_service.create_lp(db, fund, data, current_user)
    return FundLPResponse.model_validate(lp)


# --- Fund Investments ---

@router.get("/{fund_id}/investments", response_model=list[FundInvestmentResponse])
async def list_fund_investments(
    fund_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> list[FundInvestmentResponse]:
    items = await fund_lp_service.get_investments_by_fund(db, fund_id)
    return [FundInvestmentResponse.model_validate(inv) for inv in items]


@router.post("/{fund_id}/investments", response_model=FundInvestmentResponse, status_code=201)
async def create_fund_investment(
    fund_id: uuid.UUID,
    data: FundInvestmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> FundInvestmentResponse:
    fund = await fund_service.get_by_id(db, fund_id)
    if fund is None:
        raise fund_not_found()
    inv = await fund_lp_service.create_investment(db, fund, data, current_user)
    return FundInvestmentResponse.model_validate(inv)

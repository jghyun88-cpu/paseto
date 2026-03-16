"""투자 계약 라우터 — /api/v1/contracts/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractResponse, ContractUpdate
from app.services import contract_service, startup_service

router = APIRouter()


@router.get("/", response_model=list[ContractResponse])
async def list_contracts(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> list[ContractResponse]:
    items = await contract_service.get_by_startup(db, startup_id)
    return [ContractResponse.model_validate(c) for c in items]


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> ContractResponse:
    contract = await contract_service.get_by_id(db, contract_id)
    if contract is None:
        from app.errors import contract_not_found
        raise contract_not_found()
    return ContractResponse.model_validate(contract)


@router.post("/", response_model=ContractResponse, status_code=201)
async def create_contract(
    data: ContractCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> ContractResponse:
    startup = await startup_service.get_by_id(db, data.startup_id)
    if startup is None:
        raise startup_not_found()
    contract = await contract_service.create(db, startup, current_user, data)
    return ContractResponse.model_validate(contract)


@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: uuid.UUID,
    data: ContractUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("contract", "full"))],
) -> ContractResponse:
    contract = await contract_service.get_by_id(db, contract_id)
    if contract is None:
        from app.errors import contract_not_found
        raise contract_not_found()
    startup = await startup_service.get_by_id(db, contract.startup_id)
    if startup is None:
        raise startup_not_found()
    updated = await contract_service.update(db, contract, data, current_user, startup)
    return ContractResponse.model_validate(updated)

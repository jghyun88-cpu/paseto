"""IC 결정 라우터 — /api/v1/ic-decisions/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.ic_decision import ICDecisionCreate, ICDecisionResponse
from app.services import ic_decision_service, investment_memo_service, startup_service

router = APIRouter()


@router.get("/", response_model=list[ICDecisionResponse])
async def list_ic_decisions(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("ic_decision", "read"))],
) -> list[ICDecisionResponse]:
    items = await ic_decision_service.get_by_startup(db, startup_id)
    return [ICDecisionResponse.model_validate(d) for d in items]


@router.get("/{decision_id}", response_model=ICDecisionResponse)
async def get_ic_decision(
    decision_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("ic_decision", "read"))],
) -> ICDecisionResponse:
    decision = await ic_decision_service.get_by_id(db, decision_id)
    if decision is None:
        from app.errors import ic_decision_not_found
        raise ic_decision_not_found()
    return ICDecisionResponse.model_validate(decision)


@router.post("/", response_model=ICDecisionResponse, status_code=201)
async def create_ic_decision(
    data: ICDecisionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ic_decision", "write"))],
) -> ICDecisionResponse:
    startup = await startup_service.get_by_id(db, data.startup_id)
    if startup is None:
        raise startup_not_found()
    memo = await investment_memo_service.get_by_id(db, data.memo_id)
    if memo is None:
        from app.errors import memo_not_found
        raise memo_not_found()
    decision = await ic_decision_service.create(db, startup, memo, current_user, data)
    return ICDecisionResponse.model_validate(decision)

"""정부사업 라우터 — /api/v1/government-programs/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import government_program_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.government_program import (
    GovProgramCreate,
    GovProgramListResponse,
    GovProgramResponse,
    GovProgramUpdate,
)
from app.services import government_program_service

router = APIRouter()


@router.get("/", response_model=GovProgramListResponse)
async def list_government_programs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
    startup_id: uuid.UUID | None = None,
    program_type: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> GovProgramListResponse:
    items, total = await government_program_service.get_list(
        db, page=page, page_size=page_size, startup_id=startup_id,
        program_type=program_type, status=status,
    )
    return GovProgramListResponse(
        data=[GovProgramResponse.model_validate(g) for g in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{program_id}", response_model=GovProgramResponse)
async def get_government_program(
    program_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
) -> GovProgramResponse:
    program = await government_program_service.get_by_id(db, program_id)
    if program is None:
        raise government_program_not_found()
    return GovProgramResponse.model_validate(program)


@router.post("/", response_model=GovProgramResponse, status_code=201)
async def create_government_program(
    data: GovProgramCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> GovProgramResponse:
    program = await government_program_service.create(db, data, current_user)
    return GovProgramResponse.model_validate(program)


@router.put("/{program_id}", response_model=GovProgramResponse)
async def update_government_program(
    program_id: uuid.UUID,
    data: GovProgramUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> GovProgramResponse:
    program = await government_program_service.get_by_id(db, program_id)
    if program is None:
        raise government_program_not_found()
    updated = await government_program_service.update(db, program, data, current_user)
    return GovProgramResponse.model_validate(updated)


@router.delete("/{program_id}", status_code=204)
async def delete_government_program(
    program_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> None:
    program = await government_program_service.get_by_id(db, program_id)
    if program is None:
        raise government_program_not_found()
    await government_program_service.delete(db, program, current_user)

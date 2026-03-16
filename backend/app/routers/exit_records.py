"""회수 기록 라우터 — /api/v1/exit-records/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import exit_record_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.exit_record import (
    ExitRecordCreate,
    ExitRecordListResponse,
    ExitRecordResponse,
    ExitRecordUpdate,
)
from app.services import exit_service

router = APIRouter()


@router.get("/", response_model=ExitRecordListResponse)
async def list_exit_records(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
    startup_id: uuid.UUID | None = None,
    exit_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ExitRecordListResponse:
    items, total = await exit_service.get_list(
        db, page=page, page_size=page_size, startup_id=startup_id, exit_type=exit_type,
    )
    return ExitRecordListResponse(
        data=[ExitRecordResponse.model_validate(r) for r in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{exit_id}", response_model=ExitRecordResponse)
async def get_exit_record(
    exit_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("poc_matching", "read"))],
) -> ExitRecordResponse:
    record = await exit_service.get_by_id(db, exit_id)
    if record is None:
        raise exit_record_not_found()
    return ExitRecordResponse.model_validate(record)


@router.post("/", response_model=ExitRecordResponse, status_code=201)
async def create_exit_record(
    data: ExitRecordCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> ExitRecordResponse:
    record = await exit_service.create(db, data, current_user)
    return ExitRecordResponse.model_validate(record)


@router.put("/{exit_id}", response_model=ExitRecordResponse)
async def update_exit_record(
    exit_id: uuid.UUID,
    data: ExitRecordUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("poc_matching", "full"))],
) -> ExitRecordResponse:
    record = await exit_service.get_by_id(db, exit_id)
    if record is None:
        raise exit_record_not_found()
    updated = await exit_service.update(db, record, data, current_user)
    return ExitRecordResponse.model_validate(updated)

"""Cap Table 라우터 — /api/v1/cap-table/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.cap_table import CapTableCreate, CapTableResponse, CapTableUpdate
from app.services import cap_table_service

router = APIRouter()


@router.get("/", response_model=list[CapTableResponse])
async def list_cap_table(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("cap_table", "read"))],
) -> list[CapTableResponse]:
    items = await cap_table_service.get_by_startup(db, startup_id)
    return [CapTableResponse.model_validate(e) for e in items]


@router.post("/", response_model=CapTableResponse, status_code=201)
async def create_cap_table_entry(
    data: CapTableCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("cap_table", "full"))],
) -> CapTableResponse:
    entry = await cap_table_service.create(db, data, current_user)
    return CapTableResponse.model_validate(entry)


@router.patch("/{entry_id}", response_model=CapTableResponse)
async def update_cap_table_entry(
    entry_id: uuid.UUID,
    data: CapTableUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("cap_table", "full"))],
) -> CapTableResponse:
    entry = await cap_table_service.get_by_id(db, entry_id)
    if entry is None:
        from app.errors import cap_table_not_found
        raise cap_table_not_found()
    updated = await cap_table_service.update(db, entry, data, current_user)
    return CapTableResponse.model_validate(updated)

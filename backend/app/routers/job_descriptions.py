"""직무기술서 라우터 — /api/v1/jd/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.schemas.job_description import JDCreate, JDListResponse, JDResponse
from app.services import jd_service

router = APIRouter()

@router.get("/", response_model=JDListResponse)
async def list_jds(db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)],
                   page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> JDListResponse:
    items, total = await jd_service.get_list(db, page, page_size)
    return JDListResponse(data=[JDResponse.model_validate(j) for j in items], total=total, page=page, page_size=page_size)

@router.get("/{jd_id}", response_model=JDResponse)
async def get_jd(jd_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)]) -> JDResponse:
    jd = await jd_service.get_by_id(db, jd_id)
    if not jd:
        from app.errors import jd_not_found
        raise jd_not_found()
    return JDResponse.model_validate(jd)

@router.post("/", response_model=JDResponse, status_code=201)
async def create_jd(data: JDCreate, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> JDResponse:
    return JDResponse.model_validate(await jd_service.create(db, data, user))

@router.post("/seed")
async def seed_jds(db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> dict:
    return {"seeded": await jd_service.seed_jds(db, user)}

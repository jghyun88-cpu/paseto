"""SOP 템플릿 + 실행 라우터 — /api/v1/sop/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.schemas.sop import (SOPExecutionCreate, SOPExecutionListResponse, SOPExecutionResponse,
                              SOPStepUpdate, SOPTemplateCreate, SOPTemplateListResponse, SOPTemplateResponse)
from app.services import sop_service

router = APIRouter()

@router.get("/templates/", response_model=SOPTemplateListResponse)
async def list_templates(db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)],
                         page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> SOPTemplateListResponse:
    items, total = await sop_service.get_templates(db, page, page_size)
    return SOPTemplateListResponse(data=[SOPTemplateResponse.model_validate(t) for t in items], total=total, page=page, page_size=page_size)

@router.get("/templates/{template_id}", response_model=SOPTemplateResponse)
async def get_template(template_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)]) -> SOPTemplateResponse:
    tmpl = await sop_service.get_template_by_id(db, template_id)
    if not tmpl:
        from app.errors import sop_template_not_found
        raise sop_template_not_found()
    return SOPTemplateResponse.model_validate(tmpl)

@router.post("/templates/", response_model=SOPTemplateResponse, status_code=201)
async def create_template(data: SOPTemplateCreate, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> SOPTemplateResponse:
    return SOPTemplateResponse.model_validate(await sop_service.create_template(db, data, user))

@router.post("/templates/seed")
async def seed_templates(db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> dict:
    return {"seeded": await sop_service.seed_templates(db, user)}

@router.get("/executions/", response_model=SOPExecutionListResponse)
async def list_executions(db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)],
                          page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> SOPExecutionListResponse:
    items, total = await sop_service.get_executions(db, page, page_size)
    return SOPExecutionListResponse(data=[SOPExecutionResponse.model_validate(e) for e in items], total=total, page=page, page_size=page_size)

@router.get("/executions/{exec_id}", response_model=SOPExecutionResponse)
async def get_execution(exec_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)]) -> SOPExecutionResponse:
    exc = await sop_service.get_execution_by_id(db, exec_id)
    if not exc:
        from app.errors import sop_execution_not_found
        raise sop_execution_not_found()
    return SOPExecutionResponse.model_validate(exc)

@router.post("/executions/", response_model=SOPExecutionResponse, status_code=201)
async def start_execution(data: SOPExecutionCreate, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> SOPExecutionResponse:
    return SOPExecutionResponse.model_validate(await sop_service.start_execution(db, data, user))

@router.patch("/executions/{exec_id}/step", response_model=SOPExecutionResponse)
async def advance_step(exec_id: uuid.UUID, data: SOPStepUpdate, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> SOPExecutionResponse:
    exc = await sop_service.get_execution_by_id(db, exec_id)
    if not exc:
        from app.errors import sop_execution_not_found
        raise sop_execution_not_found()
    return SOPExecutionResponse.model_validate(await sop_service.advance_step(db, exc, data, user))

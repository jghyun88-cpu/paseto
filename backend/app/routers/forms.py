"""양식 라우터 — /api/v1/forms/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import form_template_not_found, form_submission_not_found
from app.middleware.auth import get_current_active_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.form import (FormSubmissionCreate, FormSubmissionListResponse, FormSubmissionResponse,
                               FormTemplateCreate, FormTemplateListResponse, FormTemplateResponse)
from app.services import form_service

router = APIRouter()

@router.get("/templates/", response_model=FormTemplateListResponse)
async def list_templates(db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)],
                         page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> FormTemplateListResponse:
    items, total = await form_service.get_templates(db, page, page_size)
    return FormTemplateListResponse(data=[FormTemplateResponse.model_validate(t) for t in items], total=total, page=page, page_size=page_size)

@router.get("/templates/by-code/{form_code}", response_model=FormTemplateResponse)
async def get_template_by_code(form_code: str, db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)]) -> FormTemplateResponse:
    tmpl = await form_service.get_template_by_code(db, form_code)
    if not tmpl:
        raise form_template_not_found()
    return FormTemplateResponse.model_validate(tmpl)

@router.get("/templates/{template_id}", response_model=FormTemplateResponse)
async def get_template(template_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)]) -> FormTemplateResponse:
    tmpl = await form_service.get_template_by_id(db, template_id)
    if not tmpl:
        raise form_template_not_found()
    return FormTemplateResponse.model_validate(tmpl)

@router.post("/templates/", response_model=FormTemplateResponse, status_code=201)
async def create_template(data: FormTemplateCreate, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(require_permission("compliance", "full"))]) -> FormTemplateResponse:
    """양식 템플릿 생성 (compliance full 권한 필요)"""
    return FormTemplateResponse.model_validate(await form_service.create_template(db, data, user))

@router.post("/templates/seed")
async def seed_templates(db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(require_permission("compliance", "full"))]) -> dict:
    return {"seeded": await form_service.seed_templates(db)}

@router.get("/submissions/", response_model=FormSubmissionListResponse)
async def list_submissions(db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)],
                           startup_id: uuid.UUID | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> FormSubmissionListResponse:
    items, total = await form_service.get_submissions(db, page, page_size, startup_id)
    return FormSubmissionListResponse(data=[FormSubmissionResponse.model_validate(s) for s in items], total=total, page=page, page_size=page_size)

@router.get("/submissions/{sub_id}", response_model=FormSubmissionResponse)
async def get_submission(sub_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], _user: Annotated[User, Depends(get_current_active_user)]) -> FormSubmissionResponse:
    sub = await form_service.get_submission_by_id(db, sub_id)
    if not sub:
        raise form_submission_not_found()
    return FormSubmissionResponse.model_validate(sub)

@router.post("/submissions/", response_model=FormSubmissionResponse, status_code=201)
async def submit_form(data: FormSubmissionCreate, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_active_user)]) -> FormSubmissionResponse:
    return FormSubmissionResponse.model_validate(await form_service.submit_form(db, data, user))

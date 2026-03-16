"""양식 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FormTemplateCreate(BaseModel):
    form_code: str
    title: str
    description: str | None = None
    owning_team: str
    fields: list[dict]


class FormTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    form_code: str
    title: str
    description: str | None
    owning_team: str
    fields: list
    version: str
    is_active: bool
    created_at: datetime


class FormTemplateListResponse(BaseModel):
    data: list[FormTemplateResponse]
    total: int
    page: int
    page_size: int


class FormSubmissionCreate(BaseModel):
    form_template_id: uuid.UUID
    startup_id: uuid.UUID | None = None
    data: dict


class FormSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    form_template_id: uuid.UUID
    startup_id: uuid.UUID | None
    submitted_by: uuid.UUID
    data: dict
    status: str
    submitted_at: datetime
    reviewed_by: uuid.UUID | None
    reviewed_at: datetime | None
    created_at: datetime


class FormSubmissionListResponse(BaseModel):
    data: list[FormSubmissionResponse]
    total: int
    page: int
    page_size: int

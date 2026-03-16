"""SOP 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SOPTemplateCreate(BaseModel):
    document_number: str
    title: str
    effective_date: date
    owning_team: str
    purpose: str
    scope: str
    steps: list[dict]
    required_forms: list[str] = []
    checkpoints: list[str] = []


class SOPTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    document_number: str
    title: str
    version: str
    effective_date: date
    owning_team: str
    purpose: str
    scope: str
    steps: list
    required_forms: list
    checkpoints: list
    is_active: bool
    created_at: datetime


class SOPTemplateListResponse(BaseModel):
    data: list[SOPTemplateResponse]
    total: int
    page: int
    page_size: int


class SOPExecutionCreate(BaseModel):
    sop_template_id: uuid.UUID
    startup_id: uuid.UUID | None = None
    notes: str | None = None


class SOPStepUpdate(BaseModel):
    step_number: int
    status: str  # pending / in_progress / completed


class SOPExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sop_template_id: uuid.UUID
    startup_id: uuid.UUID | None
    initiated_by: uuid.UUID
    current_step: int
    step_statuses: dict
    started_at: datetime
    completed_at: datetime | None
    notes: str | None
    created_at: datetime


class SOPExecutionListResponse(BaseModel):
    data: list[SOPExecutionResponse]
    total: int
    page: int
    page_size: int

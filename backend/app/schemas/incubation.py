"""보육 포트폴리오 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class IncubationCreate(BaseModel):
    startup_id: uuid.UUID
    assigned_pm_id: uuid.UUID
    program_start: date
    program_end: date
    batch_id: uuid.UUID | None = None
    growth_bottleneck: str | None = None
    diagnosis: dict | None = None
    initial_kpi_goals: list[str] | None = None


class IncubationUpdate(BaseModel):
    assigned_pm_id: uuid.UUID | None = None
    program_start: date | None = None
    program_end: date | None = None
    batch_id: uuid.UUID | None = None
    growth_bottleneck: str | None = None
    diagnosis: dict | None = None
    status: str | None = None
    crisis_flags: dict | None = None
    onboarding_checklist: dict | None = None
    ir_readiness: dict | None = None


class GradeChangeRequest(BaseModel):
    grade: str  # A / B / C / D
    reason: str


class ActionPlanItem(BaseModel):
    area: str  # product / customer / revenue / investment / org
    current_state: str
    target_state: str
    tasks: str
    owner: str
    deadline: date


class ActionPlanUpdate(BaseModel):
    items: list[ActionPlanItem]


class IncubationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    batch_id: uuid.UUID | None
    assigned_pm_id: uuid.UUID
    program_start: date
    program_end: date
    diagnosis: dict | None
    action_plan: dict | None
    growth_bottleneck: str | None
    portfolio_grade: str
    status: str
    crisis_flags: dict | None
    onboarding_checklist: dict | None
    ir_readiness: dict | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class IncubationListResponse(BaseModel):
    data: list[IncubationResponse]
    total: int
    page: int
    page_size: int

"""직무기술서 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JDCreate(BaseModel):
    jd_code: str
    title: str
    team: str
    reports_to: str
    purpose: str
    core_responsibilities: list[str]
    authority_scope: list[str] = []
    approval_required: list[str] = []


class JDResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    jd_code: str
    title: str
    team: str
    reports_to: str
    purpose: str
    core_responsibilities: list
    daily_tasks: list
    weekly_tasks: list
    monthly_tasks: list
    quarterly_annual_tasks: list | None
    collaboration_teams: list
    deliverables: list
    kpi_quantitative: list
    kpi_qualitative: list | None
    required_skills: dict
    preferred_qualifications: list
    authority_scope: list
    approval_required: list
    responsibility_scope: list
    version: str
    is_active: bool
    created_at: datetime


class JDListResponse(BaseModel):
    data: list[JDResponse]
    total: int
    page: int
    page_size: int

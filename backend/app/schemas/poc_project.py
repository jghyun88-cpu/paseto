"""PoC 프로젝트 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PoCProjectCreate(BaseModel):
    startup_id: uuid.UUID
    partner_demand_id: uuid.UUID
    project_name: str
    objective: str
    scope: str
    duration_weeks: int
    validation_metrics: list[str]
    success_criteria: str
    cost_structure: str | None = None
    data_scope: str | None = None
    next_step_if_success: str | None = None
    participants: dict | None = None
    role_division: str | None = None
    provided_resources: str | None = None
    key_risks: list[str] | None = None


class PoCProjectUpdate(BaseModel):
    project_name: str | None = None
    objective: str | None = None
    scope: str | None = None
    duration_weeks: int | None = None
    validation_metrics: list[str] | None = None
    success_criteria: str | None = None
    cost_structure: str | None = None
    data_scope: str | None = None
    next_step_if_success: str | None = None
    participants: dict | None = None
    role_division: str | None = None
    provided_resources: str | None = None
    key_risks: list[str] | None = None
    kickoff_date: date | None = None
    completion_date: date | None = None


class PoCStatusChange(BaseModel):
    status: str
    notes: str | None = None


class PoCProgressUpdate(BaseModel):
    weekly_issues: str | None = None
    support_needed: str | None = None
    partner_feedback: str | None = None
    startup_feedback: str | None = None
    conversion_likelihood: str | None = None
    result_summary: str | None = None


class PoCProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    partner_demand_id: uuid.UUID
    project_name: str
    objective: str
    scope: str
    duration_weeks: int
    validation_metrics: list
    cost_structure: str | None
    data_scope: str | None
    success_criteria: str
    next_step_if_success: str | None
    participants: dict | None
    role_division: str | None
    provided_resources: str | None
    key_risks: list | None
    status: str
    kickoff_date: date | None
    completion_date: date | None
    weekly_issues: str | None
    support_needed: str | None
    partner_feedback: str | None
    startup_feedback: str | None
    conversion_likelihood: str | None
    result_summary: str | None
    created_at: datetime
    updated_at: datetime


class PoCProjectListResponse(BaseModel):
    data: list[PoCProjectResponse]
    total: int
    page: int
    page_size: int

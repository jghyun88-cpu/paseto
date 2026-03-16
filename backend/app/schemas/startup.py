"""스타트업 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class StartupCreate(BaseModel):
    """스타트업 생성 요청 — SRC-F01 양식 기반"""
    company_name: str
    ceo_name: str
    industry: str
    stage: str
    one_liner: str
    sourcing_channel: str
    corporate_number: str | None = None
    problem_definition: str | None = None
    solution_description: str | None = None
    team_size: int | None = None
    is_fulltime: bool = False
    referrer: str | None = None
    founded_date: date | None = None
    location: str | None = None
    main_customer: str | None = None
    current_traction: str | None = None
    current_revenue: int | None = None
    current_employees: int | None = None
    first_meeting_date: date | None = None
    batch_id: uuid.UUID | None = None


class StartupUpdate(BaseModel):
    """스타트업 수정 요청 — 부분 수정"""
    company_name: str | None = None
    ceo_name: str | None = None
    industry: str | None = None
    stage: str | None = None
    one_liner: str | None = None
    sourcing_channel: str | None = None
    corporate_number: str | None = None
    problem_definition: str | None = None
    solution_description: str | None = None
    team_size: int | None = None
    is_fulltime: bool | None = None
    referrer: str | None = None
    founded_date: date | None = None
    location: str | None = None
    main_customer: str | None = None
    current_traction: str | None = None
    current_revenue: int | None = None
    current_employees: int | None = None
    first_meeting_date: date | None = None
    batch_id: uuid.UUID | None = None
    assigned_manager_id: uuid.UUID | None = None


class StartupResponse(BaseModel):
    """스타트업 응답"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_name: str
    corporate_number: str | None
    ceo_name: str
    industry: str
    stage: str
    one_liner: str
    problem_definition: str | None
    solution_description: str | None
    team_size: int | None
    is_fulltime: bool
    sourcing_channel: str
    referrer: str | None
    current_deal_stage: str
    portfolio_grade: str | None
    is_portfolio: bool
    founded_date: date | None
    location: str | None
    main_customer: str | None
    current_traction: str | None
    current_revenue: int | None
    current_employees: int | None
    first_meeting_date: date | None
    batch_id: uuid.UUID | None
    assigned_manager_id: uuid.UUID | None
    invested_at: datetime | None
    created_at: datetime
    updated_at: datetime


class StartupListResponse(BaseModel):
    """스타트업 목록 페이지네이션 응답"""
    data: list[StartupResponse]
    total: int
    page: int
    page_size: int

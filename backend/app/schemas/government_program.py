"""정부사업 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class GovProgramCreate(BaseModel):
    startup_id: uuid.UUID
    program_type: str
    program_name: str
    managing_agency: str
    applied_at: date | None = None
    amount: int | None = None
    period_start: date | None = None
    period_end: date | None = None
    our_role: str | None = None
    notes: str | None = None


class GovProgramUpdate(BaseModel):
    program_type: str | None = None
    program_name: str | None = None
    managing_agency: str | None = None
    applied_at: date | None = None
    status: str | None = None
    amount: int | None = None
    period_start: date | None = None
    period_end: date | None = None
    our_role: str | None = None
    notes: str | None = None


class GovProgramResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    program_type: str
    program_name: str
    managing_agency: str
    applied_at: date | None
    status: str
    amount: int | None
    period_start: date | None
    period_end: date | None
    our_role: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class GovProgramListResponse(BaseModel):
    data: list[GovProgramResponse]
    total: int
    page: int
    page_size: int

"""데모데이 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DemoDayCreate(BaseModel):
    title: str
    event_date: date
    batch_id: uuid.UUID | None = None
    follow_up_weeks: int = 8


class DemoDayUpdate(BaseModel):
    title: str | None = None
    event_date: date | None = None
    batch_id: uuid.UUID | None = None
    status: str | None = None
    invited_investors: list | None = None
    startup_readiness: dict | None = None
    follow_up_deadline: date | None = None


class DemoDayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    batch_id: uuid.UUID | None
    title: str
    event_date: date
    invited_investors: list | None
    startup_readiness: dict | None
    status: str
    follow_up_deadline: date | None
    created_at: datetime
    updated_at: datetime


class DemoDayListResponse(BaseModel):
    data: list[DemoDayResponse]
    total: int
    page: int
    page_size: int

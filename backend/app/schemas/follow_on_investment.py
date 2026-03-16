"""후속투자 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FollowOnCreate(BaseModel):
    startup_id: uuid.UUID
    round_type: str
    target_amount: int | None = None
    investor_map: dict | None = None
    lead_investor: str | None = None
    co_investors: list[str] | None = None


class FollowOnUpdate(BaseModel):
    round_type: str | None = None
    target_amount: int | None = None
    investor_map: dict | None = None
    matching_criteria: dict | None = None
    lead_investor: str | None = None
    co_investors: list[str] | None = None
    status: str | None = None
    ir_meetings_count: int | None = None
    closed_at: date | None = None


class FollowOnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    round_type: str
    target_amount: int | None
    investor_map: dict | None
    matching_criteria: dict | None
    lead_investor: str | None
    co_investors: list | None
    status: str
    ir_meetings_count: int
    closed_at: date | None
    created_at: datetime
    updated_at: datetime


class FollowOnListResponse(BaseModel):
    data: list[FollowOnResponse]
    total: int
    page: int
    page_size: int

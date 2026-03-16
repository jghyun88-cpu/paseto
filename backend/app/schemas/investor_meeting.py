"""투자자 미팅 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class InvestorMeetingCreate(BaseModel):
    startup_id: uuid.UUID
    demo_day_id: uuid.UUID | None = None
    investor_name: str
    investor_company: str
    investor_type: str  # angel / seed_vc / pre_a_vc / cvc / strategic / overseas
    meeting_date: date
    meeting_type: str  # onsite_consult / follow_up / ir_meeting / termsheet
    outcome: str | None = None
    materials_sent: list[str] | None = None
    next_step: str | None = None
    notes: str | None = None


class InvestorMeetingUpdate(BaseModel):
    investor_name: str | None = None
    investor_company: str | None = None
    investor_type: str | None = None
    meeting_date: date | None = None
    meeting_type: str | None = None
    outcome: str | None = None
    materials_sent: list[str] | None = None
    next_step: str | None = None
    notes: str | None = None


class InvestorMeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    demo_day_id: uuid.UUID | None
    investor_name: str
    investor_company: str
    investor_type: str
    meeting_date: date
    meeting_type: str
    outcome: str | None
    materials_sent: list | None
    next_step: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class InvestorMeetingListResponse(BaseModel):
    data: list[InvestorMeetingResponse]
    total: int
    page: int
    page_size: int

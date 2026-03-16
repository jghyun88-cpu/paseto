"""회의 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MeetingCreate(BaseModel):
    meeting_type: str
    title: str
    scheduled_at: datetime
    duration_minutes: int | None = None
    attendees: list[dict] = []
    agenda_items: list[dict] = []
    related_startup_ids: list[str] | None = None


class MeetingUpdate(BaseModel):
    title: str | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    attendees: list[dict] | None = None
    agenda_items: list[dict] | None = None
    minutes: str | None = None
    action_items: list[dict] | None = None
    related_startup_ids: list[str] | None = None


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_type: str
    title: str
    scheduled_at: datetime
    duration_minutes: int | None
    attendees: list
    agenda_items: list
    minutes: str | None
    action_items: list | None
    related_startup_ids: list | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class MeetingListResponse(BaseModel):
    data: list[MeetingResponse]
    total: int
    page: int
    page_size: int

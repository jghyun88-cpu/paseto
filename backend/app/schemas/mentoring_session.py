"""멘토링 세션 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ActionItem(BaseModel):
    task: str
    owner: str
    deadline: date
    status: str = "pending"  # pending / in_progress / completed


class MentoringSessionCreate(BaseModel):
    startup_id: uuid.UUID
    mentor_id: uuid.UUID | None = None
    mentor_name: str
    mentor_type: str  # dedicated / functional / industry / investment / customer_dev
    session_date: datetime
    pre_agenda: str | None = None
    discussion_summary: str
    feedback: str | None = None
    action_items: list[ActionItem] = []
    next_session_date: date | None = None


class MentoringSessionUpdate(BaseModel):
    mentor_name: str | None = None
    mentor_type: str | None = None
    session_date: datetime | None = None
    pre_agenda: str | None = None
    discussion_summary: str | None = None
    feedback: str | None = None
    action_items: list[ActionItem] | None = None
    next_session_date: date | None = None
    improvement_notes: str | None = None


class ActionItemStatusUpdate(BaseModel):
    index: int
    status: str  # pending / in_progress / completed


class ActionItemsBatchUpdate(BaseModel):
    items: list[ActionItemStatusUpdate]


class MentoringSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    mentor_id: uuid.UUID | None
    mentor_name: str
    mentor_type: str
    session_date: datetime
    pre_agenda: str | None
    discussion_summary: str
    feedback: str | None
    action_items: list
    next_session_date: date | None
    action_completion_rate: float | None
    improvement_notes: str | None
    pm_confirmed_by: uuid.UUID | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class MentoringSessionListResponse(BaseModel):
    data: list[MentoringSessionResponse]
    total: int
    page: int
    page_size: int

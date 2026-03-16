"""IC 결정 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ICDecisionCreate(BaseModel):
    startup_id: uuid.UUID
    memo_id: uuid.UUID
    decision: str  # ICDecisionType 값
    conditions: str | None = None
    monitoring_points: str | None = None
    attendees: list = []
    contract_assignee_id: uuid.UUID | None = None
    program_assignee_id: uuid.UUID | None = None
    notes: str | None = None


class ICDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    memo_id: uuid.UUID
    decision: str
    conditions: str | None
    monitoring_points: str | None
    attendees: list
    contract_assignee_id: uuid.UUID | None
    program_assignee_id: uuid.UUID | None
    decided_at: datetime
    notes: str | None

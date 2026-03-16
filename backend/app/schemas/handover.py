"""인계 문서 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HandoverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    from_team: str
    to_team: str
    handover_type: str
    content: dict
    created_by: uuid.UUID
    created_at: datetime
    acknowledged_by: uuid.UUID | None
    acknowledged_at: datetime | None
    escalated: bool
    escalated_at: datetime | None

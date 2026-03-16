"""딜플로우 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DealFlowMoveRequest(BaseModel):
    startup_id: uuid.UUID
    to_stage: str
    notes: str | None = None


class DealFlowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    stage: str
    moved_at: datetime
    moved_by: uuid.UUID
    notes: str | None

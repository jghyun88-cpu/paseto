"""포트폴리오 이슈 Pydantic 스키마"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ISSUE_TYPES = Literal[
    "cash_runway", "key_person", "customer_churn",
    "dev_delay", "legal", "regulatory", "other",
]
SEVERITY_LEVELS = Literal["low", "medium", "high", "critical"]


class PortfolioIssueCreate(BaseModel):
    startup_id: uuid.UUID
    issue_type: ISSUE_TYPES
    severity: SEVERITY_LEVELS = "medium"
    description: str
    detected_by: str = "ai-agent"


class PortfolioIssueUpdate(BaseModel):
    resolved: bool | None = None
    resolution_note: str | None = None
    severity: SEVERITY_LEVELS | None = None


class PortfolioIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    issue_type: str
    severity: str
    description: str
    detected_by: str
    resolved: bool
    resolution_note: str | None
    created_at: datetime
    updated_at: datetime

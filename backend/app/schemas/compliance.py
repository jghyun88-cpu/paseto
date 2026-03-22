"""컴플라이언스 체크리스트 Pydantic 스키마"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ComplianceChecklistUpdate(BaseModel):
    """체크리스트 저장/수정 요청"""
    items: list[dict[str, Any]]
    checklist_type: str = "default"


class ComplianceChecklistResponse(BaseModel):
    """체크리스트 응답"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    checklist_type: str
    items: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

"""스크리닝 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScreeningCreate(BaseModel):
    startup_id: uuid.UUID
    fulltime_commitment: int = Field(ge=1, le=5)
    problem_clarity: int = Field(ge=1, le=5)
    tech_differentiation: int = Field(ge=1, le=5)
    market_potential: int = Field(ge=1, le=5)
    initial_validation: int = Field(ge=1, le=5)
    legal_clear: bool
    strategy_fit: int = Field(ge=1, le=5)
    risk_notes: str | None = None
    handover_memo: str | None = None
    handover_to_review: bool = False


class ScreeningResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    screener_id: uuid.UUID
    fulltime_commitment: int
    problem_clarity: int
    tech_differentiation: int
    market_potential: int
    initial_validation: int
    legal_clear: bool
    strategy_fit: int
    overall_score: float
    recommendation: str
    risk_notes: str | None
    handover_memo: str | None
    created_at: datetime

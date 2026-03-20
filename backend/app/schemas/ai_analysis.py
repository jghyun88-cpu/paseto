"""AI 분석 Pydantic 스키마"""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ANALYSIS_TYPES = Literal[
    "screening", "ir_analysis", "risk_alert",
    "market_scan", "investment_memo", "portfolio_report",
]
RISK_LEVELS = Literal["low", "medium", "high", "critical"]
RECOMMENDATIONS = Literal["pass", "conditional", "hold", "decline"]


class AIAnalysisCreate(BaseModel):
    startup_id: uuid.UUID
    analysis_type: ANALYSIS_TYPES
    scores: dict[str, Any] | None = None
    summary: str
    report_path: str | None = None
    risk_level: RISK_LEVELS | None = None
    recommendation: RECOMMENDATIONS | None = None
    investment_attractiveness: int | None = Field(None, ge=1, le=5)


class AIAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    analysis_type: str
    scores: dict[str, Any] | None
    summary: str
    report_path: str | None
    risk_level: str | None
    recommendation: str | None
    investment_attractiveness: int | None
    created_at: datetime
    updated_at: datetime

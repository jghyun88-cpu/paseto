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
SOURCES = Literal["lsa_report", "claude_evaluation", "legacy_self_analysis"]


class AIAnalysisCreate(BaseModel):
    startup_id: uuid.UUID
    analysis_type: ANALYSIS_TYPES
    scores: dict[str, Any] | None = None
    summary: str
    report_path: str | None = None
    risk_level: RISK_LEVELS | None = None
    recommendation: RECOMMENDATIONS | None = None
    investment_attractiveness: int | None = Field(None, ge=1, le=5)
    source: SOURCES = "lsa_report"


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
    source: str
    created_at: datetime
    updated_at: datetime


# --- AI 평가 전용 스키마 ---

class EvaluationScoreItem(BaseModel):
    """단일 평가 항목 점수"""
    score: float = Field(ge=0)
    max: float = Field(gt=0)
    rationale: str = ""


class EvaluationScores(BaseModel):
    """전체 평가 점수 구조 (쓰기+읽기 검증 공용)"""
    items: dict[str, EvaluationScoreItem] = Field(default_factory=dict)
    total: float | None = None
    is_deeptech: bool = False


class EvaluationUploadResponse(BaseModel):
    """POST /ai-evaluation/upload 응답 — 하이브리드 분기"""
    evaluation_id: uuid.UUID
    status: Literal["completed", "pending"]
    # 동기(직접 파싱) 성공 시 채워짐
    scores: EvaluationScores | None = None
    recommendation: str | None = None
    summary: str | None = None


class EvaluationStatusResponse(BaseModel):
    """GET /ai-evaluation/{id}/status 응답"""
    evaluation_id: uuid.UUID
    status: Literal["pending", "completed", "error"]
    scores: EvaluationScores | None = None
    recommendation: str | None = None
    summary: str | None = None


class EvaluationScoresResponse(BaseModel):
    """DB 읽기 시 scores JSON 검증"""
    items: dict[str, EvaluationScoreItem] = Field(default_factory=dict)
    total: float | None = None
    is_deeptech: bool = False

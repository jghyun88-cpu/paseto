"""인계 문서 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# --- 경로별 Content 모델 ---

class SourcingToReviewContent(BaseModel):
    """sourcing_to_review — 스크리닝 Pass 시 자동 생성"""
    screening_results: dict = {}
    company_overview: dict = {}
    handover_memo: str | None = None
    key_risks: list[str] = []


class ReviewToBackofficeContent(BaseModel):
    """review_to_backoffice — IC 승인 시 전달"""
    ic_decision: str
    investment_terms: dict = {}
    preconditions: list[str] = []
    legal_memo: str | None = None
    company_overview: dict = {}


class ReviewToIncubationContent(BaseModel):
    """review_to_incubation — 계약 체결 시 전달"""
    investment_memo_summary: str = ""
    growth_bottlenecks: list[str] = []
    six_month_priorities: list[str] = []
    risk_signals: list[str] = []
    company_overview: dict = {}


class IncubationToOiContent(BaseModel):
    """incubation_to_oi — PoC 매칭 요청 시 전달"""
    tech_product_status: str = ""
    poc_areas: list[str] = []
    matching_priorities: list[str] = []
    available_resources: str = ""
    company_overview: dict = {}


class OiToReviewContent(BaseModel):
    """oi_to_review — 후속투자 추천 시 전달"""
    strategic_investment_potential: str = ""
    customer_feedback: str = ""
    pilot_results: str = ""
    follow_on_points: list[str] = []
    company_overview: dict = {}


class BackofficeBroadcastContent(BaseModel):
    """backoffice_broadcast — 전 조직 브로드캐스트"""
    contract_status: str = ""
    report_deadline: str | None = None
    risk_alert: str | None = None
    document_updates: list[str] = []
    company_overview: dict = {}


# --- 수동 생성 요청 ---

VALID_HANDOVER_TYPES = {
    "sourcing_to_review",
    "review_to_backoffice",
    "review_to_incubation",
    "incubation_to_oi",
    "oi_to_review",
    "backoffice_broadcast",
}

# 경로별 Content Pydantic 모델 매핑 (수동 생성 시 검증용)
CONTENT_MODEL_MAP: dict[str, type[BaseModel]] = {
    "sourcing_to_review": SourcingToReviewContent,
    "review_to_backoffice": ReviewToBackofficeContent,
    "review_to_incubation": ReviewToIncubationContent,
    "incubation_to_oi": IncubationToOiContent,
    "oi_to_review": OiToReviewContent,
    "backoffice_broadcast": BackofficeBroadcastContent,
}


class ManualHandoverCreate(BaseModel):
    """수동 인계 생성 요청"""
    startup_id: uuid.UUID
    handover_type: str
    content: dict = {}
    memo: str | None = None


# --- 통계 응답 ---

class HandoverTypeStats(BaseModel):
    total: int = 0
    acknowledged: int = 0
    pending: int = 0
    escalated: int = 0


class HandoverStatsResponse(BaseModel):
    by_type: dict[str, HandoverTypeStats] = {}
    avg_acknowledge_hours: float | None = None
    escalation_rate: float = 0.0


# --- 응답 ---

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
    updated_at: datetime
    acknowledged_by: uuid.UUID | None
    acknowledged_at: datetime | None
    escalated: bool
    escalated_at: datetime | None


class HandoverListResponse(BaseModel):
    data: list[HandoverResponse]
    total: int
    page: int
    page_size: int

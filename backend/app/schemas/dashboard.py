"""대시보드 관련 Pydantic 스키마"""

import uuid

from pydantic import BaseModel

from app.schemas.handover import HandoverResponse
from app.schemas.meeting import MeetingResponse


class DealPipelineMetrics(BaseModel):
    total: int
    in_screening: int
    in_contract: int
    portfolio: int


class PortfolioMetrics(BaseModel):
    total_startups: int
    grade_a_ratio: float
    follow_on_rate: float


class CrisisAlert(BaseModel):
    startup_id: uuid.UUID
    company_name: str
    crisis_type: str
    severity: str


class ExecutiveDashboardResponse(BaseModel):
    deal_pipeline: DealPipelineMetrics
    portfolio_metrics: PortfolioMetrics
    crisis_alerts: list[CrisisAlert]
    unacknowledged_handovers: int
    upcoming_meetings: list[MeetingResponse]
    recent_handovers: list[HandoverResponse]


class TimelineItem(BaseModel):
    id: uuid.UUID
    action_type: str
    action_detail: dict
    created_at: str


class TimelineResponse(BaseModel):
    data: list[TimelineItem]
    total: int
    page: int
    page_size: int

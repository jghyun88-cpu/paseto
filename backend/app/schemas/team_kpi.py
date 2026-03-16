"""팀별 KPI 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TeamKPICreate(BaseModel):
    team: str
    period: str
    kpi_layer: str
    kpi_name: str
    kpi_definition: str
    target_value: float
    actual_value: float | None = None
    notes: str | None = None


class TeamKPIUpdate(BaseModel):
    actual_value: float | None = None
    target_value: float | None = None
    notes: str | None = None


class TeamKPIResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team: str
    period: str
    kpi_layer: str
    kpi_name: str
    kpi_definition: str
    target_value: float
    actual_value: float | None
    achievement_rate: float | None
    mom_change: str | None
    notes: str | None
    updated_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class TeamKPIListResponse(BaseModel):
    data: list[TeamKPIResponse]
    total: int
    page: int
    page_size: int


class KPIHighlight(BaseModel):
    kpi_name: str
    kpi_layer: str
    target_value: float
    actual_value: float | None
    achievement_rate: float | None
    status: str  # 양호 / 보완필요 / 개선필요


class TeamSummary(BaseModel):
    team: str
    total_kpis: int
    achieved: int
    needs_improvement: int
    highlight_kpis: list[KPIHighlight]


class ExecutiveKPIResponse(BaseModel):
    period: str
    teams: dict[str, TeamSummary]
    overall_health: str  # 양호 / 보완필요 / 개선필요

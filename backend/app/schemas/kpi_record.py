"""KPI 기록 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class KPIRecordCreate(BaseModel):
    startup_id: uuid.UUID
    period: str  # "2026-03" (YYYY-MM)
    revenue: int | None = None
    customer_count: int | None = None
    runway_months: float | None = None
    poc_count: int | None = None
    follow_on_meetings: int | None = None
    active_users: int | None = None
    repurchase_rate: float | None = None
    release_velocity: str | None = None
    cac: int | None = None
    ltv: int | None = None
    pilot_conversion_rate: float | None = None
    mou_to_contract_rate: float | None = None
    headcount: int | None = None
    notes: str | None = None


class KPIRecordUpdate(BaseModel):
    revenue: int | None = None
    customer_count: int | None = None
    runway_months: float | None = None
    poc_count: int | None = None
    follow_on_meetings: int | None = None
    active_users: int | None = None
    repurchase_rate: float | None = None
    release_velocity: str | None = None
    cac: int | None = None
    ltv: int | None = None
    pilot_conversion_rate: float | None = None
    mou_to_contract_rate: float | None = None
    headcount: int | None = None
    notes: str | None = None


class KPIRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    period: str
    period_type: str
    revenue: int | None
    customer_count: int | None
    active_users: int | None
    poc_count: int | None
    repurchase_rate: float | None
    release_velocity: str | None
    cac: int | None
    ltv: int | None
    pilot_conversion_rate: float | None
    mou_to_contract_rate: float | None
    headcount: int | None
    runway_months: float | None
    follow_on_meetings: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class KPIRecordListResponse(BaseModel):
    data: list[KPIRecordResponse]
    total: int
    page: int
    page_size: int


class KPIWarning(BaseModel):
    metric: str
    message: str
    severity: str  # warning / critical


class KPITrendResponse(BaseModel):
    startup_id: uuid.UUID
    periods: list[str]
    revenue: list[int | None]
    customer_count: list[int | None]
    runway_months: list[float | None]
    warnings: list[KPIWarning]

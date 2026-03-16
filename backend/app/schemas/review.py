"""심사 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    startup_id: uuid.UUID
    review_type: str  # document / interview / dd

    # 서류심사 5축
    team_score: int | None = Field(None, ge=1, le=5)
    problem_score: int | None = Field(None, ge=1, le=5)
    solution_score: int | None = Field(None, ge=1, le=5)
    market_score: int | None = Field(None, ge=1, le=5)
    traction_score: int | None = Field(None, ge=1, le=5)

    # 인터뷰 8축
    number_literacy: int | None = Field(None, ge=1, le=5)
    customer_experience: int | None = Field(None, ge=1, le=5)
    tech_moat: int | None = Field(None, ge=1, le=5)
    execution_plan: int | None = Field(None, ge=1, le=5)
    feedback_absorption: int | None = Field(None, ge=1, le=5)
    cofounder_stability: int | None = Field(None, ge=1, le=5)

    # DD
    dd_checklist: dict | None = None
    risk_log: str | None = None
    overall_verdict: str  # proceed / concern / reject

    # 딥테크
    tech_type: str | None = None
    scalability_score: int | None = Field(None, ge=1, le=5)
    process_compatibility: int | None = Field(None, ge=1, le=5)
    sample_test_status: str | None = None
    certification_stage: str | None = None
    purchase_lead_time_months: int | None = None


class ReviewUpdate(BaseModel):
    dd_checklist: dict | None = None
    risk_log: str | None = None
    overall_verdict: str | None = None
    completed_at: datetime | None = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    reviewer_id: uuid.UUID
    review_type: str
    team_score: int | None
    problem_score: int | None
    solution_score: int | None
    market_score: int | None
    traction_score: int | None
    number_literacy: int | None
    customer_experience: int | None
    tech_moat: int | None
    execution_plan: int | None
    feedback_absorption: int | None
    cofounder_stability: int | None
    dd_checklist: dict | None
    risk_log: str | None
    overall_verdict: str
    tech_type: str | None
    scalability_score: int | None
    process_compatibility: int | None
    sample_test_status: str | None
    certification_stage: str | None
    purchase_lead_time_months: int | None
    started_at: datetime
    completed_at: datetime | None

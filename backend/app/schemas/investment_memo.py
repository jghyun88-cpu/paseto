"""투자메모 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MemoCreate(BaseModel):
    startup_id: uuid.UUID
    overview: str
    team_assessment: str
    market_assessment: str
    tech_product_assessment: str
    traction: str
    risks: str
    value_add_points: str
    proposed_terms: dict = {}
    post_investment_plan: str


class MemoUpdate(BaseModel):
    overview: str | None = None
    team_assessment: str | None = None
    market_assessment: str | None = None
    tech_product_assessment: str | None = None
    traction: str | None = None
    risks: str | None = None
    value_add_points: str | None = None
    proposed_terms: dict | None = None
    post_investment_plan: str | None = None
    status: str | None = None  # draft / submitted / ic_ready


class MemoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    author_id: uuid.UUID
    version: int
    overview: str
    team_assessment: str
    market_assessment: str
    tech_product_assessment: str
    traction: str
    risks: str
    value_add_points: str
    proposed_terms: dict
    post_investment_plan: str
    status: str
    created_at: datetime
    updated_at: datetime

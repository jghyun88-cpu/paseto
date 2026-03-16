"""파트너 수요 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PartnerDemandCreate(BaseModel):
    partner_company: str
    contact_name: str | None = None
    department: str | None = None
    demand_type: str
    description: str
    tech_requirements: str | None = None
    timeline: str | None = None
    budget_range: str | None = None
    nda_required: bool = False
    candidate_startups: list[dict] | None = None


class PartnerDemandUpdate(BaseModel):
    partner_company: str | None = None
    contact_name: str | None = None
    department: str | None = None
    demand_type: str | None = None
    description: str | None = None
    tech_requirements: str | None = None
    timeline: str | None = None
    budget_range: str | None = None
    nda_required: bool | None = None
    candidate_startups: list[dict] | None = None
    status: str | None = None


class PartnerDemandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    partner_company: str
    contact_name: str | None
    department: str | None
    demand_type: str
    description: str
    tech_requirements: str | None
    timeline: str | None
    budget_range: str | None
    nda_required: bool
    candidate_startups: list | None
    status: str
    created_at: datetime
    updated_at: datetime


class PartnerDemandListResponse(BaseModel):
    data: list[PartnerDemandResponse]
    total: int
    page: int
    page_size: int

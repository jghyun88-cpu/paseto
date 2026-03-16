"""멘토 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MentorCreate(BaseModel):
    name: str
    company: str | None = None
    title: str | None = None
    mentor_type: str  # dedicated / functional / industry / investment / customer_dev
    expertise_areas: list[str] = []
    industry_tags: list[str] | None = None
    functional_area: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    availability: str | None = None
    notes: str | None = None


class MentorUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    title: str | None = None
    mentor_type: str | None = None
    expertise_areas: list[str] | None = None
    industry_tags: list[str] | None = None
    functional_area: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    availability: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class MentorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    company: str | None
    title: str | None
    mentor_type: str
    expertise_areas: list
    industry_tags: list | None
    functional_area: str | None
    contact_email: str | None
    contact_phone: str | None
    availability: str | None
    engagement_count: int
    avg_satisfaction: float | None
    is_active: bool
    notes: str | None
    created_at: datetime


class MentorListResponse(BaseModel):
    data: list[MentorResponse]
    total: int
    page: int
    page_size: int

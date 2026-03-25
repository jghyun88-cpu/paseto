"""LP(출자자) Pydantic 스키마 — 스타트업과 동일 구조"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class LPCreate(BaseModel):
    # 기본정보
    lp_name: str
    corporate_number: str | None = None
    business_registration_number: str | None = None
    ceo_name: str | None = None
    founded_date: date | None = None
    current_employees: int | None = None
    location: str | None = None
    # 사업정보
    industry: str | None = None
    ksic_code: str | None = None
    main_product: str | None = None
    stock_market: str | None = None
    listing_date: date | None = None
    # 재무정보
    total_assets: int | None = None
    capital: int | None = None
    current_revenue: int | None = None
    operating_profit: int | None = None
    # 연구개발
    has_research_lab: bool | None = None
    research_staff_count: int | None = None
    # 연락처
    city: str | None = None
    website: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    # 기타
    notes: str | None = None


class LPUpdate(BaseModel):
    lp_name: str | None = None
    corporate_number: str | None = None
    business_registration_number: str | None = None
    ceo_name: str | None = None
    founded_date: date | None = None
    current_employees: int | None = None
    location: str | None = None
    industry: str | None = None
    ksic_code: str | None = None
    main_product: str | None = None
    stock_market: str | None = None
    listing_date: date | None = None
    total_assets: int | None = None
    capital: int | None = None
    current_revenue: int | None = None
    operating_profit: int | None = None
    has_research_lab: bool | None = None
    research_staff_count: int | None = None
    city: str | None = None
    website: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    notes: str | None = None


class LPResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lp_name: str
    corporate_number: str | None
    business_registration_number: str | None
    ceo_name: str | None
    founded_date: date | None
    current_employees: int | None
    location: str | None
    industry: str | None
    ksic_code: str | None
    main_product: str | None
    stock_market: str | None
    listing_date: date | None
    total_assets: int | None
    capital: int | None
    current_revenue: int | None
    operating_profit: int | None
    has_research_lab: bool | None
    research_staff_count: int | None
    city: str | None
    website: str | None
    contact_person: str | None
    contact_phone: str | None
    contact_email: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class LPListResponse(BaseModel):
    data: list[LPResponse]
    total: int
    page: int
    page_size: int

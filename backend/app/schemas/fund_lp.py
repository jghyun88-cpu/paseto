"""조합 LP + 투자 집행 Pydantic 스키마"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FundLPCreate(BaseModel):
    lp_name: str
    lp_type: str  # individual / corporate / institutional / government
    # 기업 기본정보
    founded_date: date | None = None
    corporate_number: str | None = None
    business_registration_number: str | None = None
    ceo_name: str | None = None
    current_employees: int | None = None
    location: str | None = None
    # 사업정보
    industry: str | None = None
    main_product: str | None = None
    # 출자정보
    committed_amount: Decimal = Decimal("0")
    paid_in_amount: Decimal = Decimal("0")
    # 연락처
    city: str | None = None
    website: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    notes: str | None = None


class FundLPResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    lp_name: str
    lp_type: str
    founded_date: date | None
    corporate_number: str | None
    business_registration_number: str | None
    ceo_name: str | None
    current_employees: int | None
    location: str | None
    industry: str | None
    main_product: str | None
    committed_amount: Decimal
    paid_in_amount: Decimal
    city: str | None
    website: str | None
    contact_name: str | None
    contact_phone: str | None
    contact_email: str | None
    notes: str | None
    created_at: datetime


class FundInvestmentCreate(BaseModel):
    startup_id: uuid.UUID
    contract_id: uuid.UUID | None = None
    amount: Decimal
    invested_at: date
    notes: str | None = None


class FundInvestmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    startup_id: uuid.UUID
    contract_id: uuid.UUID | None
    amount: Decimal
    invested_at: date
    notes: str | None
    created_at: datetime

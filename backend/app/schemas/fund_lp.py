"""조합 LP + 투자 집행 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FundLPCreate(BaseModel):
    lp_name: str
    lp_type: str  # individual / corporate / institutional / government
    committed_amount: int
    paid_in_amount: int = 0
    contact_name: str | None = None
    contact_email: str | None = None
    notes: str | None = None


class FundLPResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    lp_name: str
    lp_type: str
    committed_amount: int
    paid_in_amount: int
    contact_name: str | None
    contact_email: str | None
    notes: str | None
    created_at: datetime


class FundInvestmentCreate(BaseModel):
    startup_id: uuid.UUID
    contract_id: uuid.UUID | None = None
    amount: int
    invested_at: date
    notes: str | None = None


class FundInvestmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    startup_id: uuid.UUID
    contract_id: uuid.UUID | None
    amount: int
    invested_at: date
    notes: str | None
    created_at: datetime

"""투자 계약 Pydantic 스키마"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ContractCreate(BaseModel):
    startup_id: uuid.UUID
    ic_decision_id: uuid.UUID
    investment_amount: int
    pre_money_valuation: int
    equity_pct: Decimal
    vehicle: str  # InvestmentVehicle 값
    follow_on_rights: bool = False
    information_rights: bool = True
    lockup_months: int | None = None
    reverse_vesting: bool = False
    conditions_precedent: dict | None = None
    representations_warranties: str | None = None


class ContractUpdate(BaseModel):
    status: str | None = None  # ContractStatus 값
    closing_checklist: dict | None = None
    termsheet_doc_id: str | None = None
    sha_doc_id: str | None = None
    sha_agreement_doc_id: str | None = None
    articles_amendment_doc_id: str | None = None
    board_minutes_doc_id: str | None = None
    signed_at: datetime | None = None


class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    ic_decision_id: uuid.UUID
    status: str
    investment_amount: int
    pre_money_valuation: int
    equity_pct: Decimal
    vehicle: str
    follow_on_rights: bool
    information_rights: bool
    lockup_months: int | None
    reverse_vesting: bool
    conditions_precedent: dict | None
    representations_warranties: str | None
    termsheet_doc_id: str | None
    sha_doc_id: str | None
    sha_agreement_doc_id: str | None
    articles_amendment_doc_id: str | None
    board_minutes_doc_id: str | None
    closing_checklist: dict | None
    signed_at: datetime | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime

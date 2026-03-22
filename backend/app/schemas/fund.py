"""조합 Pydantic 스키마"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FundCreate(BaseModel):
    fund_code: str | None = None
    fund_name: str
    fund_type: str = "individual_union"  # individual_union / venture_fund / self_capital / gov_linked
    fund_account_type: str | None = None
    total_amount: int = 0
    formation_date: date | None = None
    expiry_date: date | None = None
    gp_entity: str = ""
    key_managers: str | None = None  # JSON string
    payment_method: str | None = None
    benchmark_return_rate: Decimal | None = None
    investment_start_date: date | None = None
    investment_end_date: date | None = None
    duration_start_date: date | None = None
    duration_end_date: date | None = None
    dissolution_date: date | None = None
    liquidation_date: date | None = None
    management_fee: str | None = None
    performance_fee: str | None = None
    additional_performance_fee: str | None = None
    priority_loss_reserve: str | None = None
    investment_obligations: str | None = None  # JSON string
    notes: str | None = None


class FundUpdate(BaseModel):
    fund_code: str | None = None
    fund_name: str | None = None
    fund_type: str | None = None
    fund_account_type: str | None = None
    total_amount: int | None = None
    status: str | None = None
    committed_amount: int | None = None
    expiry_date: date | None = None
    gp_entity: str | None = None
    key_managers: str | None = None
    payment_method: str | None = None
    benchmark_return_rate: Decimal | None = None
    investment_start_date: date | None = None
    investment_end_date: date | None = None
    duration_start_date: date | None = None
    duration_end_date: date | None = None
    dissolution_date: date | None = None
    liquidation_date: date | None = None
    management_fee: str | None = None
    performance_fee: str | None = None
    additional_performance_fee: str | None = None
    priority_loss_reserve: str | None = None
    investment_obligations: str | None = None
    notes: str | None = None


class FundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_code: str | None
    fund_name: str
    fund_type: str
    fund_account_type: str | None
    total_amount: int
    committed_amount: int
    deployed_amount: int
    remaining_amount: int
    formation_date: date | None
    expiry_date: date | None
    gp_entity: str | None
    key_managers: str | None
    payment_method: str | None
    benchmark_return_rate: Decimal | None
    investment_start_date: date | None
    investment_end_date: date | None
    duration_start_date: date | None
    duration_end_date: date | None
    dissolution_date: date | None
    liquidation_date: date | None
    management_fee: str | None
    performance_fee: str | None
    additional_performance_fee: str | None
    priority_loss_reserve: str | None
    investment_obligations: str | None
    notes: str | None
    status: str
    created_at: datetime
    updated_at: datetime

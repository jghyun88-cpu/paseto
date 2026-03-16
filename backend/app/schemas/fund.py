"""조합 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FundCreate(BaseModel):
    fund_name: str
    fund_type: str  # individual_union / venture_fund / self_capital / gov_linked
    total_amount: int
    formation_date: date
    expiry_date: date | None = None
    gp_entity: str


class FundUpdate(BaseModel):
    fund_name: str | None = None
    status: str | None = None
    committed_amount: int | None = None
    expiry_date: date | None = None


class FundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_name: str
    fund_type: str
    total_amount: int
    committed_amount: int
    deployed_amount: int
    remaining_amount: int
    formation_date: date
    expiry_date: date | None
    gp_entity: str
    status: str
    created_at: datetime
    updated_at: datetime

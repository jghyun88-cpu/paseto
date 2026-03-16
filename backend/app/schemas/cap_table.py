"""Cap Table Pydantic 스키마"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CapTableCreate(BaseModel):
    startup_id: uuid.UUID
    shareholder_name: str
    share_type: str  # common / preferred / rcps / option
    shares: int
    ownership_pct: Decimal
    investment_amount: int | None = None
    investment_date: date | None = None
    round_name: str | None = None
    notes: str | None = None


class CapTableUpdate(BaseModel):
    shareholder_name: str | None = None
    shares: int | None = None
    ownership_pct: Decimal | None = None
    notes: str | None = None


class CapTableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    shareholder_name: str
    share_type: str
    shares: int
    ownership_pct: Decimal
    investment_amount: int | None
    investment_date: date | None
    round_name: str | None
    notes: str | None
    created_at: datetime

"""회수 기록 관련 Pydantic 스키마"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ExitRecordCreate(BaseModel):
    startup_id: uuid.UUID
    exit_type: str
    exit_amount: int | None = None
    multiple: float | None = None
    cap_table_clean: bool = False
    preferred_terms_reviewed: bool = False
    drag_tag_reviewed: bool = False
    ip_ownership_clean: bool = False
    accounting_transparent: bool = False
    customer_contracts_stable: bool = False
    management_issue_clear: bool = False
    exit_date: date | None = None
    notes: str | None = None


class ExitRecordUpdate(BaseModel):
    exit_type: str | None = None
    exit_amount: int | None = None
    multiple: float | None = None
    cap_table_clean: bool | None = None
    preferred_terms_reviewed: bool | None = None
    drag_tag_reviewed: bool | None = None
    ip_ownership_clean: bool | None = None
    accounting_transparent: bool | None = None
    customer_contracts_stable: bool | None = None
    management_issue_clear: bool | None = None
    exit_date: date | None = None
    notes: str | None = None


class ExitRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    exit_type: str
    exit_amount: int | None
    multiple: float | None
    cap_table_clean: bool
    preferred_terms_reviewed: bool
    drag_tag_reviewed: bool
    ip_ownership_clean: bool
    accounting_transparent: bool
    customer_contracts_stable: bool
    management_issue_clear: bool
    exit_date: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ExitRecordListResponse(BaseModel):
    data: list[ExitRecordResponse]
    total: int
    page: int
    page_size: int

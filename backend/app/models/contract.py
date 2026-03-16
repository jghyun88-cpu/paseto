"""투자 계약 모델 — §3-3 InvestmentContract + OPS-F01 클로징 체크리스트"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, JSON, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import ContractStatus, InvestmentVehicle
from app.models.base import Base


class InvestmentContract(Base):
    __tablename__ = "investment_contracts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    ic_decision_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ic_decisions.id"))
    status: Mapped[ContractStatus] = mapped_column(default=ContractStatus.IC_RECEIVED)

    # 투자 조건
    investment_amount: Mapped[int] = mapped_column(Integer)
    pre_money_valuation: Mapped[int] = mapped_column(Integer)
    equity_pct: Mapped[Decimal] = mapped_column(Numeric(10, 4))
    vehicle: Mapped[InvestmentVehicle] = mapped_column()
    follow_on_rights: Mapped[bool] = mapped_column(default=False)
    information_rights: Mapped[bool] = mapped_column(default=True)
    lockup_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reverse_vesting: Mapped[bool] = mapped_column(default=False)
    conditions_precedent: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    representations_warranties: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 문서 추적
    termsheet_doc_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sha_doc_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sha_agreement_doc_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    articles_amendment_doc_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    board_minutes_doc_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # OPS-F01 클로징 체크리스트 (10항목 JSON)
    closing_checklist: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    signed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

"""조합 관리 모델 — §24 Fund + FundLP + FundInvestment"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Fund(Base):
    __tablename__ = "funds"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fund_name: Mapped[str] = mapped_column(String(200))
    fund_type: Mapped[str] = mapped_column(String(30))  # individual_union / venture_fund / self_capital / gov_linked
    total_amount: Mapped[int] = mapped_column(Integer)
    committed_amount: Mapped[int] = mapped_column(Integer, default=0)
    deployed_amount: Mapped[int] = mapped_column(Integer, default=0)
    remaining_amount: Mapped[int] = mapped_column(Integer, default=0)
    formation_date: Mapped[date] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gp_entity: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="forming")  # forming / active / winding_down / dissolved
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class FundLP(Base):
    __tablename__ = "fund_lps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fund_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("funds.id"), index=True)
    lp_name: Mapped[str] = mapped_column(String(200))
    lp_type: Mapped[str] = mapped_column(String(30))  # individual / corporate / institutional / government
    committed_amount: Mapped[int] = mapped_column(Integer)
    paid_in_amount: Mapped[int] = mapped_column(Integer, default=0)
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class FundInvestment(Base):
    __tablename__ = "fund_investments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fund_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("funds.id"), index=True)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    contract_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("investment_contracts.id"), nullable=True,
    )
    amount: Mapped[int] = mapped_column(Integer)
    invested_at: Mapped[date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

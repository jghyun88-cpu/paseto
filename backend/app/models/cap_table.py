"""Cap Table 모델 — §3-3 CapTableEntry"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CapTableEntry(Base):
    __tablename__ = "cap_table_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    shareholder_name: Mapped[str] = mapped_column(String(200))
    share_type: Mapped[str] = mapped_column(String(30))  # common / preferred / rcps / option
    shares: Mapped[int] = mapped_column(Integer)
    ownership_pct: Mapped[Decimal] = mapped_column(Numeric(10, 4))
    investment_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    investment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    round_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

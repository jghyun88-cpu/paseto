"""KPI 기록 모델 — §3-3 KPIRecord (PRG-F04 양식 기반)"""

import uuid

from sqlalchemy import (
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class KPIRecord(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "kpi_records"
    __table_args__ = (
        UniqueConstraint("startup_id", "period", name="uq_kpi_startup_period"),
    )

    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    period: Mapped[str] = mapped_column(String(7))  # "2026-03" (YYYY-MM)
    period_type: Mapped[str] = mapped_column(String(20), default="monthly")
    # period_type: monthly / biweekly / quarterly

    # 12개 핵심 KPI (모두 nullable — 입력 부담 경감)
    revenue: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customer_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active_users: Mapped[int | None] = mapped_column(Integer, nullable=True)
    poc_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    repurchase_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    release_velocity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cac: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ltv: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pilot_conversion_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    mou_to_contract_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    runway_months: Mapped[float | None] = mapped_column(Float, nullable=True)
    follow_on_meetings: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


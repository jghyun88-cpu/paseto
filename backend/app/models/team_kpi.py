"""팀별 KPI 모델 — §16 4계층 KPI 대시보드"""

import uuid

from sqlalchemy import (
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class TeamKPI(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "team_kpis"
    __table_args__ = (
        UniqueConstraint("team", "period", "kpi_name", name="uq_team_kpi_period_name"),
    )

    team: Mapped[str] = mapped_column(String(50))
    # team: sourcing / review / incubation / oi / backoffice
    period: Mapped[str] = mapped_column(String(7))  # "2026-03"
    kpi_layer: Mapped[str] = mapped_column(String(20))
    # kpi_layer: input / process / output / outcome
    kpi_name: Mapped[str] = mapped_column(String(100))
    kpi_definition: Mapped[str] = mapped_column(Text)
    target_value: Mapped[float] = mapped_column(Float)
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    achievement_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    mom_change: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )


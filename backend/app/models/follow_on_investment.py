"""후속투자 모델 — 후속 라운드 관리 + 투자자맵"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FollowOnInvestment(Base):
    __tablename__ = "follow_on_investments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    round_type: Mapped[str] = mapped_column(String(50))
    # round_type: bridge / pre_a / series_a / strategic
    target_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    investor_map: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    matching_criteria: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    lead_investor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    co_investors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="planning")
    # status: planning / ir_active / termsheet / closing / completed
    ir_meetings_count: Mapped[int] = mapped_column(Integer, default=0)
    closed_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

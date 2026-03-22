"""투자자 미팅 기록 모델 — Demo Day 후속추적"""

import uuid
from datetime import date

from sqlalchemy import (
    JSON,
    Date,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class InvestorMeeting(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "investor_meetings"

    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    demo_day_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("demo_days.id"), nullable=True,
    )

    investor_name: Mapped[str] = mapped_column(String(100))
    investor_company: Mapped[str] = mapped_column(String(200))
    investor_type: Mapped[str] = mapped_column(String(50))
    # investor_type: angel / seed_vc / pre_a_vc / cvc / strategic / overseas

    meeting_date: Mapped[date] = mapped_column(Date)
    meeting_type: Mapped[str] = mapped_column(String(50))
    # meeting_type: onsite_consult / follow_up / ir_meeting / termsheet

    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # outcome: interested / passed / termsheet / invested

    materials_sent: Mapped[list | None] = mapped_column(JSON, nullable=True)
    next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


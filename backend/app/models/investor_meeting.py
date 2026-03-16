"""투자자 미팅 기록 모델 — Demo Day 후속추적"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InvestorMeeting(Base):
    __tablename__ = "investor_meetings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
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

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

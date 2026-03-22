"""정부/공공사업 연계 모델 — §25 GovernmentProgram"""

import uuid
from datetime import date

from sqlalchemy import (
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class GovernmentProgram(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "government_programs"

    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    program_type: Mapped[str] = mapped_column(String(50))
    # program_type: tips / pre_tips / rnd / sandbox / pilot_support / overseas_voucher
    program_name: Mapped[str] = mapped_column(String(200))
    managing_agency: Mapped[str] = mapped_column(String(200))
    applied_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="planned")
    # status: planned / applied / selected / in_progress / completed / rejected
    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    our_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


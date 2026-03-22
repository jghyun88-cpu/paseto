"""멘토링 세션 모델 — §3-3 MentoringSession (PRG-F03 양식 기반)"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class MentoringSession(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "mentoring_sessions"

    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    mentor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("mentors.id"), nullable=True,
    )
    mentor_name: Mapped[str] = mapped_column(String(100))
    mentor_type: Mapped[str] = mapped_column(String(50))
    # mentor_type: dedicated / functional / industry / investment / customer_dev

    session_date: Mapped[datetime] = mapped_column()

    # 실행관리 구조
    pre_agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    discussion_summary: Mapped[str] = mapped_column(Text)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 액션아이템 (JSON 배열)
    # [{"task": "...", "owner": "...", "deadline": "YYYY-MM-DD",
    #   "status": "pending|in_progress|completed"}]
    action_items: Mapped[list] = mapped_column(JSON, default=list)

    next_session_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    action_completion_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    improvement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pm_confirmed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )


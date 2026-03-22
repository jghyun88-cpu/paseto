"""회의체 관리 모델 — §37 7종 회의"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import MeetingType
from app.models.base import Base, BaseMixin, SoftDeleteMixin


class Meeting(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "meetings"

    meeting_type: Mapped[MeetingType] = mapped_column()
    title: Mapped[str] = mapped_column(String(200))
    scheduled_at: Mapped[datetime] = mapped_column()
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # [{user_id, team, role}]
    attendees: Mapped[list] = mapped_column(JSON, default=list)
    # [{item, owner_id, priority}]
    agenda_items: Mapped[list] = mapped_column(JSON, default=list)
    minutes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # [{item, assignee_id, deadline, status}]
    action_items: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [startup_id, ...]
    related_startup_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))


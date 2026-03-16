"""회의체 관리 모델 — §37 7종 회의"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import MeetingType
from app.models.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
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

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

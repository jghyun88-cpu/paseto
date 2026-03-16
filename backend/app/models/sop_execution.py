"""SOP 실행 추적 모델 — 단계별 진행 상태"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SOPExecution(Base):
    __tablename__ = "sop_executions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sop_template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sop_templates.id"))
    startup_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("startups.id"), nullable=True)
    initiated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    step_statuses: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

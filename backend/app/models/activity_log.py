"""활동 로그 모델 — §3-3 ActivityLog (감사 추적)"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), index=True,
    )
    startup_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("startups.id"), nullable=True, index=True,
    )
    action_type: Mapped[str] = mapped_column(String(50))  # create/update/handover/decision/alert
    action_detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

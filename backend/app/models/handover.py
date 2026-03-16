"""팀 간 인계 문서 모델 — §3-3 HandoverDocument"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class HandoverDocument(Base):
    __tablename__ = "handover_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    from_team: Mapped[str] = mapped_column(String(50))
    to_team: Mapped[str] = mapped_column(String(50))
    handover_type: Mapped[str] = mapped_column(String(50))
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(nullable=True)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    escalated_at: Mapped[datetime | None] = mapped_column(nullable=True)

"""데모데이 모델 — §22 Demo Day 운영 워크플로우"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DemoDay(Base):
    __tablename__ = "demo_days"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id"), nullable=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    event_date: Mapped[date] = mapped_column(Date)

    # 초청 투자자 목록
    # [{"name": "...", "company": "...", "priority": "A|B|C",
    #   "matched_startups": ["startup_id_1", ...]}]
    invited_investors: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # 스타트업별 준비 상태
    # {"startup_id": {"ir_ready": true, "rehearsal_done": false}}
    startup_readiness: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="planning")
    # status: planning / rehearsal / completed / follow_up
    follow_up_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

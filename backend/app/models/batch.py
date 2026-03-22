"""배치 프로그램 관리 모델 — §32"""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    batch_name: Mapped[str] = mapped_column(String(100), unique=True)
    year: Mapped[int] = mapped_column(Integer)
    sequence: Mapped[int] = mapped_column(Integer)
    recruitment_start: Mapped[date] = mapped_column(Date)
    recruitment_end: Mapped[date] = mapped_column(Date)
    program_start: Mapped[date] = mapped_column(Date)
    program_end: Mapped[date] = mapped_column(Date)
    target_count: Mapped[int] = mapped_column(Integer)
    selected_count: Mapped[int] = mapped_column(Integer, default=0)
    demo_day_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)  # FK는 demo_days 생성 후 추가
    status: Mapped[str] = mapped_column(String(50))  # recruiting/screening/active/demo_day/graduated/closed
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

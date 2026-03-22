"""1차 스크리닝 모델 — §3-3 Screening (SRC-F02 양식 기반)"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Screening(Base):
    __tablename__ = "screenings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    screener_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    # SRC-F02 7개 평가항목 (각 1-5점)
    fulltime_commitment: Mapped[int] = mapped_column(Integer)
    problem_clarity: Mapped[int] = mapped_column(Integer)
    tech_differentiation: Mapped[int] = mapped_column(Integer)
    market_potential: Mapped[int] = mapped_column(Integer)
    initial_validation: Mapped[int] = mapped_column(Integer)
    legal_clear: Mapped[bool] = mapped_column(Boolean)
    strategy_fit: Mapped[int] = mapped_column(Integer)

    # 산출 (서비스에서 자동 계산)
    overall_score: Mapped[float] = mapped_column(Float)
    recommendation: Mapped[str] = mapped_column(String(20))  # pass / review / reject
    risk_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    handover_memo: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

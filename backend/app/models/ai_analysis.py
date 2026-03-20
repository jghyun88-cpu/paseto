"""AI 분석 결과 모델 — LSA 에이전트가 생성한 분석 데이터 저장"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSON

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class AIAnalysis(Base, BaseMixin, SoftDeleteMixin):
    __tablename__ = "ai_analyses"

    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    analysis_type: Mapped[str] = mapped_column(String(50))
    scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    summary: Mapped[str] = mapped_column(Text)
    report_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(30), nullable=True)
    investment_attractiveness: Mapped[int | None] = mapped_column(nullable=True)

"""심사 모델 — §3-3 Review + §27 딥테크 심화 필드"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    review_type: Mapped[str] = mapped_column(String(20))  # document / interview / dd

    # 서류심사 5축 (각 1-5)
    team_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    problem_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    solution_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    market_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    traction_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 인터뷰 8축 (각 1-5)
    number_literacy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customer_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tech_moat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    execution_plan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback_absorption: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cofounder_stability: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # DD 체크리스트 (JSON — 10항목)
    dd_checklist: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    risk_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    overall_verdict: Mapped[str] = mapped_column(String(20))  # proceed / concern / reject

    # 딥테크 심화 (§27)
    tech_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    scalability_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    process_compatibility: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sample_test_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    certification_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    purchase_lead_time_months: Mapped[int | None] = mapped_column(Integer, nullable=True)

    started_at: Mapped[datetime] = mapped_column(server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

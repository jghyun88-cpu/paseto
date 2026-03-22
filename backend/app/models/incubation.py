"""보육 포트폴리오 모델 — §3-3 Incubation (PRG-F01/F02 양식 기반)"""

import uuid
from datetime import date

from sqlalchemy import (
    JSON,
    Date,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import PortfolioGrade
from app.models.base import Base, BaseMixin, SoftDeleteMixin


class Incubation(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "incubations"

    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id"), nullable=True,
    )
    assigned_pm_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    # 프로그램 기간
    program_start: Mapped[date] = mapped_column(Date)
    program_end: Mapped[date] = mapped_column(Date)

    # PRG-F01 온보딩 진단 7개 항목
    # {"customer": 1-5, "product": 1-5, "tech": 1-5, "org": 1-5,
    #  "sales": 1-5, "finance": 1-5, "investment_readiness": 1-5}
    diagnosis: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # PRG-F02 90일 액션플랜
    # {"items": [{"area": "product|customer|revenue|investment|org",
    #   "current_state": "...", "target_state": "...",
    #   "tasks": "...", "owner": "...", "deadline": "YYYY-MM-DD"}]}
    action_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    growth_bottleneck: Mapped[str | None] = mapped_column(Text, nullable=True)
    portfolio_grade: Mapped[PortfolioGrade] = mapped_column(default=PortfolioGrade.B)
    status: Mapped[str] = mapped_column(String(50), default="onboarding")
    # status: onboarding / active / graduated / paused

    # 위기 신호 플래그
    # {"cash_critical": false, "key_person_left": false,
    #  "customer_churn": false, "dev_delay": false, "lawsuit": false}
    crisis_flags: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # 온보딩 체크리스트
    # {"items": [{"label": "...", "completed": bool}], "completed_at": null}
    onboarding_checklist: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # IR 준비 상태
    # {"pitch_1min": false, ..., "milestone_plan": false}
    ir_readiness: Mapped[dict | None] = mapped_column(JSON, nullable=True)


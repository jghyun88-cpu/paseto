"""PoC 프로젝트 모델 — §4-4 OI-F02/F03 PoC 제안서 + 진행관리"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import PoCStatus
from app.models.base import Base


class PoCProject(Base):
    __tablename__ = "poc_projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    partner_demand_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("partner_demands.id"), index=True,
    )
    project_name: Mapped[str] = mapped_column(String(200))

    # OI-F02 PoC 제안서 7개 필수항목
    objective: Mapped[str] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(Text)
    duration_weeks: Mapped[int] = mapped_column(Integer)
    validation_metrics: Mapped[list] = mapped_column(JSON, default=list)
    cost_structure: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    success_criteria: Mapped[str] = mapped_column(Text)
    next_step_if_success: Mapped[str | None] = mapped_column(Text, nullable=True)

    # OI-F02 추가 필드
    participants: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    role_division: Mapped[str | None] = mapped_column(Text, nullable=True)
    provided_resources: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_risks: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # OI-F03 진행관리
    status: Mapped[PoCStatus] = mapped_column(default=PoCStatus.DEMAND_IDENTIFIED)
    kickoff_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weekly_issues: Mapped[str | None] = mapped_column(Text, nullable=True)
    support_needed: Mapped[str | None] = mapped_column(Text, nullable=True)
    partner_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    startup_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    conversion_likelihood: Mapped[str | None] = mapped_column(String(20), nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

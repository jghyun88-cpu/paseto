"""직무기술서 모델 — §17 10개 JD"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    jd_code: Mapped[str] = mapped_column(String(10), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    team: Mapped[str] = mapped_column(String(50))
    reports_to: Mapped[str] = mapped_column(String(100))
    purpose: Mapped[str] = mapped_column(Text)
    core_responsibilities: Mapped[list] = mapped_column(JSON, default=list)
    daily_tasks: Mapped[list] = mapped_column(JSON, default=list)
    weekly_tasks: Mapped[list] = mapped_column(JSON, default=list)
    monthly_tasks: Mapped[list] = mapped_column(JSON, default=list)
    quarterly_annual_tasks: Mapped[list | None] = mapped_column(JSON, nullable=True)
    collaboration_teams: Mapped[list] = mapped_column(JSON, default=list)
    deliverables: Mapped[list] = mapped_column(JSON, default=list)
    kpi_quantitative: Mapped[list] = mapped_column(JSON, default=list)
    kpi_qualitative: Mapped[list | None] = mapped_column(JSON, nullable=True)
    required_skills: Mapped[dict] = mapped_column(JSON, default=dict)
    preferred_qualifications: Mapped[list] = mapped_column(JSON, default=list)
    authority_scope: Mapped[list] = mapped_column(JSON, default=list)
    approval_required: Mapped[list] = mapped_column(JSON, default=list)
    responsibility_scope: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

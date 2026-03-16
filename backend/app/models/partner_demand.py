"""파트너 수요 모델 — §4-4 OI-F01 파트너 수요정리표"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PartnerDemand(Base):
    __tablename__ = "partner_demands"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    partner_company: Mapped[str] = mapped_column(String(200))
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    demand_type: Mapped[str] = mapped_column(String(50))
    # demand_type: tech_adoption / joint_dev / vendor / new_biz / strategic_invest
    description: Mapped[str] = mapped_column(Text)
    tech_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    timeline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget_range: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nda_required: Mapped[bool] = mapped_column(Boolean, default=False)
    # [{startup_id, fit_reason}]
    candidate_startups: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="open")
    # status: open / matched / in_poc / contracted / closed

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

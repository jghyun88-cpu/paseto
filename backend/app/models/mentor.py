"""멘토 풀 관리 모델 — §31"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Mentor(Base):
    __tablename__ = "mentors"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mentor_type: Mapped[str] = mapped_column(String(50))  # dedicated/functional/industry/investment/customer_dev
    expertise_areas: Mapped[list] = mapped_column(JSON, default=list)
    industry_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    functional_area: Mapped[str | None] = mapped_column(String(50), nullable=True)  # tech/product/sales/finance/patent/production
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    availability: Mapped[str | None] = mapped_column(String(100), nullable=True)
    engagement_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_satisfaction: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

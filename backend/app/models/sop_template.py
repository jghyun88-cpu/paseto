"""SOP 템플릿 모델 — §14 6개 SOP 워크플로우"""

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SOPTemplate(Base):
    __tablename__ = "sop_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    document_number: Mapped[str] = mapped_column(String(20), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    effective_date: Mapped[date] = mapped_column(Date)
    revision_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owning_team: Mapped[str] = mapped_column(String(50))
    purpose: Mapped[str] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(Text)
    steps: Mapped[list] = mapped_column(JSON, default=list)
    required_forms: Mapped[list] = mapped_column(JSON, default=list)
    checkpoints: Mapped[list] = mapped_column(JSON, default=list)
    exception_rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

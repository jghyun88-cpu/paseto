"""SOP 템플릿 모델 — §14 6개 SOP 워크플로우"""

from datetime import date

from sqlalchemy import JSON, Boolean, Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class SOPTemplate(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "sop_templates"

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


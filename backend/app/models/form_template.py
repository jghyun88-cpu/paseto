"""양식 템플릿 모델 — §15 14개 양식"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FormTemplate(Base):
    __tablename__ = "form_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    form_code: Mapped[str] = mapped_column(String(20), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owning_team: Mapped[str] = mapped_column(String(50))
    fields: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

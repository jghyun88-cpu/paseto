"""양식 제출 모델 — FormSubmission"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    form_template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("form_templates.id"))
    startup_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("startups.id"), nullable=True)
    submitted_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="submitted")
    submitted_at: Mapped[datetime] = mapped_column(server_default=func.now())
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

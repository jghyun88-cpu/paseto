"""컴플라이언스 체크리스트 모델 — 서버 저장 + 감사 추적"""

import uuid

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class ComplianceChecklist(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "compliance_checklists"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    checklist_type: Mapped[str] = mapped_column(String(50), default="default")
    items: Mapped[dict] = mapped_column(JSON, default=list)

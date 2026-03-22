"""문서 모델 — 마스터 §26 데이터룸"""

import uuid

from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class Document(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "documents"

    startup_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("startups.id"), nullable=True, index=True,
    )
    category: Mapped[str] = mapped_column(String(20))
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), index=True,
    )

    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="joined")

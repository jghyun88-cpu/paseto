"""포트폴리오 이슈 모델 — 리스크 모니터링 에이전트가 감지한 이슈 추적"""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class PortfolioIssue(Base, BaseMixin, SoftDeleteMixin):
    __tablename__ = "portfolio_issues"

    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    issue_type: Mapped[str] = mapped_column(String(50))
    severity: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(Text)
    detected_by: Mapped[str] = mapped_column(String(30), default="ai-agent")
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

"""투자위원회 결정 모델 — §3-3 ICDecision"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import ICDecisionType
from app.models.base import Base


class ICDecision(Base):
    __tablename__ = "ic_decisions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    memo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("investment_memos.id"))
    decision: Mapped[ICDecisionType] = mapped_column()
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    monitoring_points: Mapped[str | None] = mapped_column(Text, nullable=True)
    attendees: Mapped[list] = mapped_column(JSON, default=list)
    contract_assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )
    program_assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )
    decided_at: Mapped[datetime] = mapped_column(server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

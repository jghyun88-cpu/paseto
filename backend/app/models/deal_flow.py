"""딜플로우 파이프라인 모델 — §3-3 DealFlow"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import DealStage
from app.models.base import Base


class DealFlow(Base):
    __tablename__ = "deal_flows"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    stage: Mapped[DealStage] = mapped_column()
    moved_at: Mapped[datetime] = mapped_column(server_default=func.now())
    moved_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

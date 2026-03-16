"""투자 메모 모델 — §3-3 InvestmentMemo (9개 필수 섹션)"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InvestmentMemo(Base):
    __tablename__ = "investment_memos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)

    # 9개 필수 섹션
    overview: Mapped[str] = mapped_column(Text)
    team_assessment: Mapped[str] = mapped_column(Text)
    market_assessment: Mapped[str] = mapped_column(Text)
    tech_product_assessment: Mapped[str] = mapped_column(Text)
    traction: Mapped[str] = mapped_column(Text)
    risks: Mapped[str] = mapped_column(Text)
    value_add_points: Mapped[str] = mapped_column(Text)
    proposed_terms: Mapped[dict] = mapped_column(JSON, default=dict)
    post_investment_plan: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft / submitted / ic_ready
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

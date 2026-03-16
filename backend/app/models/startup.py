"""스타트업 모델 — §3-3 + §38 보강 필드"""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import DealStage, PortfolioGrade, SourcingChannel
from app.models.base import Base


class Startup(Base):
    __tablename__ = "startups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(200))
    corporate_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ceo_name: Mapped[str] = mapped_column(String(100))
    industry: Mapped[str] = mapped_column(String(100))
    stage: Mapped[str] = mapped_column(String(50))  # 예비창업/Pre-seed/Seed/Pre-A
    one_liner: Mapped[str] = mapped_column(String(500))
    problem_definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_fulltime: Mapped[bool] = mapped_column(Boolean, default=False)
    sourcing_channel: Mapped[SourcingChannel] = mapped_column()
    referrer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    current_deal_stage: Mapped[DealStage] = mapped_column(default=DealStage.INBOUND)
    portfolio_grade: Mapped[PortfolioGrade | None] = mapped_column(nullable=True)
    is_portfolio: Mapped[bool] = mapped_column(Boolean, default=False)

    # §38 보강 필드: SRC-F01 양식 완전 매핑
    founded_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    main_customer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    current_traction: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_revenue: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_meeting_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # FK
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id"), nullable=True,
    )
    assigned_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )

    invested_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
    )

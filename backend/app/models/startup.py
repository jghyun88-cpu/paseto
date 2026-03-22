"""스타트업 모델 — §3-3 + §38 보강 필드"""

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import DealStage, PortfolioGrade, SourcingChannel
from app.models.base import Base, BaseMixin, SoftDeleteMixin


class Startup(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "startups"

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
    current_revenue: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    current_employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_meeting_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # BHV 기업정보DB 연동 필드
    business_registration_number: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 사업자등록번호
    ksic_code: Mapped[str | None] = mapped_column(String(20), nullable=True)       # 표준산업분류 코드
    main_product: Mapped[str | None] = mapped_column(String(500), nullable=True)   # 주요사업(제품)
    stock_market: Mapped[str | None] = mapped_column(String(50), nullable=True)    # 상장시장
    listing_date: Mapped[date | None] = mapped_column(Date, nullable=True)         # 상장일자
    total_assets: Mapped[int | None] = mapped_column(BigInteger, nullable=True)       # 자산총액(원)
    capital: Mapped[int | None] = mapped_column(BigInteger, nullable=True)            # 자본금(원)
    operating_profit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)   # 영업이익(원)
    has_research_lab: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # 기술연구소 유무
    research_staff_count: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 연구인력
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)           # 도시
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)        # 웹사이트
    contact_person: Mapped[str | None] = mapped_column(String(100), nullable=True) # 실무담당
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)   # 연락처
    contact_email: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 이메일
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)                 # 기타 사항

    # FK
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id"), nullable=True,
    )
    assigned_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )

    # Relationship
    assigned_manager = relationship("User", foreign_keys=[assigned_manager_id], lazy="joined")

    invested_at: Mapped[datetime | None] = mapped_column(nullable=True)

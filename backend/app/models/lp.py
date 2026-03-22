"""LP(출자자) 마스터 모델 — 스타트업과 동일 구조의 독립 엔티티"""

from datetime import date

from sqlalchemy import BigInteger, Boolean, Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class LP(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "lps"

    # 기본정보
    lp_name: Mapped[str] = mapped_column(String(200))
    corporate_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    business_registration_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ceo_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    founded_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    current_employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # 사업정보
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ksic_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    main_product: Mapped[str | None] = mapped_column(String(500), nullable=True)
    stock_market: Mapped[str | None] = mapped_column(String(50), nullable=True)
    listing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # 재무정보
    total_assets: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    capital: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    current_revenue: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    operating_profit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # 연구개발
    has_research_lab: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    research_staff_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # 연락처
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # 기타
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


"""조합 관리 모델 — §24 Fund + FundLP + FundInvestment"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseMixin, SoftDeleteMixin


class Fund(BaseMixin, SoftDeleteMixin, Base):
    __tablename__ = "funds"

    fund_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fund_name: Mapped[str] = mapped_column(String(200))
    fund_type: Mapped[str] = mapped_column(String(30))  # individual_union / venture_fund / self_capital / gov_linked
    fund_account_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    total_amount: Mapped[int] = mapped_column(BigInteger)
    committed_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    deployed_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    remaining_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    formation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gp_entity: Mapped[str] = mapped_column(String(200))
    key_managers: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: 핵심운용인력
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    benchmark_return_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    investment_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    investment_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    duration_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    duration_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dissolution_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    liquidation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    management_fee: Mapped[str | None] = mapped_column(String(100), nullable=True)
    performance_fee: Mapped[str | None] = mapped_column(String(100), nullable=True)
    additional_performance_fee: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority_loss_reserve: Mapped[str | None] = mapped_column(String(100), nullable=True)
    investment_obligations: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: 투자의무분야/금액
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="forming")  # forming / active / winding_down / dissolved


class FundLP(Base):
    __tablename__ = "fund_lps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fund_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("funds.id"), index=True)
    lp_name: Mapped[str] = mapped_column(String(200))
    lp_type: Mapped[str] = mapped_column(String(30))  # individual / corporate / institutional / government
    # 기업 기본정보 (스타트업 등록과 동일)
    founded_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    corporate_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    business_registration_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ceo_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # 사업정보
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    main_product: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # 출자정보
    committed_amount: Mapped[int] = mapped_column(BigInteger)
    paid_in_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    # 연락처
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class FundInvestment(Base):
    __tablename__ = "fund_investments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fund_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("funds.id"), index=True)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"), index=True)
    contract_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("investment_contracts.id"), nullable=True,
    )
    amount: Mapped[int] = mapped_column(BigInteger)
    invested_at: Mapped[date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

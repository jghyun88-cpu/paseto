"""회수 기록 모델 — ExitType Enum + 7개 체크리스트"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import ExitType
from app.models.base import Base


class ExitRecord(Base):
    __tablename__ = "exit_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id"), index=True,
    )
    exit_type: Mapped[ExitType] = mapped_column()
    exit_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    multiple: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)

    # 회수 준비 체크리스트 7개항
    cap_table_clean: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_terms_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    drag_tag_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_ownership_clean: Mapped[bool] = mapped_column(Boolean, default=False)
    accounting_transparent: Mapped[bool] = mapped_column(Boolean, default=False)
    customer_contracts_stable: Mapped[bool] = mapped_column(Boolean, default=False)
    management_issue_clear: Mapped[bool] = mapped_column(Boolean, default=False)

    exit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(),
    )

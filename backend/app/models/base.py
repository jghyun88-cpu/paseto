"""SQLAlchemy Base 모델 + 공통 Mixin"""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """모든 모델의 기반 클래스"""
    pass


class TimestampMixin:
    """created_at / updated_at 자동 관리"""
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
    )


class BaseMixin(TimestampMixin):
    """UUID PK + 타임스탬프"""
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class SoftDeleteMixin:
    """소프트 삭제 지원"""
    is_deleted: Mapped[bool] = mapped_column(default=False)

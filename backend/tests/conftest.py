"""테스트 공통 픽스처 — SQLite in-memory + httpx AsyncClient"""

import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.middleware.auth import create_access_token
from app.models.base import Base

# 모든 모델을 import하여 Base.metadata에 등록 (SQLite create_all용)
import app.models.user  # noqa: F401
import app.models.startup  # noqa: F401
import app.models.deal_flow  # noqa: F401
import app.models.screening  # noqa: F401
import app.models.handover  # noqa: F401
import app.models.review  # noqa: F401
import app.models.investment_memo  # noqa: F401
import app.models.ic_decision  # noqa: F401
import app.models.activity_log  # noqa: F401
import app.models.notification  # noqa: F401
import app.models.contract  # noqa: F401
import app.models.cap_table  # noqa: F401
import app.models.fund  # noqa: F401

# --- SQLite UUID 호환: uuid.UUID ↔ string 자동 변환 ---
@event.listens_for(Engine, "connect")
def _set_sqlite_uuid_pragma(dbapi_connection, connection_record):
    """SQLite에서 UUID를 string으로 저장/로드할 수 있도록 설정"""
    pass  # aiosqlite 이벤트 등록용


# Monkey-patch: SQLAlchemy Uuid type의 SQLite 바인드 프로세서
from sqlalchemy.sql import sqltypes as _sqltypes

_original_uuid_bind = _sqltypes.Uuid.bind_processor

def _patched_uuid_bind(self, dialect):
    if dialect.name == "sqlite":
        def process(value):
            if value is not None:
                if isinstance(value, uuid.UUID):
                    return value.hex
                # JWT에서 오는 string UUID 처리
                return uuid.UUID(str(value)).hex
            return value
        return process
    return _original_uuid_bind(self, dialect)

_sqltypes.Uuid.bind_processor = _patched_uuid_bind

_original_uuid_result = _sqltypes.Uuid.result_processor

def _patched_uuid_result(self, dialect, coltype):
    if dialect.name == "sqlite":
        def process(value):
            if value is not None:
                if isinstance(value, uuid.UUID):
                    return value
                return uuid.UUID(str(value))
            return value
        return process
    return _original_uuid_result(self, dialect, coltype)

_sqltypes.Uuid.result_processor = _patched_uuid_result


# --- in-memory SQLite (aiosqlite) 사용 ---
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """매 테스트마다 테이블 생성/삭제"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """테스트용 httpx 클라이언트 — DB 의존성 오버라이드"""
    from app.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


# --- 테스트 데이터 헬퍼 ---

async def create_test_user(
    db: AsyncSession,
    *,
    role: str = "analyst",
    team: str = "review",
    email: str | None = None,
) -> "User":
    """테스트용 사용자 생성"""
    from app.models.user import User

    user = User(
        id=uuid.uuid4(),
        name="테스트 심사원",
        email=email or f"test-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password="$2b$12$fakehash",
        role=role,
        team=team,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_test_startup(db: AsyncSession, manager_id: uuid.UUID | None = None) -> "Startup":
    """테스트용 스타트업 생성"""
    from app.enums import DealStage, SourcingChannel
    from app.models.startup import Startup

    startup = Startup(
        id=uuid.uuid4(),
        company_name="테스트 딥테크",
        ceo_name="김테스트",
        industry="바이오",
        stage="Seed",
        one_liner="AI 기반 신약 발굴 플랫폼",
        sourcing_channel=SourcingChannel.UNIVERSITY_LAB,
        current_deal_stage=DealStage.DEEP_REVIEW,
        assigned_manager_id=manager_id,
    )
    db.add(startup)
    await db.commit()
    await db.refresh(startup)
    return startup


def make_auth_header(user_id: uuid.UUID) -> dict[str, str]:
    """JWT 토큰으로 Authorization 헤더 생성"""
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}

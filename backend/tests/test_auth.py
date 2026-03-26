"""인증 API 테스트 — 로그인 + JWT 토큰"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_user, make_auth_header


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db: AsyncSession):
    """정상 로그인 → JWT 토큰 반환"""
    from app.services.user_service import get_password_hash
    from app.models.user import User
    import uuid

    user = User(
        id=uuid.uuid4(),
        name="로그인테스트",
        email="login@test.com",
        hashed_password=get_password_hash("testpass123"),
        role="analyst",
        team="sourcing",
        is_active=True,
    )
    db.add(user)
    await db.commit()

    resp = await client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db: AsyncSession):
    """잘못된 비밀번호 → 401"""
    from app.services.user_service import get_password_hash
    from app.models.user import User
    import uuid

    user = User(
        id=uuid.uuid4(),
        name="비번테스트",
        email="wrongpw@test.com",
        hashed_password=get_password_hash("realpass"),
        role="analyst",
        team="sourcing",
        is_active=True,
    )
    db.add(user)
    await db.commit()

    resp = await client.post("/api/v1/auth/login", json={
        "email": "wrongpw@test.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401

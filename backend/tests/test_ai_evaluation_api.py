"""AI 평가 API 통합 테스트 — ~7개"""

import io
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_user, create_test_startup, make_auth_header


# --- POST /api/v1/ai-analysis/evaluation/upload ---


@pytest.mark.asyncio
async def test_upload_returns_result(client: AsyncClient, db: AsyncSession):
    """구조화된 점수가 있는 MD 업로드 → 200 + completed"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    headers = make_auth_header(user.id)

    md_content = """---
보고서유형: 스크리닝
---
# 스크리닝 보고서

총점 | **78 / 100점**
판정 | 조건부 통과

### 팀 역량 (만점: 15점) → **12점**
### 시장 규모 (만점: 15점) → **10점**
### 트랙션 (만점: 15점) → **11점**
### 비즈니스 모델 (만점: 15점) → **9점**
### 문제 정의 명확성 (만점: 10점) → **8점**
### 솔루션 차별화 (만점: 10점) → **7점**
### 실행력 (만점: 10점) → **8점**
### AC 적합성 (만점: 10점) → **7점**
"""

    resp = await client.post(
        f"/api/v1/ai-analysis/evaluation/upload?startup_id={startup.id}",
        headers=headers,
        files={"files": ("screening.md", io.BytesIO(md_content.encode()), "text/markdown")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["evaluation_id"] is not None
    assert data["scores"] is not None
    assert data["scores"]["total"] == 78.0
    assert data["recommendation"] == "conditional"


@pytest.mark.asyncio
async def test_upload_nonstructured_returns_pending(
    client: AsyncClient, db: AsyncSession,
):
    """점수 없는 MD 업로드 → 200 + pending (Claude fallback)"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    headers = make_auth_header(user.id)

    md_content = "# 일반 메모\n좋은 기업이라고 생각합니다."

    resp = await client.post(
        f"/api/v1/ai-analysis/evaluation/upload?startup_id={startup.id}",
        headers=headers,
        files={"files": ("memo.md", io.BytesIO(md_content.encode()), "text/markdown")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["evaluation_id"] is not None


@pytest.mark.asyncio
async def test_upload_invalid_filetype(client: AsyncClient, db: AsyncSession):
    """허용되지 않는 파일 형식 → 400"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    headers = make_auth_header(user.id)

    resp = await client.post(
        f"/api/v1/ai-analysis/evaluation/upload?startup_id={startup.id}",
        headers=headers,
        files={"files": ("virus.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "허용되지 않는" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_upload_startup_not_found(client: AsyncClient, db: AsyncSession):
    """존재하지 않는 스타트업 → 404"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    headers = make_auth_header(user.id)

    fake_id = uuid.uuid4()
    resp = await client.post(
        f"/api/v1/ai-analysis/evaluation/upload?startup_id={fake_id}",
        headers=headers,
        files={"files": ("report.md", io.BytesIO(b"content"), "text/markdown")},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_too_many_files(client: AsyncClient, db: AsyncSession):
    """7개 파일 업로드 → 400"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    headers = make_auth_header(user.id)

    files = [
        ("files", (f"report_{i}.md", io.BytesIO(b"content"), "text/markdown"))
        for i in range(7)
    ]

    resp = await client.post(
        f"/api/v1/ai-analysis/evaluation/upload?startup_id={startup.id}",
        headers=headers,
        files=files,
    )
    assert resp.status_code == 400
    assert "최대" in resp.json()["detail"]


# --- GET /api/v1/ai-analysis/evaluation/{id}/status ---


@pytest.mark.asyncio
async def test_get_status_completed(client: AsyncClient, db: AsyncSession):
    """완료된 평가 조회 → completed"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    headers = make_auth_header(user.id)

    # 먼저 평가 생성 (동기 파싱)
    md_content = """총점 | **85 / 100점**
판정 | 통과
팀 역량 (만점: 15점) → **14점**
시장 규모 (만점: 15점) → **13점**
트랙션 (만점: 15점) → **12점**
비즈니스 모델 (만점: 15점) → **11점**
"""
    upload_resp = await client.post(
        f"/api/v1/ai-analysis/evaluation/upload?startup_id={startup.id}",
        headers=headers,
        files={"files": ("report.md", io.BytesIO(md_content.encode()), "text/markdown")},
    )
    eval_id = upload_resp.json()["evaluation_id"]

    resp = await client.get(
        f"/api/v1/ai-analysis/evaluation/{eval_id}/status",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_get_status_not_found(client: AsyncClient, db: AsyncSession):
    """존재하지 않는 평가 → 404"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    headers = make_auth_header(user.id)

    fake_id = uuid.uuid4()
    resp = await client.get(
        f"/api/v1/ai-analysis/evaluation/{fake_id}/status",
        headers=headers,
    )
    assert resp.status_code == 404

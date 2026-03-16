"""투자메모(InvestmentMemo) API 통합 테스트 — 4개 엔드포인트"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_startup, create_test_user, make_auth_header


@pytest_asyncio.fixture
async def review_user(db: AsyncSession):
    return await create_test_user(db, role="analyst", team="review")


@pytest_asyncio.fixture
async def startup(db: AsyncSession, review_user):
    return await create_test_startup(db, manager_id=review_user.id)


@pytest_asyncio.fixture
def memo_payload(startup):
    return {
        "startup_id": str(startup.id),
        "overview": "AI 기반 신약 발굴",
        "team_assessment": "핵심 연구진 3명, 박사급",
        "market_assessment": "글로벌 AI 신약 시장 $50B",
        "tech_product_assessment": "자체 모델, 학습 데이터 확보",
        "traction": "대학병원 2곳 PoC 진행중",
        "risks": "임상 실패, 규제, 데이터 의존",
        "value_add_points": "네트워크 연결, 후속투자",
        "proposed_terms": {"amount": 300000000, "valuation": 5000000000, "vehicle": "rcps"},
        "post_investment_plan": "6개월 내 시리즈A 연결",
    }


# --- POST /api/v1/investment-memos/ ---

@pytest.mark.asyncio
async def test_create_memo(client: AsyncClient, review_user, memo_payload):
    """투자메모 생성 — 201 + version=1"""
    res = await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["version"] == 1
    assert body["status"] == "draft"
    assert body["overview"] == "AI 기반 신약 발굴"


@pytest.mark.asyncio
async def test_memo_version_auto_increment(client: AsyncClient, review_user, memo_payload):
    """같은 스타트업 메모 2건 → version 자동 증가"""
    res1 = await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(review_user.id),
    )
    assert res1.json()["version"] == 1

    res2 = await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(review_user.id),
    )
    assert res2.json()["version"] == 2


@pytest.mark.asyncio
async def test_create_memo_invalid_startup(client: AsyncClient, review_user):
    """존재하지 않는 스타트업 → 404"""
    payload = {
        "startup_id": str(uuid.uuid4()),
        "overview": "x", "team_assessment": "x", "market_assessment": "x",
        "tech_product_assessment": "x", "traction": "x", "risks": "x",
        "value_add_points": "x", "proposed_terms": {}, "post_investment_plan": "x",
    }
    res = await client.post(
        "/api/v1/investment-memos/",
        json=payload,
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


# --- GET /api/v1/investment-memos/ ---

@pytest.mark.asyncio
async def test_list_memos(client: AsyncClient, review_user, startup, memo_payload):
    """목록 조회 — 생성 후 1건"""
    await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(review_user.id),
    )
    res = await client.get(
        f"/api/v1/investment-memos/?startup_id={startup.id}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert len(res.json()) == 1


# --- GET /api/v1/investment-memos/{id} ---

@pytest.mark.asyncio
async def test_get_memo_detail(client: AsyncClient, review_user, memo_payload):
    """상세 조회"""
    create_res = await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(review_user.id),
    )
    memo_id = create_res.json()["id"]

    res = await client.get(
        f"/api/v1/investment-memos/{memo_id}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert res.json()["proposed_terms"]["vehicle"] == "rcps"


@pytest.mark.asyncio
async def test_get_memo_not_found(client: AsyncClient, review_user):
    """존재하지 않는 메모 → 404"""
    res = await client.get(
        f"/api/v1/investment-memos/{uuid.uuid4()}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


# --- PATCH /api/v1/investment-memos/{id} ---

@pytest.mark.asyncio
async def test_update_memo_status(client: AsyncClient, review_user, memo_payload):
    """메모 상태 변경 — draft → submitted"""
    create_res = await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(review_user.id),
    )
    memo_id = create_res.json()["id"]

    res = await client.patch(
        f"/api/v1/investment-memos/{memo_id}",
        json={"status": "submitted"},
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "submitted"


# --- RBAC ---

@pytest.mark.asyncio
async def test_rbac_oi_cannot_create_memo(client: AsyncClient, db, memo_payload):
    """RBAC: OI팀은 review_dd_memo:full 없음 → 403"""
    oi_user = await create_test_user(db, role="oi_manager", team="oi")
    res = await client.post(
        "/api/v1/investment-memos/",
        json=memo_payload,
        headers=make_auth_header(oi_user.id),
    )
    assert res.status_code == 403

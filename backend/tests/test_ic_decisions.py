"""IC 결정(ICDecision) API 통합 테스트 — 3개 엔드포인트"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.investment_memo import InvestmentMemo
from tests.conftest import create_test_startup, create_test_user, make_auth_header


@pytest_asyncio.fixture
async def review_user(db: AsyncSession):
    return await create_test_user(db, role="analyst", team="review")


@pytest_asyncio.fixture
async def startup(db: AsyncSession, review_user):
    return await create_test_startup(db, manager_id=review_user.id)


@pytest_asyncio.fixture
async def memo(db: AsyncSession, startup, review_user) -> InvestmentMemo:
    """테스트용 투자메모 직접 생성"""
    m = InvestmentMemo(
        id=uuid.uuid4(),
        startup_id=startup.id,
        author_id=review_user.id,
        version=1,
        overview="개요", team_assessment="팀", market_assessment="시장",
        tech_product_assessment="기술", traction="트랙션", risks="리스크",
        value_add_points="기여", proposed_terms={}, post_investment_plan="계획",
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest_asyncio.fixture
def ic_payload(startup, memo):
    return {
        "startup_id": str(startup.id),
        "memo_id": str(memo.id),
        "decision": "approved",
        "conditions": "시리즈A 전 재무실사 필요",
        "attendees": ["파트너A", "파트너B", "심사역C"],
        "notes": "만장일치 승인",
    }


# --- POST /api/v1/ic-decisions/ ---

@pytest.mark.asyncio
async def test_create_ic_decision(client: AsyncClient, review_user, ic_payload):
    """IC 결정 생성 — 201"""
    res = await client.post(
        "/api/v1/ic-decisions/",
        json=ic_payload,
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["decision"] == "approved"
    assert body["conditions"] == "시리즈A 전 재무실사 필요"
    assert len(body["attendees"]) == 3


@pytest.mark.asyncio
async def test_ic_decision_rejected(client: AsyncClient, review_user, ic_payload):
    """IC rejected 결정"""
    ic_payload["decision"] = "rejected"
    ic_payload["notes"] = "기술 리스크 과다"
    res = await client.post(
        "/api/v1/ic-decisions/",
        json=ic_payload,
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 201
    assert res.json()["decision"] == "rejected"


@pytest.mark.asyncio
async def test_ic_decision_invalid_startup(client: AsyncClient, review_user, memo):
    """존재하지 않는 스타트업 → 404"""
    res = await client.post(
        "/api/v1/ic-decisions/",
        json={
            "startup_id": str(uuid.uuid4()),
            "memo_id": str(memo.id),
            "decision": "approved",
        },
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_ic_decision_invalid_memo(client: AsyncClient, review_user, startup):
    """존재하지 않는 메모 → 404"""
    res = await client.post(
        "/api/v1/ic-decisions/",
        json={
            "startup_id": str(startup.id),
            "memo_id": str(uuid.uuid4()),
            "decision": "approved",
        },
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


# --- GET /api/v1/ic-decisions/ ---

@pytest.mark.asyncio
async def test_list_ic_decisions(client: AsyncClient, review_user, startup, ic_payload):
    """목록 조회"""
    await client.post(
        "/api/v1/ic-decisions/",
        json=ic_payload,
        headers=make_auth_header(review_user.id),
    )
    res = await client.get(
        f"/api/v1/ic-decisions/?startup_id={startup.id}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert len(res.json()) == 1


# --- GET /api/v1/ic-decisions/{id} ---

@pytest.mark.asyncio
async def test_get_ic_decision_detail(client: AsyncClient, review_user, ic_payload):
    """상세 조회"""
    create_res = await client.post(
        "/api/v1/ic-decisions/",
        json=ic_payload,
        headers=make_auth_header(review_user.id),
    )
    decision_id = create_res.json()["id"]

    res = await client.get(
        f"/api/v1/ic-decisions/{decision_id}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert res.json()["id"] == decision_id


@pytest.mark.asyncio
async def test_get_ic_decision_not_found(client: AsyncClient, review_user):
    """존재하지 않는 결정 → 404"""
    res = await client.get(
        f"/api/v1/ic-decisions/{uuid.uuid4()}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


# --- RBAC ---

@pytest.mark.asyncio
async def test_rbac_incubation_cannot_create_ic(client: AsyncClient, db, ic_payload):
    """RBAC: incubation팀은 ic_decision:write 없음 → 403"""
    inc_user = await create_test_user(db, role="pm", team="incubation")
    res = await client.post(
        "/api/v1/ic-decisions/",
        json=ic_payload,
        headers=make_auth_header(inc_user.id),
    )
    assert res.status_code == 403

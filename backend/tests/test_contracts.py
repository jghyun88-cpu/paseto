"""투자 계약(Contract) API 통합 테스트 — 4개 엔드포인트 + 자동화 #5"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ic_decision import ICDecision
from app.models.investment_memo import InvestmentMemo
from tests.conftest import create_test_startup, create_test_user, make_auth_header


@pytest_asyncio.fixture
async def bo_user(db: AsyncSession):
    return await create_test_user(db, role="backoffice", team="backoffice")


@pytest_asyncio.fixture
async def startup(db: AsyncSession, bo_user):
    return await create_test_startup(db, manager_id=bo_user.id)


@pytest_asyncio.fixture
async def ic_decision(db: AsyncSession, startup, bo_user):
    """테스트용 IC 결정 + 투자메모 생성"""
    memo = InvestmentMemo(
        id=uuid.uuid4(), startup_id=startup.id, author_id=bo_user.id,
        version=1, overview="o", team_assessment="t", market_assessment="m",
        tech_product_assessment="tp", traction="tr", risks="r",
        value_add_points="v", proposed_terms={}, post_investment_plan="p",
    )
    db.add(memo)
    await db.flush()

    from app.enums import ICDecisionType
    ic = ICDecision(
        id=uuid.uuid4(), startup_id=startup.id, memo_id=memo.id,
        decision=ICDecisionType.APPROVED, attendees=["파트너A"],
    )
    db.add(ic)
    await db.commit()
    await db.refresh(ic)
    return ic


@pytest_asyncio.fixture
def contract_payload(startup, ic_decision):
    return {
        "startup_id": str(startup.id),
        "ic_decision_id": str(ic_decision.id),
        "investment_amount": 300000000,
        "pre_money_valuation": 5000000000,
        "equity_pct": "10.0000",
        "vehicle": "rcps",
    }


# --- POST ---

@pytest.mark.asyncio
async def test_create_contract(client: AsyncClient, bo_user, contract_payload):
    res = await client.post(
        "/api/v1/contracts/",
        json=contract_payload,
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "ic_received"
    assert body["investment_amount"] == 300000000
    assert body["closing_checklist"] is not None
    assert len(body["closing_checklist"]) == 10


# --- GET ---

@pytest.mark.asyncio
async def test_list_contracts(client: AsyncClient, bo_user, startup, contract_payload):
    await client.post("/api/v1/contracts/", json=contract_payload, headers=make_auth_header(bo_user.id))
    res = await client.get(f"/api/v1/contracts/?startup_id={startup.id}", headers=make_auth_header(bo_user.id))
    assert res.status_code == 200
    assert len(res.json()) == 1


@pytest.mark.asyncio
async def test_get_contract_detail(client: AsyncClient, bo_user, contract_payload):
    create_res = await client.post("/api/v1/contracts/", json=contract_payload, headers=make_auth_header(bo_user.id))
    cid = create_res.json()["id"]
    res = await client.get(f"/api/v1/contracts/{cid}", headers=make_auth_header(bo_user.id))
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_get_contract_not_found(client: AsyncClient, bo_user):
    res = await client.get(f"/api/v1/contracts/{uuid.uuid4()}", headers=make_auth_header(bo_user.id))
    assert res.status_code == 404


# --- PATCH + 자동화 #5 ---

@pytest.mark.asyncio
async def test_update_contract_status(client: AsyncClient, bo_user, contract_payload):
    create_res = await client.post("/api/v1/contracts/", json=contract_payload, headers=make_auth_header(bo_user.id))
    cid = create_res.json()["id"]
    res = await client.patch(
        f"/api/v1/contracts/{cid}",
        json={"status": "term_sheet"},
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "term_sheet"


@pytest.mark.asyncio
async def test_closing_checklist_auto_complete(client: AsyncClient, bo_user, contract_payload):
    """자동화 #5: 10항목 전체 completed → closed_at + status COMPLETED"""
    create_res = await client.post("/api/v1/contracts/", json=contract_payload, headers=make_auth_header(bo_user.id))
    cid = create_res.json()["id"]
    checklist = create_res.json()["closing_checklist"]

    completed = {k: "completed" for k in checklist}
    res = await client.patch(
        f"/api/v1/contracts/{cid}",
        json={"closing_checklist": completed},
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "completed"
    assert res.json()["closed_at"] is not None


# --- RBAC ---

@pytest.mark.asyncio
async def test_rbac_review_cannot_create_contract(client: AsyncClient, db, contract_payload):
    review_user = await create_test_user(db, role="analyst", team="review")
    res = await client.post("/api/v1/contracts/", json=contract_payload, headers=make_auth_header(review_user.id))
    assert res.status_code == 403

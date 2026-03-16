"""조합(Fund) API 통합 테스트 — Fund + LP + Investment"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_startup, create_test_user, make_auth_header


@pytest_asyncio.fixture
async def bo_user(db: AsyncSession):
    return await create_test_user(db, role="backoffice", team="backoffice")


@pytest_asyncio.fixture
async def startup(db: AsyncSession, bo_user):
    return await create_test_startup(db, manager_id=bo_user.id)


@pytest_asyncio.fixture
def fund_payload():
    return {
        "fund_name": "테스트 1호 조합",
        "fund_type": "individual_union",
        "total_amount": 5000000000,
        "formation_date": "2026-01-15",
        "gp_entity": "eLSA 파트너스",
    }


# --- Fund CRUD ---

@pytest.mark.asyncio
async def test_create_fund(client: AsyncClient, bo_user, fund_payload):
    res = await client.post("/api/v1/funds/", json=fund_payload, headers=make_auth_header(bo_user.id))
    assert res.status_code == 201
    body = res.json()
    assert body["fund_name"] == "테스트 1호 조합"
    assert body["remaining_amount"] == 5000000000
    assert body["status"] == "forming"


@pytest.mark.asyncio
async def test_list_funds(client: AsyncClient, bo_user, fund_payload):
    await client.post("/api/v1/funds/", json=fund_payload, headers=make_auth_header(bo_user.id))
    res = await client.get("/api/v1/funds/", headers=make_auth_header(bo_user.id))
    assert res.status_code == 200
    assert len(res.json()) >= 1


@pytest.mark.asyncio
async def test_update_fund(client: AsyncClient, bo_user, fund_payload):
    create_res = await client.post("/api/v1/funds/", json=fund_payload, headers=make_auth_header(bo_user.id))
    fid = create_res.json()["id"]
    res = await client.patch(
        f"/api/v1/funds/{fid}",
        json={"status": "active"},
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "active"


# --- LP ---

@pytest.mark.asyncio
async def test_create_fund_lp(client: AsyncClient, bo_user, fund_payload):
    fund_res = await client.post("/api/v1/funds/", json=fund_payload, headers=make_auth_header(bo_user.id))
    fid = fund_res.json()["id"]
    res = await client.post(
        f"/api/v1/funds/{fid}/lps/",
        json={"lp_name": "김투자", "lp_type": "individual", "committed_amount": 100000000},
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 201
    assert res.json()["lp_name"] == "김투자"


@pytest.mark.asyncio
async def test_list_fund_lps(client: AsyncClient, bo_user, fund_payload):
    fund_res = await client.post("/api/v1/funds/", json=fund_payload, headers=make_auth_header(bo_user.id))
    fid = fund_res.json()["id"]
    await client.post(
        f"/api/v1/funds/{fid}/lps/",
        json={"lp_name": "LP1", "lp_type": "corporate", "committed_amount": 200000000},
        headers=make_auth_header(bo_user.id),
    )
    res = await client.get(f"/api/v1/funds/{fid}/lps/", headers=make_auth_header(bo_user.id))
    assert res.status_code == 200
    assert len(res.json()) == 1


# --- Fund Investment ---

@pytest.mark.asyncio
async def test_create_fund_investment(client: AsyncClient, bo_user, fund_payload, startup):
    fund_res = await client.post("/api/v1/funds/", json=fund_payload, headers=make_auth_header(bo_user.id))
    fid = fund_res.json()["id"]
    res = await client.post(
        f"/api/v1/funds/{fid}/investments/",
        json={
            "startup_id": str(startup.id),
            "amount": 300000000,
            "invested_at": "2026-03-17",
        },
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 201
    assert res.json()["amount"] == 300000000

    # Fund deployed/remaining 자동 업데이트 확인
    fund_detail = await client.get(f"/api/v1/funds/{fid}", headers=make_auth_header(bo_user.id))
    assert fund_detail.json()["deployed_amount"] == 300000000
    assert fund_detail.json()["remaining_amount"] == 5000000000 - 300000000


# --- RBAC ---

@pytest.mark.asyncio
async def test_rbac_sourcing_cannot_access_funds(client: AsyncClient, db, fund_payload):
    sourcing_user = await create_test_user(db, role="analyst", team="sourcing")
    res = await client.get("/api/v1/funds/", headers=make_auth_header(sourcing_user.id))
    assert res.status_code == 403

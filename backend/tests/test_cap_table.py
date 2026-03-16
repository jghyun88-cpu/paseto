"""Cap Table API 통합 테스트 — 3개 엔드포인트"""

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
def cap_payload(startup):
    return {
        "startup_id": str(startup.id),
        "shareholder_name": "액셀러레이터",
        "share_type": "rcps",
        "shares": 10000,
        "ownership_pct": "10.0000",
        "investment_amount": 300000000,
        "round_name": "Seed",
    }


@pytest.mark.asyncio
async def test_create_cap_table_entry(client: AsyncClient, bo_user, cap_payload):
    res = await client.post("/api/v1/cap-table/", json=cap_payload, headers=make_auth_header(bo_user.id))
    assert res.status_code == 201
    assert res.json()["shareholder_name"] == "액셀러레이터"
    assert res.json()["shares"] == 10000


@pytest.mark.asyncio
async def test_list_cap_table(client: AsyncClient, bo_user, startup, cap_payload):
    await client.post("/api/v1/cap-table/", json=cap_payload, headers=make_auth_header(bo_user.id))
    res = await client.get(f"/api/v1/cap-table/?startup_id={startup.id}", headers=make_auth_header(bo_user.id))
    assert res.status_code == 200
    assert len(res.json()) == 1


@pytest.mark.asyncio
async def test_update_cap_table_entry(client: AsyncClient, bo_user, cap_payload):
    create_res = await client.post("/api/v1/cap-table/", json=cap_payload, headers=make_auth_header(bo_user.id))
    eid = create_res.json()["id"]
    res = await client.patch(
        f"/api/v1/cap-table/{eid}",
        json={"shares": 15000},
        headers=make_auth_header(bo_user.id),
    )
    assert res.status_code == 200
    assert res.json()["shares"] == 15000


@pytest.mark.asyncio
async def test_rbac_review_can_read_cap_table(client: AsyncClient, db, startup, cap_payload, bo_user):
    """review팀은 cap_table read 권한 있음"""
    await client.post("/api/v1/cap-table/", json=cap_payload, headers=make_auth_header(bo_user.id))
    review_user = await create_test_user(db, role="analyst", team="review")
    res = await client.get(f"/api/v1/cap-table/?startup_id={startup.id}", headers=make_auth_header(review_user.id))
    assert res.status_code == 200

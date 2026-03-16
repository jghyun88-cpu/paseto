"""심사(Review) API 통합 테스트 — 4개 엔드포인트"""

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
async def review_payload(startup):
    return {
        "startup_id": str(startup.id),
        "review_type": "document",
        "team_score": 4,
        "problem_score": 5,
        "solution_score": 3,
        "market_score": 4,
        "traction_score": 3,
        "overall_verdict": "proceed",
    }


# --- POST /api/v1/reviews/ ---

@pytest.mark.asyncio
async def test_create_review(client: AsyncClient, review_user, review_payload):
    """서류심사 생성 — 201 + 필드 일치"""
    res = await client.post(
        "/api/v1/reviews/",
        json=review_payload,
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["review_type"] == "document"
    assert body["team_score"] == 4
    assert body["overall_verdict"] == "proceed"
    assert body["reviewer_id"] == str(review_user.id)


@pytest.mark.asyncio
async def test_create_review_invalid_startup(client: AsyncClient, review_user):
    """존재하지 않는 스타트업 → 404"""
    payload = {
        "startup_id": str(uuid.uuid4()),
        "review_type": "document",
        "overall_verdict": "reject",
    }
    res = await client.post(
        "/api/v1/reviews/",
        json=payload,
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


# --- GET /api/v1/reviews/ ---

@pytest.mark.asyncio
async def test_list_reviews(client: AsyncClient, review_user, startup, review_payload):
    """목록 조회 — 생성 후 1건 반환"""
    await client.post(
        "/api/v1/reviews/",
        json=review_payload,
        headers=make_auth_header(review_user.id),
    )
    res = await client.get(
        f"/api/v1/reviews/?startup_id={startup.id}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["review_type"] == "document"


@pytest.mark.asyncio
async def test_list_reviews_filter_type(
    client: AsyncClient, review_user, startup, review_payload,
):
    """review_type 필터링 — interview 조회 시 0건"""
    await client.post(
        "/api/v1/reviews/",
        json=review_payload,
        headers=make_auth_header(review_user.id),
    )
    res = await client.get(
        f"/api/v1/reviews/?startup_id={startup.id}&review_type=interview",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert len(res.json()) == 0


# --- GET /api/v1/reviews/{id} ---

@pytest.mark.asyncio
async def test_get_review_detail(client: AsyncClient, review_user, review_payload):
    """상세 조회 — 정상 반환"""
    create_res = await client.post(
        "/api/v1/reviews/",
        json=review_payload,
        headers=make_auth_header(review_user.id),
    )
    review_id = create_res.json()["id"]

    res = await client.get(
        f"/api/v1/reviews/{review_id}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert res.json()["id"] == review_id


@pytest.mark.asyncio
async def test_get_review_not_found(client: AsyncClient, review_user):
    """존재하지 않는 심사 → 404"""
    res = await client.get(
        f"/api/v1/reviews/{uuid.uuid4()}",
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 404


# --- PATCH /api/v1/reviews/{id} ---

@pytest.mark.asyncio
async def test_update_review(client: AsyncClient, review_user, review_payload):
    """심사 수정 — verdict 변경"""
    create_res = await client.post(
        "/api/v1/reviews/",
        json=review_payload,
        headers=make_auth_header(review_user.id),
    )
    review_id = create_res.json()["id"]

    res = await client.patch(
        f"/api/v1/reviews/{review_id}",
        json={"overall_verdict": "concern"},
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert res.json()["overall_verdict"] == "concern"


@pytest.mark.asyncio
async def test_dd_auto_complete(client: AsyncClient, review_user, startup):
    """자동화 #3: DD 10항목 전체 completed → completed_at 자동 설정"""
    dd_checklist = {
        "법인등기": "pending", "주주구조": "pending", "IP귀속": "pending",
        "재무제표": "pending", "소송이력": "pending", "인허가": "pending",
        "핵심계약": "pending", "노무": "pending", "세무": "pending",
        "기술감정": "pending",
    }
    create_res = await client.post(
        "/api/v1/reviews/",
        json={
            "startup_id": str(startup.id),
            "review_type": "dd",
            "dd_checklist": dd_checklist,
            "overall_verdict": "proceed",
        },
        headers=make_auth_header(review_user.id),
    )
    review_id = create_res.json()["id"]
    assert create_res.json()["completed_at"] is None

    # 전부 completed로 업데이트
    completed = {k: "completed" for k in dd_checklist}
    res = await client.patch(
        f"/api/v1/reviews/{review_id}",
        json={"dd_checklist": completed},
        headers=make_auth_header(review_user.id),
    )
    assert res.status_code == 200
    assert res.json()["completed_at"] is not None


# --- RBAC ---

@pytest.mark.asyncio
async def test_rbac_sourcing_cannot_create_review(client: AsyncClient, db, review_payload):
    """RBAC: sourcing팀은 review_dd_memo:full 없음 → 403"""
    sourcing_user = await create_test_user(db, role="analyst", team="sourcing")
    res = await client.post(
        "/api/v1/reviews/",
        json=review_payload,
        headers=make_auth_header(sourcing_user.id),
    )
    assert res.status_code == 403

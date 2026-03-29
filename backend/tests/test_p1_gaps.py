"""P1 테스트 — 5건 통합 (rejected 전환, 수동 인계, 중복 방지, IC 전환, auth 엣지)"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.handover import HandoverDocument
from app.services import deal_flow_service, handover_service
from tests.conftest import create_test_user, create_test_startup, make_auth_header


# --- T5: DealFlow REJECTED 전환 ---

@pytest.mark.asyncio
async def test_move_stage_to_rejected(db: AsyncSession):
    """각 stage에서 REJECTED 전환 정상 동작"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    flow = await deal_flow_service.move_stage(
        db, startup, DealStage.REJECTED, user, notes="리젝트 사유",
    )
    await db.commit()

    assert flow.stage == DealStage.REJECTED
    assert startup.current_deal_stage == DealStage.REJECTED
    assert flow.notes == "리젝트 사유"


# --- T6: 수동 인계 생성 ---

@pytest.mark.asyncio
async def test_create_manual_valid(db: AsyncSession):
    """유효한 type+content → 인계 생성"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    content = {
        "screening_results": {
            "grade": "pass",
            "overall_score": 30.0,
            "risk_notes": "테스트",
        },
        "company_overview": {
            "name": startup.company_name,
            "ceo": startup.ceo_name,
            "industry": startup.industry,
            "stage": startup.stage,
            "one_liner": startup.one_liner,
        },
        "handover_memo": "수동 인계 테스트",
        "key_risks": ["리스크1"],
    }

    handover = await handover_service.create_manual(
        db, startup, user,
        handover_type="sourcing_to_review",
        content=content,
    )
    await db.commit()

    assert handover.from_team == "sourcing"
    assert handover.to_team == "review"
    assert handover.content["handover_memo"] == "수동 인계 테스트"


@pytest.mark.asyncio
async def test_create_manual_invalid_type(db: AsyncSession):
    """잘못된 handover_type → 에러"""
    from fastapi import HTTPException

    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    await db.commit()

    with pytest.raises(HTTPException):
        await handover_service.create_manual(
            db, startup, user,
            handover_type="invalid_type_that_does_not_exist",
            content={"test": True},
        )


# --- T7: 인계 중복 방지 ---

@pytest.mark.asyncio
async def test_handover_duplicate_prevention(db: AsyncSession):
    """미확인 인계 존재 시 동일 경로 인계 재생성 방지"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    await db.commit()

    # 첫 번째 인계 생성 (미확인 상태)
    h1 = HandoverDocument(
        id=uuid.uuid4(),
        startup_id=startup.id,
        from_team="sourcing",
        to_team="review",
        handover_type="sourcing_to_review",
        content={"test": True},
        created_by=user.id,
    )
    db.add(h1)
    await db.commit()

    # 동일 경로로 create_from_screening 시도
    from app.models.screening import Screening

    screening = Screening(
        id=uuid.uuid4(),
        startup_id=startup.id,
        screener_id=user.id,
        fulltime_commitment=5,
        problem_clarity=5,
        tech_differentiation=5,
        market_potential=5,
        initial_validation=5,
        legal_clear=True,
        strategy_fit=5,
        recommendation="pass",
        overall_score=30.0,
        risk_notes="테스트",
        handover_memo="중복 테스트",
    )
    db.add(screening)
    await db.commit()

    result = await handover_service.create_from_screening(db, startup, screening, user)
    await db.commit()

    # 중복 방지: 미확인 인계 존재 → 기존 것 반환, 새로 생성 안 됨
    assert result.id == h1.id  # 기존 인계의 ID와 동일

    all_handovers = (await db.execute(
        select(HandoverDocument).where(
            HandoverDocument.startup_id == startup.id,
            HandoverDocument.handover_type == "sourcing_to_review",
            HandoverDocument.is_deleted == False,  # noqa: E712
        )
    )).scalars().all()
    assert len(all_handovers) == 1  # 중복 방지로 1건만 존재


# --- T8: IC 결정 → DealStage 자동 전환 ---

@pytest.mark.asyncio
async def test_ic_approved_transitions_stage(db: AsyncSession):
    """IC approved → DealStage.APPROVED 자동 전환 (서비스 레벨)"""
    from app.models.investment_memo import InvestmentMemo
    from app.schemas.ic_decision import ICDecisionCreate
    from app.services import ic_decision_service

    user = await create_test_user(db, role="analyst", team="review")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.IC_REVIEW
    await db.commit()

    memo = InvestmentMemo(
        id=uuid.uuid4(),
        startup_id=startup.id,
        author_id=user.id,
        version=1,
        overview="개요",
        team_assessment="팀",
        market_assessment="시장",
        tech_product_assessment="기술",
        traction="트랙션",
        risks="리스크",
        value_add_points="기여",
        proposed_terms={},
        post_investment_plan="계획",
    )
    db.add(memo)
    await db.commit()

    data = ICDecisionCreate(
        startup_id=startup.id,
        memo_id=memo.id,
        decision="approved",
        conditions="없음",
        attendees=["파트너A", "파트너B"],
        notes="만장일치",
    )
    ic = await ic_decision_service.create(db, startup, memo, user, data)
    await db.commit()

    assert ic.decision.value == "approved"

    await db.refresh(startup)
    assert startup.current_deal_stage == DealStage.APPROVED


# --- T9: Auth 엣지 케이스 ---

@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    """미존재 이메일 로그인 → 401"""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nowhere.com", "password": "anything"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db: AsyncSession):
    """비활성 사용자 로그인 → 401"""
    from app.services.user_service import hash_password

    user = await create_test_user(db, role="analyst", team="review", email="inactive@test.com")
    user.hashed_password = hash_password("test1234")
    user.is_active = False
    await db.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@test.com", "password": "test1234"},
    )
    assert response.status_code == 403

"""P0-T2+T3: 스크리닝 서비스 create() + 점수 경계값 테스트"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.handover import HandoverDocument
from app.services import screening_service
from app.services.screening_service import calculate_score_and_grade
from tests.conftest import create_test_user, create_test_startup


# --- P0-T3: 점수 경계값 단위 테스트 ---

def test_score_boundary_30_pass():
    """score=30 → pass"""
    score, grade = calculate_score_and_grade(5, 5, 5, 5, 5, True, 5)
    # 5*6 + 5(legal) = 35
    assert grade == "pass"
    assert score == 35.0


def test_score_boundary_exact_30():
    """정확히 30점 → pass"""
    score, grade = calculate_score_and_grade(5, 5, 5, 5, 5, True, 0)
    # 5*5 + 5(legal) = 30
    assert grade == "pass"
    assert score == 30.0


def test_score_boundary_29_review():
    """score=29 → review"""
    score, grade = calculate_score_and_grade(5, 5, 5, 5, 4, True, 0)
    # 5*4 + 4 + 5(legal) = 29
    assert grade == "review"
    assert score == 29.0


def test_score_boundary_20_review():
    """score=20 → review"""
    score, grade = calculate_score_and_grade(4, 3, 3, 3, 2, True, 0)
    # 4+3+3+3+2+0+5 = 20
    assert grade == "review"
    assert score == 20.0


def test_score_boundary_19_reject():
    """score=19 → reject"""
    score, grade = calculate_score_and_grade(4, 3, 3, 3, 1, True, 0)
    # 4+3+3+3+1+0+5 = 19
    assert grade == "reject"
    assert score == 19.0


def test_score_legal_false():
    """legal_clear=False → 5점 감산"""
    score, grade = calculate_score_and_grade(5, 5, 5, 5, 5, False, 5)
    # 5*6 + 0 = 30
    assert grade == "pass"
    assert score == 30.0


# --- P0-T2: screening_service.create() 통합 테스트 ---

@pytest.mark.asyncio
async def test_screening_create_pass_triggers_handover(db: AsyncSession):
    """pass 등급 + handover_to_review=True → 인계문서 자동 생성 + FIRST_SCREENING 전환"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.INBOUND
    await db.commit()

    screening = await screening_service.create(
        db, startup, user,
        fulltime_commitment=5, problem_clarity=5, tech_differentiation=5,
        market_potential=5, initial_validation=5, legal_clear=True, strategy_fit=5,
        risk_notes="테스트 리스크", handover_memo="심사팀 인계 요청",
        handover_to_review=True,
    )
    await db.commit()

    # 점수 계산 확인
    assert screening.recommendation == "pass"
    assert screening.overall_score == 35.0

    # INBOUND → FIRST_SCREENING 자동 전환
    await db.refresh(startup)
    assert startup.current_deal_stage == DealStage.FIRST_SCREENING

    # 인계문서 생성 확인
    handovers = (await db.execute(
        select(HandoverDocument).where(
            HandoverDocument.startup_id == startup.id,
            HandoverDocument.handover_type == "sourcing_to_review",
        )
    )).scalars().all()
    assert len(handovers) == 1
    assert handovers[0].content["screening_results"]["grade"] == "pass"


@pytest.mark.asyncio
async def test_screening_create_reject_no_handover(db: AsyncSession):
    """reject 등급 → 인계문서 미생성"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.INBOUND
    await db.commit()

    screening = await screening_service.create(
        db, startup, user,
        fulltime_commitment=1, problem_clarity=1, tech_differentiation=1,
        market_potential=1, initial_validation=1, legal_clear=False, strategy_fit=1,
        risk_notes="낮은 점수", handover_memo=None,
        handover_to_review=False,
    )
    await db.commit()

    # reject 확인
    assert screening.recommendation == "reject"

    # 인계문서 없음 확인
    handovers = (await db.execute(
        select(HandoverDocument).where(
            HandoverDocument.startup_id == startup.id,
        )
    )).scalars().all()
    assert len(handovers) == 0

"""P0-T4: 인계 수신확인 시 자동 단계 전환 테스트"""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.handover import HandoverDocument
from app.services import handover_service
from tests.conftest import create_test_user, create_test_startup


@pytest.mark.asyncio
async def test_acknowledge_sourcing_to_review_triggers_deep_review(db: AsyncSession):
    """sourcing_to_review 인계 수신확인 → FIRST_SCREENING → DEEP_REVIEW 자동 전환"""
    sourcing_user = await create_test_user(db, role="analyst", team="sourcing")
    review_user = await create_test_user(db, role="analyst", team="review")
    startup = await create_test_startup(db, manager_id=sourcing_user.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    # 인계문서 생성
    handover = HandoverDocument(
        id=uuid.uuid4(),
        startup_id=startup.id,
        from_team="sourcing",
        to_team="review",
        handover_type="sourcing_to_review",
        content={"test": True},
        created_by=sourcing_user.id,
    )
    db.add(handover)
    await db.commit()

    # 수신확인 — acknowledge는 HandoverDocument 객체를 받음
    result = await handover_service.acknowledge(db, handover, review_user)
    await db.commit()

    # 수신확인 필드 검증
    assert result.acknowledged_by == review_user.id
    assert result.acknowledged_at is not None

    # DEEP_REVIEW 자동 전환 확인
    await db.refresh(startup)
    assert startup.current_deal_stage == DealStage.DEEP_REVIEW


@pytest.mark.asyncio
async def test_acknowledge_already_at_target_no_transition(db: AsyncSession):
    """이미 DEEP_REVIEW 상태면 중복 전환 안 함"""
    sourcing_user = await create_test_user(db, role="analyst", team="sourcing")
    review_user = await create_test_user(db, role="analyst", team="review")
    startup = await create_test_startup(db, manager_id=sourcing_user.id)
    startup.current_deal_stage = DealStage.DEEP_REVIEW  # 이미 목표 단계
    await db.commit()

    handover = HandoverDocument(
        id=uuid.uuid4(),
        startup_id=startup.id,
        from_team="sourcing",
        to_team="review",
        handover_type="sourcing_to_review",
        content={"test": True},
        created_by=sourcing_user.id,
    )
    db.add(handover)
    await db.commit()

    result = await handover_service.acknowledge(db, handover, review_user)
    await db.commit()

    # 수신확인은 성공
    assert result.acknowledged_by == review_user.id

    # 단계는 변하지 않음
    await db.refresh(startup)
    assert startup.current_deal_stage == DealStage.DEEP_REVIEW

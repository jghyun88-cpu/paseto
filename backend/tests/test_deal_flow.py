"""딜플로우 서비스 테스트 — 단계 전환, 유효성 검증, 자동 인계 트리거"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.services import deal_flow_service
from tests.conftest import create_test_user, create_test_startup


@pytest.mark.asyncio
async def test_move_stage_happy_path(db: AsyncSession):
    """정상 단계 전환: INBOUND → FIRST_SCREENING"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.INBOUND
    await db.commit()

    flow = await deal_flow_service.move_stage(db, startup, DealStage.FIRST_SCREENING, user)
    await db.commit()

    assert flow.stage == DealStage.FIRST_SCREENING
    assert startup.current_deal_stage == DealStage.FIRST_SCREENING


@pytest.mark.asyncio
async def test_move_stage_invalid_transition(db: AsyncSession):
    """비정상 전환: INBOUND → IC_REVIEW 시 에러 발생"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.INBOUND
    await db.commit()

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await deal_flow_service.move_stage(db, startup, DealStage.IC_REVIEW, user)
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_move_stage_full_pipeline(db: AsyncSession):
    """전체 파이프라인: INBOUND → FIRST_SCREENING → DEEP_REVIEW"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.INBOUND
    await db.commit()

    await deal_flow_service.move_stage(db, startup, DealStage.FIRST_SCREENING, user)
    await db.commit()

    await deal_flow_service.move_stage(db, startup, DealStage.DEEP_REVIEW, user)
    await db.commit()

    assert startup.current_deal_stage == DealStage.DEEP_REVIEW

    # 이력 확인
    history = await deal_flow_service.get_by_startup(db, startup.id)
    assert len(history) == 2


@pytest.mark.asyncio
async def test_move_stage_approved_triggers_handover(db: AsyncSession):
    """IC 승인 시 review→backoffice 인계 자동 생성"""
    user = await create_test_user(db, role="partner", team="review")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.IC_REVIEW
    await db.commit()

    await deal_flow_service.move_stage(db, startup, DealStage.APPROVED, user)
    await db.commit()

    # 인계 문서 생성 확인
    from sqlalchemy import select
    from app.models.handover import HandoverDocument
    result = await db.execute(
        select(HandoverDocument).where(
            HandoverDocument.startup_id == startup.id,
            HandoverDocument.handover_type == "review_to_backoffice",
        )
    )
    handover = result.scalar_one_or_none()
    assert handover is not None

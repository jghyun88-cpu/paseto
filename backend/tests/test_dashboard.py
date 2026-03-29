"""P0-T1: 대시보드 서비스 테스트 — SQL 집계 쿼리 검증"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.services import dashboard_service
from tests.conftest import create_test_user, create_test_startup


@pytest.mark.asyncio
async def test_executive_dashboard_pipeline_counts(db: AsyncSession):
    """딜 4건(각 다른 stage) → 파이프라인 카운트 일치"""
    user = await create_test_user(db, role="partner", team="review")

    stages = [
        DealStage.FIRST_SCREENING,
        DealStage.DEEP_REVIEW,
        DealStage.APPROVED,
        DealStage.INBOUND,
    ]
    for stage in stages:
        s = await create_test_startup(db, manager_id=user.id)
        s.current_deal_stage = stage
    await db.commit()

    result = await dashboard_service.get_executive_dashboard(db)

    assert result.deal_pipeline.total == 4
    # FIRST_SCREENING + DEEP_REVIEW = 2건 in_screening
    assert result.deal_pipeline.in_screening == 2
    # APPROVED = 1건 in_contract
    assert result.deal_pipeline.in_contract == 1
    assert result.deal_pipeline.portfolio == 0


@pytest.mark.asyncio
async def test_executive_dashboard_empty(db: AsyncSession):
    """데이터 없을 때 0 반환 (null 에러 없음)"""
    result = await dashboard_service.get_executive_dashboard(db)

    assert result.deal_pipeline.total == 0
    assert result.deal_pipeline.in_screening == 0
    assert result.deal_pipeline.in_contract == 0
    assert result.deal_pipeline.portfolio == 0
    assert result.monthly_sourcing == 0
    assert result.unacknowledged_handovers == 0
    assert result.crisis_alerts == []
    assert result.upcoming_meetings == []
    assert result.recent_handovers == []


@pytest.mark.asyncio
async def test_executive_dashboard_unack_handovers(db: AsyncSession):
    """미확인 인계 카운트 정확성"""
    from app.models.handover import HandoverDocument

    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)

    # 미확인 인계 2건
    for _ in range(2):
        h = HandoverDocument(
            startup_id=startup.id,
            from_team="sourcing",
            to_team="review",
            handover_type="sourcing_to_review",
            content={"test": True},
            created_by=user.id,
        )
        db.add(h)

    # 확인된 인계 1건
    h_ack = HandoverDocument(
        startup_id=startup.id,
        from_team="sourcing",
        to_team="review",
        handover_type="sourcing_to_review",
        content={"test": True},
        created_by=user.id,
        acknowledged_by=user.id,
    )
    db.add(h_ack)
    await db.commit()

    result = await dashboard_service.get_executive_dashboard(db)
    assert result.unacknowledged_handovers == 2

"""스크리닝 서비스 테스트 — 생성 + 자동 인계 생성"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.handover import HandoverDocument
from app.models.screening import Screening
from app.services import screening_service
from tests.conftest import create_test_user, create_test_startup


@pytest.mark.asyncio
async def test_create_screening_triggers_handover(db: AsyncSession):
    """스크리닝 완료 시 sourcing_to_review 인계 자동 생성"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    # 스크리닝 생성 (서비스 함수가 인계도 트리거)
    screening = Screening(
        startup_id=startup.id,
        screener_id=user.id,
        recommendation="pass",
        overall_score=85,
        tech_score=90,
        market_score=80,
        team_score=85,
        risk_notes="낮은 리스크",
    )
    db.add(screening)
    await db.commit()
    await db.refresh(screening)

    # create_from_screening 직접 호출 (screening_service.create가 내부에서 호출)
    from app.services.handover_service import create_from_screening
    await create_from_screening(db, startup, screening, user)
    await db.commit()

    # 인계 문서 확인
    result = await db.execute(
        select(HandoverDocument).where(
            HandoverDocument.startup_id == startup.id,
            HandoverDocument.handover_type == "sourcing_to_review",
        )
    )
    handover = result.scalar_one_or_none()
    assert handover is not None
    assert handover.content["screening_results"]["overall_score"] == 85


@pytest.mark.asyncio
async def test_screening_content_included_in_handover(db: AsyncSession):
    """인계 문서에 스크리닝 결과가 포함되는지 확인"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    screening = Screening(
        startup_id=startup.id,
        screener_id=user.id,
        recommendation="conditional",
        overall_score=65,
        tech_score=70,
        market_score=60,
        team_score=65,
        risk_notes="기술 검증 필요\n시장 규모 불확실",
        handover_memo="기술팀과 추가 미팅 권장",
    )
    db.add(screening)
    await db.commit()
    await db.refresh(screening)

    from app.services.handover_service import create_from_screening
    doc = await create_from_screening(db, startup, screening, user)
    await db.commit()

    assert doc.content["screening_results"]["grade"] == "conditional"
    assert doc.content["handover_memo"] == "기술팀과 추가 미팅 권장"
    assert len(doc.content["key_risks"]) <= 3

"""인계 서비스 테스트 — 수신확인, 중복 방지, 수동 생성"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.handover import HandoverDocument
from app.services import handover_service
from tests.conftest import create_test_user, create_test_startup


async def _create_handover(
    db: AsyncSession,
    startup_id,
    user_id,
    handover_type: str = "sourcing_to_review",
) -> HandoverDocument:
    """테스트용 인계 문서 직접 생성"""
    doc = HandoverDocument(
        startup_id=startup_id,
        created_by=user_id,
        handover_type=handover_type,
        content={
            "company_overview": {"name": "테스트 기업"},
            "screening_results": {"grade": "pass", "overall_score": 80},
        },
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@pytest.mark.asyncio
async def test_acknowledge_happy_path(db: AsyncSession):
    """인계 수신확인 정상 처리"""
    sender = await create_test_user(db, role="analyst", team="sourcing")
    receiver = await create_test_user(db, role="analyst", team="review", email="reviewer@test.com")
    startup = await create_test_startup(db, manager_id=sender.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    doc = await _create_handover(db, startup.id, sender.id)

    await handover_service.acknowledge(db, doc, receiver)
    await db.commit()

    await db.refresh(doc)
    assert doc.acknowledged_at is not None
    assert doc.acknowledged_by == receiver.id


@pytest.mark.asyncio
async def test_acknowledge_already_acknowledged(db: AsyncSession):
    """이미 수신확인된 인계 재확인 시 에러"""
    sender = await create_test_user(db, role="analyst", team="sourcing")
    receiver = await create_test_user(db, role="analyst", team="review", email="reviewer@test.com")
    startup = await create_test_startup(db, manager_id=sender.id)
    startup.current_deal_stage = DealStage.FIRST_SCREENING
    await db.commit()

    doc = await _create_handover(db, startup.id, sender.id)
    await handover_service.acknowledge(db, doc, receiver)
    await db.commit()

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await handover_service.acknowledge(db, doc, receiver)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_create_manual_invalid_type(db: AsyncSession):
    """잘못된 인계 타입으로 수동 생성 시 에러"""
    user = await create_test_user(db, role="analyst", team="sourcing")
    startup = await create_test_startup(db, manager_id=user.id)

    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        await handover_service.create_manual(
            db, startup, user, "invalid_type", {"memo": "test"}
        )

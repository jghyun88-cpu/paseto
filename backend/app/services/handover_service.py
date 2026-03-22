"""인계 서비스 — HandoverDocument 생성 + 수신 확인"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.handover import HandoverDocument
from app.models.screening import Screening
from app.models.startup import Startup
from app.models.user import User
from app.services import activity_log_service


async def create_from_screening(
    db: AsyncSession,
    startup: Startup,
    screening: Screening,
    user: User,
) -> HandoverDocument:
    """스크리닝 결과 기반 인계 문서 자동 생성 (sourcing → review)"""
    content = {
        "screening_results": {
            "grade": screening.recommendation,
            "overall_score": screening.overall_score,
            "risk_notes": screening.risk_notes,
        },
        "company_overview": {
            "name": startup.company_name,
            "ceo": startup.ceo_name,
            "industry": startup.industry,
            "stage": startup.stage,
            "one_liner": startup.one_liner,
        },
        "handover_memo": screening.handover_memo,
        "key_risks": (screening.risk_notes or "").split("\n")[:3],
    }

    handover = HandoverDocument(
        startup_id=startup.id,
        from_team="sourcing",
        to_team="review",
        handover_type="sourcing_to_review",
        content=content,
        created_by=user.id,
    )
    db.add(handover)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "handover",
        {"entity": "handover", "from": "sourcing", "to": "review"},
        startup_id=startup.id,
    )

    return handover


async def get_list(
    db: AsyncSession,
    from_team: str | None = None,
    to_team: str | None = None,
) -> list[HandoverDocument]:
    query = select(HandoverDocument).where(HandoverDocument.is_deleted == False).order_by(HandoverDocument.created_at.desc())  # noqa: E712
    if from_team:
        query = query.where(HandoverDocument.from_team == from_team)
    if to_team:
        query = query.where(HandoverDocument.to_team == to_team)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, handover_id: uuid.UUID,
) -> HandoverDocument | None:
    result = await db.execute(
        select(HandoverDocument).where(HandoverDocument.id == handover_id, HandoverDocument.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def acknowledge(
    db: AsyncSession,
    handover: HandoverDocument,
    user: User,
) -> HandoverDocument:
    """인계 수신 확인 — 이중 확인 방지"""
    if handover.acknowledged_at is not None:
        from app.errors import handover_already_acknowledged
        raise handover_already_acknowledged()

    handover.acknowledged_by = user.id
    handover.acknowledged_at = datetime.now(timezone.utc)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "handover", "action": "acknowledged"},
        startup_id=handover.startup_id,
    )

    await db.commit()
    await db.refresh(handover)
    return handover

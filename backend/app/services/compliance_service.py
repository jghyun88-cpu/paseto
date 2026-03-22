"""컴플라이언스 체크리스트 서비스 — upsert + ActivityLog"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance_checklist import ComplianceChecklist
from app.models.user import User
from app.schemas.compliance import ComplianceChecklistUpdate
from app.services import activity_log_service


async def get_latest(
    db: AsyncSession, checklist_type: str = "default",
) -> ComplianceChecklist | None:
    """최신 체크리스트 1건 조회"""
    result = await db.execute(
        select(ComplianceChecklist)
        .where(
            ComplianceChecklist.checklist_type == checklist_type,
            ComplianceChecklist.is_deleted == False,  # noqa: E712
        )
        .order_by(ComplianceChecklist.updated_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def upsert(
    db: AsyncSession, data: ComplianceChecklistUpdate, user: User,
) -> ComplianceChecklist:
    """체크리스트 upsert — 없으면 생성, 있으면 수정"""
    existing = await get_latest(db, data.checklist_type)

    if existing:
        existing.items = data.items
        existing.user_id = user.id
        await activity_log_service.log(
            db, user.id, "update",
            {"entity": "compliance_checklist", "type": data.checklist_type},
        )
        await db.flush()
        await db.refresh(existing)
        return existing

    checklist = ComplianceChecklist(
        user_id=user.id,
        checklist_type=data.checklist_type,
        items=data.items,
    )
    db.add(checklist)
    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "compliance_checklist", "type": data.checklist_type},
    )
    await db.flush()
    await db.refresh(checklist)
    return checklist

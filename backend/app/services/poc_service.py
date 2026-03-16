"""PoC 서비스 — 생성/상태변경/진행관리 + 자동화 #8 (전환가능성 역인계)"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import NotificationType, PoCStatus
from app.models.partner_demand import PartnerDemand
from app.models.poc_project import PoCProject
from app.models.user import User
from app.schemas.poc_project import PoCProgressUpdate, PoCProjectCreate, PoCProjectUpdate, PoCStatusChange
from app.services import activity_log_service, notification_service


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    startup_id: uuid.UUID | None = None,
    partner_demand_id: uuid.UUID | None = None,
) -> tuple[list[PoCProject], int]:
    query = select(PoCProject).where(PoCProject.is_deleted == False)  # noqa: E712

    if status:
        query = query.where(PoCProject.status == status)
    if startup_id:
        query = query.where(PoCProject.startup_id == startup_id)
    if partner_demand_id:
        query = query.where(PoCProject.partner_demand_id == partner_demand_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(PoCProject.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, poc_id: uuid.UUID) -> PoCProject | None:
    result = await db.execute(
        select(PoCProject).where(
            PoCProject.id == poc_id, PoCProject.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: PoCProjectCreate, user: User) -> PoCProject:
    """PoC 생성 (OI-F02) — PartnerDemand 상태도 업데이트"""
    poc = PoCProject(
        startup_id=data.startup_id,
        partner_demand_id=data.partner_demand_id,
        project_name=data.project_name,
        objective=data.objective,
        scope=data.scope,
        duration_weeks=data.duration_weeks,
        validation_metrics=data.validation_metrics,
        success_criteria=data.success_criteria,
        cost_structure=data.cost_structure,
        data_scope=data.data_scope,
        next_step_if_success=data.next_step_if_success,
        participants=data.participants,
        role_division=data.role_division,
        provided_resources=data.provided_resources,
        key_risks=data.key_risks,
        status=PoCStatus.DEMAND_IDENTIFIED,
    )
    db.add(poc)
    await db.flush()

    # PartnerDemand 상태 → in_poc
    demand_result = await db.execute(
        select(PartnerDemand).where(PartnerDemand.id == data.partner_demand_id)
    )
    demand = demand_result.scalar_one_or_none()
    if demand:
        demand.status = "in_poc"

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "poc_project", "poc_id": str(poc.id)},
        startup_id=data.startup_id,
    )
    await db.commit()
    await db.refresh(poc)
    return poc


async def update(db: AsyncSession, poc: PoCProject, data: PoCProjectUpdate, user: User) -> PoCProject:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(poc, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "poc_project", "fields": list(update_data.keys())},
        startup_id=poc.startup_id,
    )
    await db.commit()
    await db.refresh(poc)
    return poc


async def change_status(
    db: AsyncSession, poc: PoCProject, data: PoCStatusChange, user: User,
) -> PoCProject:
    """PoC 상태 변경"""
    old_status = poc.status
    poc.status = PoCStatus(data.status)

    await activity_log_service.log(
        db, user.id, "status_change",
        {"entity": "poc_project", "old_status": old_status.value, "new_status": data.status, "notes": data.notes},
        startup_id=poc.startup_id,
    )
    await db.commit()
    await db.refresh(poc)
    return poc


async def update_progress(
    db: AsyncSession, poc: PoCProject, data: PoCProgressUpdate, user: User,
) -> PoCProject:
    """PoC 진행 업데이트 (OI-F03) + 자동화 #8"""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(poc, field, value)

    # 자동화 #8: 전환가능성 "높음" → 심사팀 역인계
    if data.conversion_likelihood == "높음":
        await notification_service.notify_team(
            db, "review",
            title=f"전략투자 검토 요청: {poc.project_name}",
            message=f"PoC 전환가능성 '높음' — 실증성과 확인 후 전략투자 검토 요청",
            notification_type=NotificationType.HANDOVER_REQUEST,
            related_entity_type="poc_project",
            related_entity_id=poc.id,
        )

    await activity_log_service.log(
        db, user.id, "progress_update",
        {"entity": "poc_project", "fields": list(update_data.keys()), "conversion_likelihood": data.conversion_likelihood},
        startup_id=poc.startup_id,
    )
    await db.commit()
    await db.refresh(poc)
    return poc

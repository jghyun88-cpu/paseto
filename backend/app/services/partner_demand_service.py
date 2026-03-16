"""파트너 수요 서비스 — 수요 CRUD + 후보 스타트업 매핑"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner_demand import PartnerDemand
from app.models.user import User
from app.schemas.partner_demand import PartnerDemandCreate, PartnerDemandUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    demand_type: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> tuple[list[PartnerDemand], int]:
    query = select(PartnerDemand).where(PartnerDemand.is_deleted == False)  # noqa: E712

    if demand_type:
        query = query.where(PartnerDemand.demand_type == demand_type)
    if status:
        query = query.where(PartnerDemand.status == status)
    if search:
        query = query.where(PartnerDemand.partner_company.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(PartnerDemand.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, demand_id: uuid.UUID) -> PartnerDemand | None:
    result = await db.execute(
        select(PartnerDemand).where(
            PartnerDemand.id == demand_id, PartnerDemand.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: PartnerDemandCreate, user: User) -> PartnerDemand:
    demand = PartnerDemand(**data.model_dump())
    db.add(demand)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "partner_demand", "demand_id": str(demand.id)},
    )
    await db.commit()
    await db.refresh(demand)
    return demand


async def update(db: AsyncSession, demand: PartnerDemand, data: PartnerDemandUpdate, user: User) -> PartnerDemand:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(demand, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "partner_demand", "fields": list(update_data.keys())},
    )
    await db.commit()
    await db.refresh(demand)
    return demand


async def delete(db: AsyncSession, demand: PartnerDemand, user: User) -> None:
    demand.is_deleted = True
    await activity_log_service.log(
        db, user.id, "delete", {"entity": "partner_demand", "demand_id": str(demand.id)},
    )
    await db.commit()

"""조합 관리 서비스 — Fund CRUD + 금액 자동 계산"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fund import Fund
from app.models.user import User
from app.schemas.fund import FundCreate, FundUpdate
from app.services import activity_log_service


async def list_all(db: AsyncSession) -> list[Fund]:
    result = await db.execute(select(Fund).order_by(Fund.created_at.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, fund_id: uuid.UUID) -> Fund | None:
    result = await db.execute(select(Fund).where(Fund.id == fund_id))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: FundCreate, user: User) -> Fund:
    fund = Fund(
        fund_name=data.fund_name,
        fund_type=data.fund_type,
        total_amount=data.total_amount,
        remaining_amount=data.total_amount,
        formation_date=data.formation_date,
        expiry_date=data.expiry_date,
        gp_entity=data.gp_entity,
    )
    db.add(fund)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "fund", "fund_name": data.fund_name},
    )

    await db.commit()
    await db.refresh(fund)
    return fund


async def update(
    db: AsyncSession, fund: Fund, data: FundUpdate, user: User,
) -> Fund:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fund, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "fund", "fund_name": fund.fund_name},
    )

    await db.commit()
    await db.refresh(fund)
    return fund

"""투자메모 서비스 — 9섹션 CRUD + 버전 관리"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.investment_memo import InvestmentMemo
from app.models.startup import Startup
from app.models.user import User
from app.schemas.investment_memo import MemoCreate, MemoUpdate
from app.services import activity_log_service


async def get_by_startup(
    db: AsyncSession, startup_id: uuid.UUID,
) -> list[InvestmentMemo]:
    result = await db.execute(
        select(InvestmentMemo)
        .where(InvestmentMemo.startup_id == startup_id, InvestmentMemo.is_deleted == False)  # noqa: E712
        .order_by(InvestmentMemo.version.desc())
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, memo_id: uuid.UUID,
) -> InvestmentMemo | None:
    result = await db.execute(
        select(InvestmentMemo).where(InvestmentMemo.id == memo_id, InvestmentMemo.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, startup: Startup, user: User, data: MemoCreate,
) -> InvestmentMemo:
    # 버전 자동 산정 (같은 startup의 최신 + 1)
    result = await db.execute(
        select(func.coalesce(func.max(InvestmentMemo.version), 0))
        .where(InvestmentMemo.startup_id == startup.id)
    )
    latest_version = result.scalar_one()

    memo = InvestmentMemo(
        startup_id=startup.id,
        author_id=user.id,
        version=latest_version + 1,
        overview=data.overview,
        team_assessment=data.team_assessment,
        market_assessment=data.market_assessment,
        tech_product_assessment=data.tech_product_assessment,
        traction=data.traction,
        risks=data.risks,
        value_add_points=data.value_add_points,
        proposed_terms=data.proposed_terms,
        post_investment_plan=data.post_investment_plan,
    )
    db.add(memo)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "investment_memo", "version": memo.version},
        startup_id=startup.id,
    )

    await db.refresh(memo)
    return memo


async def update(
    db: AsyncSession, memo: InvestmentMemo, data: MemoUpdate, user: User,
) -> InvestmentMemo:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(memo, field, value)

    db.add(memo)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "investment_memo", "status": memo.status},
        startup_id=memo.startup_id,
    )

    await db.refresh(memo)
    return memo

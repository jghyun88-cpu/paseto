"""조합 LP + 투자 집행 서비스"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fund import Fund, FundInvestment, FundLP
from app.models.user import User
from app.schemas.fund_lp import FundInvestmentCreate, FundLPCreate
from app.services import activity_log_service


async def get_lps_by_fund(
    db: AsyncSession, fund_id: uuid.UUID,
) -> list[FundLP]:
    result = await db.execute(
        select(FundLP).where(FundLP.fund_id == fund_id).order_by(FundLP.created_at.asc())
    )
    return list(result.scalars().all())


async def create_lp(
    db: AsyncSession, fund: Fund, data: FundLPCreate, user: User,
) -> FundLP:
    lp = FundLP(
        fund_id=fund.id,
        lp_name=data.lp_name,
        lp_type=data.lp_type,
        committed_amount=data.committed_amount,
        paid_in_amount=data.paid_in_amount,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        notes=data.notes,
    )
    db.add(lp)

    # Fund committed_amount 자동 증가
    fund.committed_amount = fund.committed_amount + data.committed_amount

    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "fund_lp", "lp_name": data.lp_name, "fund": fund.fund_name},
    )

    await db.commit()
    await db.refresh(lp)
    return lp


async def get_investments_by_fund(
    db: AsyncSession, fund_id: uuid.UUID,
) -> list[FundInvestment]:
    result = await db.execute(
        select(FundInvestment)
        .where(FundInvestment.fund_id == fund_id)
        .order_by(FundInvestment.invested_at.desc())
    )
    return list(result.scalars().all())


async def create_investment(
    db: AsyncSession, fund: Fund, data: FundInvestmentCreate, user: User,
) -> FundInvestment:
    inv = FundInvestment(
        fund_id=fund.id,
        startup_id=data.startup_id,
        contract_id=data.contract_id,
        amount=data.amount,
        invested_at=data.invested_at,
        notes=data.notes,
    )
    db.add(inv)

    # Fund 금액 자동 재계산
    fund.deployed_amount = fund.deployed_amount + data.amount
    fund.remaining_amount = fund.total_amount - fund.deployed_amount

    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "fund_investment", "amount": data.amount, "fund": fund.fund_name},
    )

    await db.commit()
    await db.refresh(inv)
    return inv

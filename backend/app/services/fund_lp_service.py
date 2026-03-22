"""조합 LP + 투자 집행 서비스"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fund import Fund, FundInvestment, FundLP
from app.models.user import User
from app.schemas.fund_lp import FundInvestmentCreate, FundLPCreate, FundLPSyncItem
from app.services import activity_log_service


async def get_all_lps(
    db: AsyncSession, search: str | None = None,
) -> list[FundLP]:
    stmt = select(FundLP).where(FundLP.is_deleted == False).order_by(FundLP.created_at.desc())  # noqa: E712
    if search:
        from sqlalchemy import or_
        from app.utils.validators import escape_like
        escaped = escape_like(search)
        stmt = stmt.where(
            or_(
                FundLP.lp_name.ilike(f"%{escaped}%", escape="\\"),
                FundLP.contact_name.ilike(f"%{escaped}%", escape="\\"),
            )
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_lps_by_fund(
    db: AsyncSession, fund_id: uuid.UUID,
) -> list[FundLP]:
    result = await db.execute(
        select(FundLP).where(FundLP.fund_id == fund_id, FundLP.is_deleted == False).order_by(FundLP.created_at.asc())  # noqa: E712
    )
    return list(result.scalars().all())


async def create_lp(
    db: AsyncSession, fund: Fund, data: FundLPCreate, user: User,
) -> FundLP:
    lp = FundLP(
        fund_id=fund.id,
        lp_name=data.lp_name,
        lp_type=data.lp_type,
        founded_date=data.founded_date,
        corporate_number=data.corporate_number,
        business_registration_number=data.business_registration_number,
        ceo_name=data.ceo_name,
        current_employees=data.current_employees,
        location=data.location,
        industry=data.industry,
        main_product=data.main_product,
        committed_amount=data.committed_amount,
        paid_in_amount=data.paid_in_amount,
        city=data.city,
        website=data.website,
        contact_name=data.contact_name,
        contact_phone=data.contact_phone,
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

    await db.refresh(lp)
    return lp


async def sync_lps(
    db: AsyncSession, fund: Fund, items: list[FundLPSyncItem], user: User,
) -> list[FundLP]:
    """기존 LP를 soft delete하고 새 목록으로 교체 (벌크 동기화)"""
    # 1. 기존 LP soft delete
    existing = await get_lps_by_fund(db, fund.id)
    for lp in existing:
        lp.is_deleted = True
        db.add(lp)

    # 2. 새 LP 생성
    new_lps: list[FundLP] = []
    total_committed = 0
    for item in items:
        if not item.lp_name.strip():
            continue
        lp = FundLP(
            fund_id=fund.id,
            lp_name=item.lp_name,
            lp_type="corporate",
            committed_amount=int(item.committed_amount),
            paid_in_amount=0,
        )
        db.add(lp)
        new_lps.append(lp)
        total_committed += int(item.committed_amount)

    # 3. Fund committed_amount 갱신
    fund.committed_amount = total_committed
    db.add(fund)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "fund_lps", "fund": fund.fund_name, "count": len(new_lps)},
    )

    for lp in new_lps:
        await db.refresh(lp)
    return new_lps


async def get_investments_by_fund(
    db: AsyncSession, fund_id: uuid.UUID,
) -> list[FundInvestment]:
    result = await db.execute(
        select(FundInvestment)
        .where(FundInvestment.fund_id == fund_id, FundInvestment.is_deleted == False)  # noqa: E712
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

    await db.refresh(inv)
    return inv

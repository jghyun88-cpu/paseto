"""Cap Table 서비스 — CRUD + 계약 기반 자동 생성"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cap_table import CapTableEntry
from app.models.contract import InvestmentContract
from app.models.user import User
from app.schemas.cap_table import CapTableCreate, CapTableUpdate
from app.services import activity_log_service


async def get_by_startup(
    db: AsyncSession, startup_id: uuid.UUID,
) -> list[CapTableEntry]:
    result = await db.execute(
        select(CapTableEntry)
        .where(CapTableEntry.startup_id == startup_id)
        .order_by(CapTableEntry.created_at.asc())
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, entry_id: uuid.UUID,
) -> CapTableEntry | None:
    result = await db.execute(
        select(CapTableEntry).where(CapTableEntry.id == entry_id)
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: CapTableCreate, user: User,
) -> CapTableEntry:
    entry = CapTableEntry(
        startup_id=data.startup_id,
        shareholder_name=data.shareholder_name,
        share_type=data.share_type,
        shares=data.shares,
        ownership_pct=data.ownership_pct,
        investment_amount=data.investment_amount,
        investment_date=data.investment_date,
        round_name=data.round_name,
        notes=data.notes,
    )
    db.add(entry)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "cap_table", "shareholder": data.shareholder_name},
        startup_id=data.startup_id,
    )

    await db.commit()
    await db.refresh(entry)
    return entry


async def update(
    db: AsyncSession, entry: CapTableEntry, data: CapTableUpdate, user: User,
) -> CapTableEntry:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "cap_table", "shareholder": entry.shareholder_name},
        startup_id=entry.startup_id,
    )

    await db.commit()
    await db.refresh(entry)
    return entry


async def create_from_contract(
    db: AsyncSession, contract: InvestmentContract,
) -> CapTableEntry:
    """자동화 #5 내부 호출: 계약 조건에서 Cap Table 엔트리 자동 생성"""
    entry = CapTableEntry(
        startup_id=contract.startup_id,
        shareholder_name="액셀러레이터 (자동 생성)",
        share_type=contract.vehicle.value,
        shares=0,  # 실제 주식 수는 별도 입력 필요
        ownership_pct=contract.equity_pct,
        investment_amount=contract.investment_amount,
        investment_date=date.today(),
        round_name="Seed",
        notes=f"계약 자동 생성 (contract_id: {contract.id})",
    )
    db.add(entry)
    return entry

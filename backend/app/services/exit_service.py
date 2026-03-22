"""회수 서비스 — 기록 + 7개 체크리스트"""

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import ExitType
from app.models.exit_record import ExitRecord
from app.models.user import User
from app.schemas.exit_record import ExitRecordCreate, ExitRecordUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    startup_id: uuid.UUID | None = None,
    exit_type: str | None = None,
) -> tuple[list[ExitRecord], int]:
    query = select(ExitRecord).where(ExitRecord.is_deleted == False)  # noqa: E712

    if startup_id:
        query = query.where(ExitRecord.startup_id == startup_id)
    if exit_type:
        query = query.where(ExitRecord.exit_type == exit_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(ExitRecord.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, exit_id: uuid.UUID) -> ExitRecord | None:
    result = await db.execute(
        select(ExitRecord).where(
            ExitRecord.id == exit_id, ExitRecord.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: ExitRecordCreate, user: User) -> ExitRecord:
    record = ExitRecord(
        startup_id=data.startup_id,
        exit_type=ExitType(data.exit_type),
        exit_amount=data.exit_amount,
        multiple=Decimal(str(data.multiple)) if data.multiple is not None else None,
        cap_table_clean=data.cap_table_clean,
        preferred_terms_reviewed=data.preferred_terms_reviewed,
        drag_tag_reviewed=data.drag_tag_reviewed,
        ip_ownership_clean=data.ip_ownership_clean,
        accounting_transparent=data.accounting_transparent,
        customer_contracts_stable=data.customer_contracts_stable,
        management_issue_clear=data.management_issue_clear,
        exit_date=data.exit_date,
        notes=data.notes,
    )
    db.add(record)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "exit_record", "id": str(record.id), "exit_type": data.exit_type},
        startup_id=data.startup_id,
    )
    await db.refresh(record)
    return record


async def update(db: AsyncSession, record: ExitRecord, data: ExitRecordUpdate, user: User) -> ExitRecord:
    update_data = data.model_dump(exclude_unset=True)
    if "exit_type" in update_data and update_data["exit_type"] is not None:
        update_data["exit_type"] = ExitType(update_data["exit_type"])
    if "multiple" in update_data and update_data["multiple"] is not None:
        update_data["multiple"] = Decimal(str(update_data["multiple"]))

    for field, value in update_data.items():
        setattr(record, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "exit_record", "fields": list(update_data.keys())},
        startup_id=record.startup_id,
    )
    await db.refresh(record)
    return record

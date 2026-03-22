"""정부사업 서비스 — CRUD + 상태 관리"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.government_program import GovernmentProgram
from app.models.user import User
from app.schemas.government_program import GovProgramCreate, GovProgramUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    startup_id: uuid.UUID | None = None,
    program_type: str | None = None,
    status: str | None = None,
) -> tuple[list[GovernmentProgram], int]:
    query = select(GovernmentProgram).where(GovernmentProgram.is_deleted == False)  # noqa: E712

    if startup_id:
        query = query.where(GovernmentProgram.startup_id == startup_id)
    if program_type:
        query = query.where(GovernmentProgram.program_type == program_type)
    if status:
        query = query.where(GovernmentProgram.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(GovernmentProgram.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, program_id: uuid.UUID) -> GovernmentProgram | None:
    result = await db.execute(
        select(GovernmentProgram).where(
            GovernmentProgram.id == program_id, GovernmentProgram.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: GovProgramCreate, user: User) -> GovernmentProgram:
    program = GovernmentProgram(**data.model_dump())
    db.add(program)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "government_program", "id": str(program.id)},
        startup_id=data.startup_id,
    )
    await db.refresh(program)
    return program


async def update(db: AsyncSession, program: GovernmentProgram, data: GovProgramUpdate, user: User) -> GovernmentProgram:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(program, field, value)

    db.add(program)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "government_program", "fields": list(update_data.keys())},
        startup_id=program.startup_id,
    )
    await db.refresh(program)
    return program


async def delete(db: AsyncSession, program: GovernmentProgram, user: User) -> None:
    program.is_deleted = True
    db.add(program)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "delete", {"entity": "government_program", "id": str(program.id)},
        startup_id=program.startup_id,
    )

"""LP(출자자) 서비스 — CRUD"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lp import LP
from app.models.user import User
from app.schemas.lp import LPCreate, LPUpdate
from app.services import activity_log_service


async def list_all(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[list[LP], int]:
    stmt = select(LP).where(LP.is_deleted == False)  # noqa: E712
    count_stmt = select(func.count()).select_from(LP).where(LP.is_deleted == False)  # noqa: E712

    if search:
        from sqlalchemy import or_
        from app.utils.validators import escape_like
        escaped = f"%{escape_like(search)}%"
        like_filter = or_(
            LP.lp_name.ilike(escaped, escape="\\"),
            LP.ceo_name.ilike(escaped, escape="\\"),
            LP.corporate_number.ilike(escaped, escape="\\"),
            LP.business_registration_number.ilike(escaped, escape="\\"),
        )
        stmt = stmt.where(like_filter)
        count_stmt = count_stmt.where(like_filter)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(LP.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, lp_id: uuid.UUID) -> LP | None:
    result = await db.execute(
        select(LP).where(LP.id == lp_id, LP.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: LPCreate, user: User) -> LP:
    lp = LP(**data.model_dump())
    db.add(lp)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "lp", "lp_name": data.lp_name},
    )

    await db.commit()
    await db.refresh(lp)
    return lp


async def update(db: AsyncSession, lp: LP, data: LPUpdate, user: User) -> LP:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lp, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "lp", "lp_name": lp.lp_name},
    )

    await db.commit()
    await db.refresh(lp)
    return lp


async def soft_delete(db: AsyncSession, lp: LP, user: User) -> None:
    lp.is_deleted = True
    await activity_log_service.log(
        db, user.id, "delete",
        {"entity": "lp", "lp_name": lp.lp_name},
    )
    await db.commit()

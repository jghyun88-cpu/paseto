"""멘토 풀 관리 서비스 — CRUD"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mentor import Mentor
from app.models.user import User
from app.schemas.mentor import MentorCreate, MentorUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    is_active: bool | None = None,
    mentor_type: str | None = None,
    expertise: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Mentor], int]:
    query = select(Mentor).where(Mentor.is_deleted == False)  # noqa: E712

    if is_active is not None:
        query = query.where(Mentor.is_active == is_active)
    if mentor_type:
        query = query.where(Mentor.mentor_type == mentor_type)
    if expertise:
        # JSON 배열에서 검색 (PostgreSQL)
        query = query.where(Mentor.expertise_areas.op("@>")(f'["{expertise}"]'))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(Mentor.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(
    db: AsyncSession, mentor_id: uuid.UUID,
) -> Mentor | None:
    result = await db.execute(
        select(Mentor).where(Mentor.id == mentor_id, Mentor.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: MentorCreate, user: User,
) -> Mentor:
    mentor = Mentor(
        name=data.name,
        company=data.company,
        title=data.title,
        mentor_type=data.mentor_type,
        expertise_areas=data.expertise_areas,
        industry_tags=data.industry_tags,
        functional_area=data.functional_area,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        availability=data.availability,
        notes=data.notes,
    )
    db.add(mentor)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "mentor", "mentor_id": str(mentor.id)},
    )

    await db.commit()
    await db.refresh(mentor)
    return mentor


async def update(
    db: AsyncSession, mentor: Mentor, data: MentorUpdate, user: User,
) -> Mentor:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mentor, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "mentor", "fields": list(update_data.keys())},
    )

    await db.commit()
    await db.refresh(mentor)
    return mentor

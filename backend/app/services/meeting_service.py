"""회의 서비스 — CRUD + 액션아이템 추적"""

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import MeetingType
from app.models.meeting import Meeting
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    meeting_type: str | None = None,
    startup_id: uuid.UUID | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> tuple[list[Meeting], int]:
    query = select(Meeting).where(Meeting.is_deleted == False)  # noqa: E712

    if meeting_type:
        query = query.where(Meeting.meeting_type == meeting_type)
    if from_date:
        query = query.where(Meeting.scheduled_at >= from_date)
    if to_date:
        query = query.where(Meeting.scheduled_at <= to_date)

    # startup_id 필터: JSON 배열 related_startup_ids에 포함된 미팅만
    if startup_id:
        sid = str(startup_id)
        all_q = query.order_by(Meeting.scheduled_at.desc())
        result = await db.execute(all_q)
        all_meetings = [
            m for m in result.scalars().all()
            if m.related_startup_ids and sid in [str(s) for s in m.related_startup_ids]
        ]
        total = len(all_meetings)
        offset = (page - 1) * page_size
        return all_meetings[offset:offset + page_size], total

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(Meeting.scheduled_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, meeting_id: uuid.UUID) -> Meeting | None:
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: MeetingCreate, user: User) -> Meeting:
    meeting = Meeting(
        meeting_type=MeetingType(data.meeting_type),
        title=data.title,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        attendees=data.attendees,
        agenda_items=data.agenda_items,
        related_startup_ids=data.related_startup_ids,
        created_by=user.id,
    )
    db.add(meeting)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "meeting", "meeting_type": data.meeting_type, "title": data.title},
    )
    await db.refresh(meeting)
    return meeting


async def update(db: AsyncSession, meeting: Meeting, data: MeetingUpdate, user: User) -> Meeting:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)

    db.add(meeting)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "meeting", "fields": list(update_data.keys())},
    )
    await db.refresh(meeting)
    return meeting


async def delete(db: AsyncSession, meeting: Meeting, user: User) -> None:
    meeting.is_deleted = True
    db.add(meeting)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "delete", {"entity": "meeting", "meeting_id": str(meeting.id)},
    )

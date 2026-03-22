"""투자자 미팅 서비스 — 미팅 기록 + outcome 추적"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.investor_meeting import InvestorMeeting
from app.models.user import User
from app.schemas.investor_meeting import InvestorMeetingCreate, InvestorMeetingUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    startup_id: uuid.UUID | None = None,
    demo_day_id: uuid.UUID | None = None,
    outcome: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[InvestorMeeting], int]:
    query = select(InvestorMeeting).where(InvestorMeeting.is_deleted == False)  # noqa: E712

    if startup_id:
        query = query.where(InvestorMeeting.startup_id == startup_id)
    if demo_day_id:
        query = query.where(InvestorMeeting.demo_day_id == demo_day_id)
    if outcome:
        query = query.where(InvestorMeeting.outcome == outcome)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(InvestorMeeting.meeting_date.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(
    db: AsyncSession, meeting_id: uuid.UUID,
) -> InvestorMeeting | None:
    result = await db.execute(
        select(InvestorMeeting).where(
            InvestorMeeting.id == meeting_id,
            InvestorMeeting.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: InvestorMeetingCreate, user: User,
) -> InvestorMeeting:
    meeting = InvestorMeeting(
        startup_id=data.startup_id,
        demo_day_id=data.demo_day_id,
        investor_name=data.investor_name,
        investor_company=data.investor_company,
        investor_type=data.investor_type,
        meeting_date=data.meeting_date,
        meeting_type=data.meeting_type,
        outcome=data.outcome,
        materials_sent=data.materials_sent,
        next_step=data.next_step,
        notes=data.notes,
    )
    db.add(meeting)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "investor_meeting", "meeting_id": str(meeting.id)},
        startup_id=data.startup_id,
    )

    await db.refresh(meeting)
    return meeting


async def update(
    db: AsyncSession, meeting: InvestorMeeting, data: InvestorMeetingUpdate, user: User,
) -> InvestorMeeting:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)

    db.add(meeting)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "investor_meeting", "fields": list(update_data.keys())},
        startup_id=meeting.startup_id,
    )

    await db.refresh(meeting)
    return meeting

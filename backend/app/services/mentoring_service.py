"""멘토링 서비스 — 세션 기록 + 액션아이템 이행률 + 자동 알림 (§18 #6)"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import NotificationType
from app.models.mentor import Mentor
from app.models.mentoring_session import MentoringSession
from app.models.user import User
from app.schemas.mentoring_session import ActionItemsBatchUpdate, MentoringSessionCreate, MentoringSessionUpdate
from app.services import activity_log_service, notification_service


def calculate_completion_rate(action_items: list) -> float:
    """액션아이템 이행률 계산: completed / total * 100"""
    if not action_items:
        return 0.0
    completed = sum(1 for item in action_items if item.get("status") == "completed")
    return round(completed / len(action_items) * 100, 1)


async def get_list(
    db: AsyncSession,
    startup_id: uuid.UUID | None = None,
    mentor_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[MentoringSession], int]:
    query = select(MentoringSession).where(MentoringSession.is_deleted == False)  # noqa: E712

    if startup_id:
        query = query.where(MentoringSession.startup_id == startup_id)
    if mentor_id:
        query = query.where(MentoringSession.mentor_id == mentor_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(MentoringSession.session_date.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(
    db: AsyncSession, session_id: uuid.UUID,
) -> MentoringSession | None:
    result = await db.execute(
        select(MentoringSession).where(
            MentoringSession.id == session_id,
            MentoringSession.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: MentoringSessionCreate, user: User,
) -> MentoringSession:
    """멘토링 기록 생성 (PRG-F03) + 자동화 #6"""
    action_items_raw = [item.model_dump(mode="json") for item in data.action_items]
    completion_rate = calculate_completion_rate(action_items_raw)

    session = MentoringSession(
        startup_id=data.startup_id,
        mentor_id=data.mentor_id,
        mentor_name=data.mentor_name,
        mentor_type=data.mentor_type,
        session_date=data.session_date,
        pre_agenda=data.pre_agenda,
        discussion_summary=data.discussion_summary,
        feedback=data.feedback,
        action_items=action_items_raw,
        next_session_date=data.next_session_date,
        action_completion_rate=completion_rate,
    )
    db.add(session)
    await db.flush()

    # 멘토 참여 횟수 업데이트
    if data.mentor_id:
        mentor_result = await db.execute(
            select(Mentor).where(Mentor.id == data.mentor_id)
        )
        mentor = mentor_result.scalar_one_or_none()
        if mentor:
            mentor.engagement_count += 1
            db.add(mentor)

    # 자동화 #6: 액션아이템 → 보육팀 알림
    for item in action_items_raw:
        await notification_service.notify_team(
            db, "incubation",
            title=f"멘토링 액션아이템: {item['task'][:30]}",
            message=f"담당: {item['owner']}, 기한: {item['deadline']}",
            notification_type=NotificationType.DEADLINE_ALERT,
            related_entity_type="mentoring_session",
            related_entity_id=session.id,
        )

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "mentoring_session", "action_items_count": len(action_items_raw)},
        startup_id=data.startup_id,
    )
    await db.refresh(session)
    return session


async def update(
    db: AsyncSession, session: MentoringSession, data: MentoringSessionUpdate, user: User,
) -> MentoringSession:
    update_data = data.model_dump(exclude_unset=True)

    if "action_items" in update_data and update_data["action_items"] is not None:
        update_data["action_items"] = [
            item.model_dump(mode="json") if hasattr(item, "model_dump") else item
            for item in update_data["action_items"]
        ]
        update_data["action_completion_rate"] = calculate_completion_rate(update_data["action_items"])

    for field, value in update_data.items():
        setattr(session, field, value)

    db.add(session)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "mentoring_session", "fields": list(update_data.keys())},
        startup_id=session.startup_id,
    )
    await db.refresh(session)
    return session


async def update_action_items_status(
    db: AsyncSession, session: MentoringSession, data: ActionItemsBatchUpdate, user: User,
) -> MentoringSession:
    """액션아이템 상태 일괄 변경"""
    items = list(session.action_items)
    for update_item in data.items:
        if 0 <= update_item.index < len(items):
            items[update_item.index]["status"] = update_item.status

    session.action_items = items
    session.action_completion_rate = calculate_completion_rate(items)

    db.add(session)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "mentoring_session", "fields": ["action_items"]},
        startup_id=session.startup_id,
    )
    await db.refresh(session)
    return session

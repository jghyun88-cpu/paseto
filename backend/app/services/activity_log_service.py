"""감사 로그 서비스 — 모든 CUD 작업 자동 기록"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog


async def log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action_type: str,
    action_detail: dict,
    startup_id: uuid.UUID | None = None,
) -> None:
    """활동 로그 기록 — commit은 호출자가 담당"""
    entry = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action_type=action_type,
        action_detail=action_detail,
    )
    db.add(entry)

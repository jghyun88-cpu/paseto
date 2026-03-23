"""인계 에스컬레이션 — 미확인 24h 경과 시 알림"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.enums import NotificationType
from app.models.handover import HandoverDocument
from app.models.notification import Notification
from app.models.user import User
from app.tasks import celery_app

logger = logging.getLogger(__name__)

ALL_TEAMS = ["sourcing", "review", "incubation", "oi", "backoffice"]


@celery_app.task
def check_unacknowledged():
    """미확인 인계 24h 경과 → ESCALATION 알림 + escalated 플래그"""
    from app.database import sync_session_maker

    with sync_session_maker() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        result = db.execute(
            select(HandoverDocument).where(
                HandoverDocument.acknowledged_by.is_(None),
                HandoverDocument.escalated == False,  # noqa: E712
                HandoverDocument.created_at < cutoff,
                HandoverDocument.is_deleted == False,  # noqa: E712
            )
        )
        overdue = list(result.scalars().all())

        if not overdue:
            return {"escalated": 0}

        # 팀별 사용자 캐시 (N+1 해소 — 한 번만 조회)
        all_active_users = db.execute(
            select(User).where(User.is_active == True)  # noqa: E712
        )
        users_by_team: dict[str, list[User]] = {}
        for user in all_active_users.scalars().all():
            users_by_team.setdefault(user.team, []).append(user)

        escalated_count = 0
        for handover in overdue:
            try:
                handover.escalated = True
                handover.escalated_at = datetime.now(timezone.utc)

                to_team = handover.to_team
                target_teams = ALL_TEAMS if to_team == "all" else [to_team]

                for team in target_teams:
                    for user in users_by_team.get(team, []):
                        notif = Notification(
                            user_id=user.id,
                            title="인계 에스컬레이션: 24시간 미확인",
                            message=f"{handover.from_team}→{handover.to_team} 인계가 24시간 이상 미확인 상태입니다.",
                            notification_type=NotificationType.ESCALATION,
                            related_entity_type="handover",
                            related_entity_id=handover.id,
                        )
                        db.add(notif)

                escalated_count += 1
            except Exception:
                logger.exception("에스컬레이션 처리 실패: handover_id=%s", handover.id)

        db.commit()
        return {"escalated": escalated_count}

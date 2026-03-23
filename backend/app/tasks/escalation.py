"""인계 에스컬레이션 — 미확인 24h 경과 시 알림"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.enums import NotificationType
from app.models.handover import HandoverDocument
from app.tasks import celery_app


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
        overdue = result.scalars().all()

        for handover in overdue:
            handover.escalated = True
            handover.escalated_at = datetime.now(timezone.utc)

            # 수신팀(to_team) 소속 사용자 전원에게 에스컬레이션 알림
            from app.models.notification import Notification
            from app.models.user import User

            to_team = handover.to_team
            target_teams = ["sourcing", "review", "incubation", "oi", "backoffice"] if to_team == "all" else [to_team]

            team_users = db.execute(
                select(User).where(
                    User.team.in_(target_teams),
                    User.is_active == True,  # noqa: E712
                )
            )
            for user in team_users.scalars().all():
                notif = Notification(
                    user_id=user.id,
                    title="인계 에스컬레이션: 24시간 미확인",
                    message=f"{handover.from_team}→{handover.to_team} 인계가 24시간 이상 미확인 상태입니다.",
                    notification_type=NotificationType.ESCALATION,
                    related_entity_type="handover",
                    related_entity_id=handover.id,
                )
                db.add(notif)

        db.commit()
        return {"escalated": len(overdue)}

"""보고 마감 리마인더 — D-7/D-3/당일 자동 알림"""

from datetime import date, timedelta

from sqlalchemy import select

from app.enums import NotificationType
from app.tasks import celery_app


@celery_app.task
def check_deadlines():
    """보고 마감 리마인더 (매일 09:00 실행)

    현재는 간단한 구조 — 추후 Report/OPS-F02 모델 연동 시 확장
    """
    from app.database import sync_session_maker

    with sync_session_maker() as db:
        today = date.today()
        reminder_days = [7, 3, 0]

        # 향후 Report 모델이 구현되면 여기서 deadline 체크
        # 현재는 placeholder — Celery Beat 스케줄 정상 동작 확인용
        return {"checked": True, "date": str(today), "reminder_days": reminder_days}

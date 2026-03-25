from celery import Celery

from app.config import settings

celery_app = Celery(
    "elsa",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.timezone = "Asia/Seoul"
celery_app.conf.enable_utc = False

# Task 모듈 자동 검색
celery_app.autodiscover_tasks(["app.tasks"])

# autodiscover 보완 — 명시적 import
from app.tasks import ai_screening  # noqa: F401, E402
from app.tasks import escalation  # noqa: F401, E402
from app.tasks import crisis_scan  # noqa: F401, E402
from app.tasks import report_reminders  # noqa: F401, E402
from app.tasks import kpi_aggregation  # noqa: F401, E402

# Beat 스케줄 (§20)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "escalation-check-hourly": {
        "task": "app.tasks.escalation.check_unacknowledged",
        "schedule": crontab(minute=0),
    },
    "report-reminder-daily": {
        "task": "app.tasks.report_reminders.check_deadlines",
        "schedule": crontab(hour=9, minute=0),
    },
    "crisis-scan-daily": {
        "task": "app.tasks.crisis_scan.scan_all_portfolios",
        "schedule": crontab(hour=8, minute=0),
    },
    "kpi-aggregation-monthly": {
        "task": "app.tasks.kpi_aggregation.aggregate_all",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),
    },
}

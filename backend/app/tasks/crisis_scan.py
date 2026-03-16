"""위기 신호 스캔 — 전체 포트폴리오 매일 08:00"""

from sqlalchemy import select

from app.enums import NotificationType
from app.models.incubation import Incubation
from app.models.kpi_record import KPIRecord
from app.tasks import celery_app


@celery_app.task
def scan_all_portfolios():
    """전체 포트폴리오 위기 신호 스캔

    감지 기준:
    - runway_months < 3 → cash_critical
    - KPI 3개월 연속 하락 (kpi_service에서 이미 처리)
    """
    from app.database import sync_session_maker

    with sync_session_maker() as db:
        alerts_generated = 0

        # 활성 포트폴리오 조회
        result = db.execute(
            select(Incubation).where(
                Incubation.is_deleted == False,  # noqa: E712
                Incubation.status == "active",
            )
        )
        incubations = result.scalars().all()

        for inc in incubations:
            # 최신 KPI 조회
            kpi_result = db.execute(
                select(KPIRecord)
                .where(KPIRecord.startup_id == inc.startup_id, KPIRecord.is_deleted == False)  # noqa: E712
                .order_by(KPIRecord.period.desc())
                .limit(1)
            )
            latest_kpi = kpi_result.scalar_one_or_none()

            if not latest_kpi:
                continue

            flags = dict(inc.crisis_flags) if inc.crisis_flags else {
                "cash_critical": False, "key_person_left": False,
                "customer_churn": False, "dev_delay": False, "lawsuit": False,
            }

            updated = False

            # runway < 3개월
            if latest_kpi.runway_months is not None and latest_kpi.runway_months < 3:
                if not flags.get("cash_critical"):
                    flags["cash_critical"] = True
                    updated = True

                    from app.models.notification import Notification
                    notif = Notification(
                        user_id=inc.assigned_pm_id,
                        title=f"위기 감지: 현금고갈 위험",
                        message=f"Runway {latest_kpi.runway_months}개월 — 즉시 대응 필요",
                        notification_type=NotificationType.CRISIS_ALERT,
                        related_entity_type="startup",
                        related_entity_id=inc.startup_id,
                    )
                    db.add(notif)
                    alerts_generated += 1

            if updated:
                inc.crisis_flags = flags

        db.commit()
        return {"scanned": len(incubations), "alerts": alerts_generated}

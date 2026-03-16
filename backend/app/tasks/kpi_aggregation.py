"""KPI 자동 집계 — §19 수식 기반 실제 집계 (매월 1일 02:00)"""

from datetime import date

from sqlalchemy import func, select

from app.models.incubation import Incubation
from app.models.mentoring_session import MentoringSession
from app.models.partner_demand import PartnerDemand
from app.models.poc_project import PoCProject
from app.models.startup import Startup
from app.models.team_kpi import TeamKPI
from app.tasks import celery_app


@celery_app.task
def aggregate_all():
    """전체 포트폴리오 KPI 월간 집계 — §19 수식 기반"""
    from app.database import sync_session_maker

    today = date.today()
    if today.month == 1:
        period = f"{today.year - 1}-12"
    else:
        period = f"{today.year}-{today.month - 1:02d}"

    with sync_session_maker() as db:
        updated = 0

        # 보육팀: 관리 포트폴리오 수
        active_count = db.execute(
            select(func.count()).where(
                Incubation.is_deleted == False, Incubation.status == "active",  # noqa: E712
            )
        ).scalar_one()
        updated += _update_kpi(db, "incubation", period, "관리 포트폴리오 수", active_count)

        # 보육팀: 액션아이템 이행률
        avg_rate = db.execute(
            select(func.avg(MentoringSession.action_completion_rate)).where(
                MentoringSession.is_deleted == False,  # noqa: E712
                MentoringSession.action_completion_rate.isnot(None),
            )
        ).scalar_one()
        if avg_rate is not None:
            updated += _update_kpi(db, "incubation", period, "액션아이템 이행률", round(float(avg_rate), 1))

        # OI팀: 신규 파트너 수
        partner_count = db.execute(
            select(func.count(func.distinct(PartnerDemand.partner_company))).where(
                PartnerDemand.is_deleted == False,  # noqa: E712
            )
        ).scalar_one()
        updated += _update_kpi(db, "oi", period, "신규 파트너 수", partner_count)

        # OI팀: PoC 착수 건수
        poc_kickoff = db.execute(
            select(func.count()).where(
                PoCProject.is_deleted == False,  # noqa: E712
                PoCProject.status.in_(["kickoff", "in_progress", "mid_review", "completed",
                                       "commercial_contract", "joint_development", "strategic_investment"]),
            )
        ).scalar_one()
        updated += _update_kpi(db, "oi", period, "PoC 착수 건수", poc_kickoff)

        # Sourcing: 신규 리드 수
        lead_count = db.execute(
            select(func.count()).where(Startup.is_deleted == False)  # noqa: E712
        ).scalar_one()
        updated += _update_kpi(db, "sourcing", period, "신규 리드 수", lead_count)

        db.commit()
        return {"period": period, "updated": updated}


def _update_kpi(db, team: str, period: str, kpi_name: str, actual: float) -> int:
    """TeamKPI actual_value + achievement_rate 업데이트"""
    result = db.execute(
        select(TeamKPI).where(
            TeamKPI.team == team, TeamKPI.period == period,
            TeamKPI.kpi_name == kpi_name, TeamKPI.is_deleted == False,  # noqa: E712
        )
    )
    kpi = result.scalar_one_or_none()
    if not kpi:
        return 0

    kpi.actual_value = actual
    if kpi.target_value and kpi.target_value != 0:
        kpi.achievement_rate = round(actual / kpi.target_value * 100, 1)
    return 1

"""전사 경영 KPI 서비스 — 5팀 KPI 집계 + 전사 요약"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team_kpi import TeamKPI
from app.schemas.team_kpi import ExecutiveKPIResponse, KPIHighlight, TeamSummary
from app.services.team_kpi_service import determine_status


TEAMS = ["sourcing", "review", "incubation", "oi", "backoffice"]


async def get_executive_summary(db: AsyncSession, period: str) -> ExecutiveKPIResponse:
    """5팀 KPI 집계 + 전사 건강도 판정"""
    teams: dict[str, TeamSummary] = {}
    total_achieved = 0
    total_kpis = 0

    for team in TEAMS:
        result = await db.execute(
            select(TeamKPI).where(
                TeamKPI.team == team, TeamKPI.period == period,
                TeamKPI.is_deleted == False,  # noqa: E712
            ).order_by(TeamKPI.kpi_layer, TeamKPI.kpi_name)
        )
        kpis = list(result.scalars().all())

        achieved = sum(1 for k in kpis if k.achievement_rate is not None and k.achievement_rate >= 90)
        needs_improvement = sum(1 for k in kpis if k.achievement_rate is not None and k.achievement_rate < 70)

        # Output/Outcome 계층 위주 하이라이트
        highlights = []
        for k in kpis:
            if k.kpi_layer in ("output", "outcome"):
                highlights.append(KPIHighlight(
                    kpi_name=k.kpi_name, kpi_layer=k.kpi_layer,
                    target_value=k.target_value, actual_value=k.actual_value,
                    achievement_rate=k.achievement_rate,
                    status=determine_status(k.achievement_rate),
                ))

        teams[team] = TeamSummary(
            team=team, total_kpis=len(kpis),
            achieved=achieved, needs_improvement=needs_improvement,
            highlight_kpis=highlights,
        )
        total_achieved += achieved
        total_kpis += len(kpis)

    # 전사 건강도
    overall_rate = (total_achieved / max(total_kpis, 1)) * 100
    overall_health = determine_status(overall_rate)

    return ExecutiveKPIResponse(
        period=period, teams=teams, overall_health=overall_health,
    )

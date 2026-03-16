"""팀별 KPI 서비스 — CRUD + 달성률 자동 계산 + 시드"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team_kpi import TeamKPI
from app.models.user import User
from app.schemas.team_kpi import TeamKPICreate, TeamKPIUpdate
from app.services import activity_log_service

# §16 KPI 시드 정의 (5팀 × 39개)
KPI_SEED_DATA: list[dict] = [
    # Sourcing (8)
    {"team": "sourcing", "kpi_layer": "input", "kpi_name": "신규 리드 수", "kpi_definition": "COUNT(Startup WHERE created_at IN 해당월)", "target_value": 80},
    {"team": "sourcing", "kpi_layer": "input", "kpi_name": "전략산업 리드 비율", "kpi_definition": "전략산업 리드 / 전체 리드 * 100", "target_value": 60},
    {"team": "sourcing", "kpi_layer": "process", "kpi_name": "1차 미팅 완료율", "kpi_definition": "DealFlow >= first_screening / 신규 리드", "target_value": 50},
    {"team": "sourcing", "kpi_layer": "process", "kpi_name": "CRM 입력 완결률", "kpi_definition": "필수 필드 완성 Startup / 전체", "target_value": 100},
    {"team": "sourcing", "kpi_layer": "output", "kpi_name": "심사 전환 수", "kpi_definition": "COUNT(Handover WHERE from_team=sourcing)", "target_value": 20},
    {"team": "sourcing", "kpi_layer": "output", "kpi_name": "유효 딜 비율", "kpi_definition": "Review verdict=proceed / 심사 전환", "target_value": 60},
    {"team": "sourcing", "kpi_layer": "outcome", "kpi_name": "최종 선발 기여 수", "kpi_definition": "COUNT(ICDecision WHERE approved)", "target_value": 6},
    {"team": "sourcing", "kpi_layer": "outcome", "kpi_name": "투자 전환 기여율", "kpi_definition": "Contract completed / 심사 전환", "target_value": 20},
    # 심사 (8)
    {"team": "review", "kpi_layer": "input", "kpi_name": "신규 심사 착수 건수", "kpi_definition": "COUNT(Review WHERE started_at IN 해당월)", "target_value": 15},
    {"team": "review", "kpi_layer": "process", "kpi_name": "평균 심사 소요일", "kpi_definition": "AVG(completed_at - started_at)", "target_value": 21},
    {"team": "review", "kpi_layer": "process", "kpi_name": "DD 자료 회수율", "kpi_definition": "수령 항목 / 전체 항목", "target_value": 95},
    {"team": "review", "kpi_layer": "process", "kpi_name": "투자메모 완결률", "kpi_definition": "9개 섹션 완성 메모 / 전체", "target_value": 100},
    {"team": "review", "kpi_layer": "output", "kpi_name": "IC 상정 건수", "kpi_definition": "COUNT(ICDecision WHERE decided_at IN 해당월)", "target_value": 8},
    {"team": "review", "kpi_layer": "output", "kpi_name": "승인율", "kpi_definition": "approved / IC 상정", "target_value": 50},
    {"team": "review", "kpi_layer": "outcome", "kpi_name": "클로징 성공률", "kpi_definition": "Contract completed / approved", "target_value": 90},
    {"team": "review", "kpi_layer": "outcome", "kpi_name": "후속투자 준비 적합률", "kpi_definition": "FollowOn ir_active within 6mo / portfolio", "target_value": 60},
    # 보육 (8)
    {"team": "incubation", "kpi_layer": "input", "kpi_name": "관리 포트폴리오 수", "kpi_definition": "COUNT(Incubation WHERE status=active)", "target_value": 20},
    {"team": "incubation", "kpi_layer": "process", "kpi_name": "온보딩 완료율", "kpi_definition": "status != onboarding / created this month", "target_value": 100},
    {"team": "incubation", "kpi_layer": "process", "kpi_name": "멘토링 실행률", "kpi_definition": "실제 세션 / 계획 세션", "target_value": 90},
    {"team": "incubation", "kpi_layer": "process", "kpi_name": "액션아이템 이행률", "kpi_definition": "AVG(action_completion_rate)", "target_value": 75},
    {"team": "incubation", "kpi_layer": "output", "kpi_name": "KPI 개선 기업 비율", "kpi_definition": "KPI 개선 기업 / 관리 포트폴리오", "target_value": 70},
    {"team": "incubation", "kpi_layer": "output", "kpi_name": "IR 자료 완성률", "kpi_definition": "IR ready 기업 / 관리 포트폴리오", "target_value": 90},
    {"team": "incubation", "kpi_layer": "outcome", "kpi_name": "후속 투자미팅 발생률", "kpi_definition": "follow_on_meetings > 0 기업 / 포트폴리오", "target_value": 60},
    {"team": "incubation", "kpi_layer": "outcome", "kpi_name": "만족도", "kpi_definition": "AVG(survey scores)", "target_value": 4.5},
    # OI (8)
    {"team": "oi", "kpi_layer": "input", "kpi_name": "신규 파트너 수", "kpi_definition": "DISTINCT partner_company 해당월", "target_value": 5},
    {"team": "oi", "kpi_layer": "input", "kpi_name": "수요과제 발굴 수", "kpi_definition": "COUNT(PartnerDemand 해당월)", "target_value": 10},
    {"team": "oi", "kpi_layer": "process", "kpi_name": "매칭 제안 수", "kpi_definition": "PoCProject >= matching 해당월", "target_value": 12},
    {"team": "oi", "kpi_layer": "process", "kpi_name": "PoC 설계 완료율", "kpi_definition": "status >= planning / 매칭 제안", "target_value": 80},
    {"team": "oi", "kpi_layer": "output", "kpi_name": "PoC 착수 건수", "kpi_definition": "PoCProject >= kickoff", "target_value": 4},
    {"team": "oi", "kpi_layer": "output", "kpi_name": "PoC 완료율", "kpi_definition": "completed / 착수", "target_value": 80},
    {"team": "oi", "kpi_layer": "outcome", "kpi_name": "계약 전환율", "kpi_definition": "commercial_contract / completed", "target_value": 30},
    {"team": "oi", "kpi_layer": "outcome", "kpi_name": "전략적 투자 검토건수", "kpi_definition": "PoCProject strategic_investment", "target_value": 2},
    # 백오피스 (7)
    {"team": "backoffice", "kpi_layer": "process", "kpi_name": "계약 처리 리드타임", "kpi_definition": "AVG(closed_at - decided_at) days", "target_value": 10},
    {"team": "backoffice", "kpi_layer": "process", "kpi_name": "투자집행 정시율", "kpi_definition": "10일 내 완료 / 전체", "target_value": 100},
    {"team": "backoffice", "kpi_layer": "process", "kpi_name": "보고서 정시 제출률", "kpi_definition": "마감 내 제출 / 전체", "target_value": 100},
    {"team": "backoffice", "kpi_layer": "process", "kpi_name": "문서 정합성 오류건수", "kpi_definition": "error_correction 로그 수", "target_value": 0},
    {"team": "backoffice", "kpi_layer": "outcome", "kpi_name": "감사 지적 건수", "kpi_definition": "수동 입력", "target_value": 0},
    {"team": "backoffice", "kpi_layer": "outcome", "kpi_name": "보안사고 건수", "kpi_definition": "수동 입력", "target_value": 0},
    {"team": "backoffice", "kpi_layer": "outcome", "kpi_name": "Cap Table 정확도", "kpi_definition": "수동 감사 확인", "target_value": 100},
]


def calculate_achievement(actual: float | None, target: float) -> float | None:
    if actual is None or target == 0:
        return None
    return round(actual / target * 100, 1)


def determine_status(rate: float | None) -> str:
    if rate is None:
        return "데이터없음"
    if rate >= 90:
        return "양호"
    if rate >= 70:
        return "보완필요"
    return "개선필요"


async def get_list(
    db: AsyncSession,
    team: str | None = None,
    period: str | None = None,
    kpi_layer: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[TeamKPI], int]:
    query = select(TeamKPI).where(TeamKPI.is_deleted == False)  # noqa: E712

    if team:
        query = query.where(TeamKPI.team == team)
    if period:
        query = query.where(TeamKPI.period == period)
    if kpi_layer:
        query = query.where(TeamKPI.kpi_layer == kpi_layer)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(TeamKPI.team, TeamKPI.kpi_layer, TeamKPI.kpi_name).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_team_period(db: AsyncSession, team: str, period: str) -> list[TeamKPI]:
    result = await db.execute(
        select(TeamKPI).where(
            TeamKPI.team == team, TeamKPI.period == period, TeamKPI.is_deleted == False,  # noqa: E712
        ).order_by(TeamKPI.kpi_layer, TeamKPI.kpi_name)
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, kpi_id: uuid.UUID) -> TeamKPI | None:
    result = await db.execute(
        select(TeamKPI).where(TeamKPI.id == kpi_id, TeamKPI.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: TeamKPICreate, user: User) -> TeamKPI:
    achievement = calculate_achievement(data.actual_value, data.target_value)
    kpi = TeamKPI(
        team=data.team, period=data.period, kpi_layer=data.kpi_layer,
        kpi_name=data.kpi_name, kpi_definition=data.kpi_definition,
        target_value=data.target_value, actual_value=data.actual_value,
        achievement_rate=achievement, updated_by=user.id, notes=data.notes,
    )
    db.add(kpi)
    await db.flush()
    await activity_log_service.log(db, user.id, "create", {"entity": "team_kpi", "kpi_name": data.kpi_name})
    await db.commit()
    await db.refresh(kpi)
    return kpi


async def update(db: AsyncSession, kpi: TeamKPI, data: TeamKPIUpdate, user: User) -> TeamKPI:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kpi, field, value)

    target = update_data.get("target_value", kpi.target_value)
    actual = update_data.get("actual_value", kpi.actual_value)
    kpi.achievement_rate = calculate_achievement(actual, target)
    kpi.updated_by = user.id

    await activity_log_service.log(db, user.id, "update", {"entity": "team_kpi", "fields": list(update_data.keys())})
    await db.commit()
    await db.refresh(kpi)
    return kpi


async def seed_kpis(db: AsyncSession, period: str, user: User) -> int:
    """39개 KPI 시드 데이터 일괄 생성"""
    count = 0
    for seed in KPI_SEED_DATA:
        existing = await db.execute(
            select(TeamKPI).where(
                TeamKPI.team == seed["team"], TeamKPI.period == period,
                TeamKPI.kpi_name == seed["kpi_name"], TeamKPI.is_deleted == False,  # noqa: E712
            )
        )
        if existing.scalar_one_or_none():
            continue
        kpi = TeamKPI(
            team=seed["team"], period=period, kpi_layer=seed["kpi_layer"],
            kpi_name=seed["kpi_name"], kpi_definition=seed["kpi_definition"],
            target_value=seed["target_value"], updated_by=user.id,
        )
        db.add(kpi)
        count += 1
    await db.commit()
    return count

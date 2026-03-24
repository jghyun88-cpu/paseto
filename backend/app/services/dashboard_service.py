"""통합 대시보드 서비스 — 8대 KPI + 위기 감지"""

import uuid
from datetime import datetime

from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.activity_log import ActivityLog
from app.models.handover import HandoverDocument
from app.models.incubation import Incubation
from app.models.meeting import Meeting
from app.models.startup import Startup
from app.schemas.dashboard import (
    CrisisAlert,
    DealPipelineMetrics,
    ExecutiveDashboardResponse,
    PortfolioMetrics,
)
from app.schemas.handover import HandoverResponse
from app.schemas.meeting import MeetingResponse


async def get_executive_dashboard(db: AsyncSession) -> ExecutiveDashboardResponse:
    """통합 대시보드 데이터 집계"""

    # 1. 딜 파이프라인 — 4개 count를 단일 쿼리로 통합
    screening_stages = [DealStage.FIRST_SCREENING, DealStage.DEEP_REVIEW, DealStage.INTERVIEW,
                        DealStage.DUE_DILIGENCE, DealStage.IC_PENDING, DealStage.IC_REVIEW]
    contract_stages = [DealStage.CONTRACT, DealStage.APPROVED, DealStage.CONDITIONAL]

    startup_row = (await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((Startup.current_deal_stage.in_(screening_stages), 1), else_=0)).label("in_screening"),
            func.sum(case((Startup.current_deal_stage.in_(contract_stages), 1), else_=0)).label("in_contract"),
            func.sum(case((Startup.current_deal_stage == DealStage.PORTFOLIO, 1), else_=0)).label("portfolio"),
        ).where(Startup.is_deleted == False)  # noqa: E712
    )).one()

    deal_pipeline = DealPipelineMetrics(
        total=startup_row.total,
        in_screening=startup_row.in_screening or 0,
        in_contract=startup_row.in_contract or 0,
        portfolio=startup_row.portfolio or 0,
    )

    # 1-b. 이번 달 신규 소싱 (current_deal_stage=INBOUND, 이번 달 생성)
    now_utc = datetime.utcnow()
    monthly_sourcing = (await db.execute(
        select(func.count()).where(
            Startup.is_deleted == False,  # noqa: E712
            extract("year", Startup.created_at) == now_utc.year,
            extract("month", Startup.created_at) == now_utc.month,
        )
    )).scalar_one()

    # 2. 포트폴리오 메트릭스 — 2개 count를 단일 쿼리로 통합
    incubation_row = (await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((Incubation.portfolio_grade == "A", 1), else_=0)).label("grade_a"),
        ).where(Incubation.is_deleted == False)  # noqa: E712
    )).one()

    total_incubations = incubation_row.total
    grade_a = incubation_row.grade_a or 0

    portfolio_metrics = PortfolioMetrics(
        total_startups=total_incubations,
        grade_a_ratio=grade_a / max(total_incubations, 1),
        follow_on_rate=0.0,
    )

    # 3. 위기 알림 (JOIN으로 N+1 쿼리 방지)
    crisis_alerts: list[CrisisAlert] = []
    crisis_result = await db.execute(
        select(Incubation, Startup)
        .join(Startup, Incubation.startup_id == Startup.id)
        .where(
            Incubation.is_deleted == False,  # noqa: E712
            Incubation.crisis_flags.isnot(None),
        )
    )
    for inc, startup in crisis_result.all():
        flags = inc.crisis_flags or {}
        if flags.get("cash_critical"):
            crisis_alerts.append(CrisisAlert(
                startup_id=inc.startup_id,
                company_name=startup.company_name if startup else "알 수 없음",
                crisis_type="cash_depletion",
                severity="high",
            ))

    # 4. 미확인 인계
    unack = (await db.execute(
        select(func.count()).where(
            HandoverDocument.is_deleted == False,  # noqa: E712
            HandoverDocument.acknowledged_by.is_(None),
        )
    )).scalar_one()

    # 5. 예정 회의 (향후 7일)
    now = datetime.utcnow()
    meetings_result = await db.execute(
        select(Meeting)
        .where(Meeting.scheduled_at >= now, Meeting.is_deleted == False)  # noqa: E712
        .order_by(Meeting.scheduled_at.asc())
        .limit(5)
    )
    upcoming = [MeetingResponse.model_validate(m) for m in meetings_result.scalars().all()]

    # 6. 최근 인계
    handovers_result = await db.execute(
        select(HandoverDocument)
        .where(HandoverDocument.is_deleted == False)  # noqa: E712
        .order_by(HandoverDocument.created_at.desc())
        .limit(5)
    )
    recent_handovers = [HandoverResponse.model_validate(h) for h in handovers_result.scalars().all()]

    return ExecutiveDashboardResponse(
        deal_pipeline=deal_pipeline,
        portfolio_metrics=portfolio_metrics,
        monthly_sourcing=monthly_sourcing,
        crisis_alerts=crisis_alerts,
        unacknowledged_handovers=unack,
        upcoming_meetings=upcoming,
        recent_handovers=recent_handovers,
    )


async def get_timeline(
    db: AsyncSession, startup_id: uuid.UUID, page: int = 1, page_size: int = 20,
) -> tuple[list[ActivityLog], int]:
    query = select(ActivityLog).where(ActivityLog.startup_id == startup_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total

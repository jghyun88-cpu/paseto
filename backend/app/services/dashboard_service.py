"""통합 대시보드 서비스 — 8대 KPI + 위기 감지"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
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

    # 1. 딜 파이프라인
    total_startups = (await db.execute(
        select(func.count()).where(Startup.is_deleted == False)  # noqa: E712
    )).scalar_one()

    screening_stages = [DealStage.FIRST_SCREENING, DealStage.DEEP_REVIEW, DealStage.INTERVIEW,
                        DealStage.DUE_DILIGENCE, DealStage.IC_PENDING, DealStage.IC_REVIEW]
    in_screening = (await db.execute(
        select(func.count()).where(
            Startup.is_deleted == False, Startup.current_deal_stage.in_(screening_stages)  # noqa: E712
        )
    )).scalar_one()

    contract_stages = [DealStage.CONTRACT, DealStage.APPROVED, DealStage.CONDITIONAL]
    in_contract = (await db.execute(
        select(func.count()).where(
            Startup.is_deleted == False, Startup.current_deal_stage.in_(contract_stages)  # noqa: E712
        )
    )).scalar_one()

    portfolio = (await db.execute(
        select(func.count()).where(
            Startup.is_deleted == False, Startup.current_deal_stage == DealStage.PORTFOLIO  # noqa: E712
        )
    )).scalar_one()

    deal_pipeline = DealPipelineMetrics(
        total=total_startups, in_screening=in_screening,
        in_contract=in_contract, portfolio=portfolio,
    )

    # 2. 포트폴리오 메트릭스
    total_incubations = (await db.execute(
        select(func.count()).where(Incubation.is_deleted == False)  # noqa: E712
    )).scalar_one()

    grade_a = (await db.execute(
        select(func.count()).where(
            Incubation.is_deleted == False, Incubation.portfolio_grade == "A"  # noqa: E712
        )
    )).scalar_one()

    portfolio_metrics = PortfolioMetrics(
        total_startups=total_incubations,
        grade_a_ratio=grade_a / max(total_incubations, 1),
        follow_on_rate=0.0,
    )

    # 3. 위기 알림
    crisis_alerts: list[CrisisAlert] = []
    crisis_result = await db.execute(
        select(Incubation).where(
            Incubation.is_deleted == False,  # noqa: E712
            Incubation.crisis_flags.isnot(None),
        )
    )
    for inc in crisis_result.scalars().all():
        flags = inc.crisis_flags or {}
        if flags.get("cash_critical"):
            startup_result = await db.execute(select(Startup).where(Startup.id == inc.startup_id))
            startup = startup_result.scalar_one_or_none()
            crisis_alerts.append(CrisisAlert(
                startup_id=inc.startup_id,
                company_name=startup.company_name if startup else "알 수 없음",
                crisis_type="cash_depletion",
                severity="high",
            ))

    # 4. 미확인 인계
    unack = (await db.execute(
        select(func.count()).where(
            HandoverDocument.acknowledged_by.is_(None),
            HandoverDocument.is_deleted == False,  # noqa: E712
        )
    )).scalar_one()

    # 5. 예정 회의 (향후 7일)
    now = datetime.now(timezone.utc)
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

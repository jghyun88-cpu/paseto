"""보육 포트폴리오 서비스 — 온보딩 + 등급 관리 + 액션플랜 (§18 #4)"""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import PortfolioGrade
from app.models.incubation import Incubation
from app.models.startup import Startup
from app.models.user import User
from app.schemas.incubation import ActionPlanUpdate, IncubationCreate, IncubationUpdate
from app.services import activity_log_service


# 온보딩 체크리스트 기본 항목
DEFAULT_ONBOARDING_ITEMS = [
    "투자 계약서 확인",
    "담당 PM 배정",
    "기업 현황 진단 미팅",
    "주요 KPI 3개 설정",
    "멘토 배정",
    "데이터룸 접근 권한 설정",
    "슬랙/커뮤니케이션 채널 생성",
    "90일 액션플랜 초안 작성",
    "첫 멘토링 세션 일정 확정",
    "IR 자료 현황 점검",
    "법적 이슈 체크",
    "핵심 인력 현황 파악",
    "재무 현황 공유",
    "온보딩 완료 보고",
]

DEFAULT_CRISIS_FLAGS = {
    "cash_critical": False,
    "key_person_left": False,
    "customer_churn": False,
    "dev_delay": False,
    "lawsuit": False,
}

DEFAULT_IR_READINESS = {
    "pitch_1min": False,
    "pitch_5min": False,
    "ir_deck": False,
    "data_room": False,
    "faq": False,
    "valuation_logic": False,
    "use_of_funds": False,
    "milestone_plan": False,
}


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    grade: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> tuple[list[Incubation], int]:
    """포트폴리오 목록 (필터 + 페이지네이션)"""
    query = select(Incubation).where(Incubation.is_deleted == False)  # noqa: E712

    if grade:
        query = query.where(Incubation.portfolio_grade == grade)
    if status:
        query = query.where(Incubation.status == status)
    if search:
        from app.utils.validators import escape_like
        escaped = escape_like(search)
        query = query.join(Startup, Incubation.startup_id == Startup.id).where(
            Startup.company_name.ilike(f"%{escaped}%", escape="\\"),
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(Incubation.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(
    db: AsyncSession, incubation_id: uuid.UUID,
) -> Incubation | None:
    result = await db.execute(
        select(Incubation).where(
            Incubation.id == incubation_id,
            Incubation.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: IncubationCreate, user: User,
) -> Incubation:
    """온보딩 생성 (PRG-F01) — 자동화 #4"""
    incubation = Incubation(
        startup_id=data.startup_id,
        assigned_pm_id=data.assigned_pm_id,
        program_start=data.program_start,
        program_end=data.program_end,
        batch_id=data.batch_id,
        growth_bottleneck=data.growth_bottleneck,
        diagnosis=data.diagnosis,
        portfolio_grade=PortfolioGrade.B,
        status="onboarding",
        crisis_flags=DEFAULT_CRISIS_FLAGS,
        onboarding_checklist={
            "items": [{"label": item, "completed": False} for item in DEFAULT_ONBOARDING_ITEMS],
            "completed_at": None,
        },
        ir_readiness=DEFAULT_IR_READINESS,
    )
    db.add(incubation)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "incubation", "incubation_id": str(incubation.id)},
        startup_id=data.startup_id,
    )

    await db.refresh(incubation)
    return incubation


async def update(
    db: AsyncSession, incubation: Incubation, data: IncubationUpdate, user: User,
) -> Incubation:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incubation, field, value)

    db.add(incubation)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "incubation", "fields": list(update_data.keys())},
        startup_id=incubation.startup_id,
    )

    await db.refresh(incubation)
    return incubation


async def change_grade(
    db: AsyncSession, incubation: Incubation,
    grade: PortfolioGrade, reason: str, user: User,
) -> Incubation:
    """포트폴리오 등급 변경 — PM/Partner만 가능, ActivityLog 필수"""
    old_grade = incubation.portfolio_grade
    incubation.portfolio_grade = grade

    db.add(incubation)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "grade_change",
        {
            "entity": "incubation",
            "old_grade": old_grade.value if old_grade else None,
            "new_grade": grade.value,
            "reason": reason,
        },
        startup_id=incubation.startup_id,
    )

    await db.refresh(incubation)
    return incubation


async def update_action_plan(
    db: AsyncSession, incubation: Incubation, data: ActionPlanUpdate, user: User,
) -> Incubation:
    """90일 액션플랜 저장/수정 (PRG-F02)"""
    incubation.action_plan = {
        "items": [item.model_dump(mode="json") for item in data.items],
    }

    db.add(incubation)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "incubation", "fields": ["action_plan"]},
        startup_id=incubation.startup_id,
    )

    await db.refresh(incubation)
    return incubation

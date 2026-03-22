"""스타트업 서비스 — CRUD + DealFlow 자동생성 + ActivityLog 기록"""

import uuid

from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage, SourcingChannel
from app.models.deal_flow import DealFlow
from app.models.startup import Startup
from app.models.user import User
from app.schemas.startup import StartupCreate, StartupUpdate
from app.services import activity_log_service
from app.utils.validators import escape_like


async def get_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    industry: str | None = None,
    stage: str | None = None,
    current_deal_stage: str | None = None,
    sourcing_channel: str | None = None,
    is_portfolio: bool | None = None,
    assigned_manager_id: uuid.UUID | None = None,
    has_deal_flow: bool | None = None,
) -> tuple[list[Startup], int]:
    """스타트업 목록 + 총 개수 (페이지네이션, 필터)"""
    query = select(Startup).where(Startup.is_deleted == False)  # noqa: E712

    if search:
        escaped = escape_like(search)
        query = query.where(
            or_(
                Startup.company_name.ilike(f"%{escaped}%", escape="\\"),
                Startup.ceo_name.ilike(f"%{escaped}%", escape="\\"),
                Startup.corporate_number.ilike(f"%{escaped}%", escape="\\"),
                Startup.business_registration_number.ilike(f"%{escaped}%", escape="\\"),
            )
        )
    if industry:
        query = query.where(Startup.industry == industry)
    if stage:
        query = query.where(Startup.stage == stage)
    if current_deal_stage:
        query = query.where(Startup.current_deal_stage == current_deal_stage)
    if sourcing_channel:
        query = query.where(Startup.sourcing_channel == sourcing_channel)
    if is_portfolio is not None:
        query = query.where(Startup.is_portfolio == is_portfolio)
    if assigned_manager_id:
        query = query.where(Startup.assigned_manager_id == assigned_manager_id)
    if has_deal_flow is True:
        query = query.where(
            exists().where(DealFlow.startup_id == Startup.id)
        )
    elif has_deal_flow is False:
        query = query.where(
            ~exists().where(DealFlow.startup_id == Startup.id)
        )

    # 총 개수
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # 페이지네이션
    offset = (page - 1) * page_size
    items_query = query.order_by(Startup.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(db: AsyncSession, startup_id: uuid.UUID) -> Startup | None:
    """ID로 스타트업 조회 (soft delete 제외)"""
    result = await db.execute(
        select(Startup).where(Startup.id == startup_id, Startup.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: StartupCreate, user: User) -> Startup:
    """스타트업 생성 + DealFlow(inbound) 자동 생성 + ActivityLog 기록

    마스터 §18 자동화 #1: SRC-F01 제출 → Startup + DealFlow 자동 생성
    """
    # sourcing_channel 기본값 처리 (딜등록 화면에서 미입력 시)
    sourcing_channel = SourcingChannel(data.sourcing_channel) if data.sourcing_channel else SourcingChannel.DIRECT_OUTREACH

    startup = Startup(
        company_name=data.company_name,
        corporate_number=data.corporate_number,
        business_registration_number=data.business_registration_number,
        ceo_name=data.ceo_name or "",
        industry=data.industry or "",
        stage=data.stage or "",
        one_liner=data.one_liner or "",
        problem_definition=data.problem_definition,
        solution_description=data.solution_description,
        team_size=data.team_size,
        is_fulltime=data.is_fulltime,
        sourcing_channel=sourcing_channel,
        referrer=data.referrer,
        current_deal_stage=DealStage.INBOUND,
        founded_date=data.founded_date,
        location=data.location,
        main_customer=data.main_customer,
        current_traction=data.current_traction,
        current_revenue=data.current_revenue,
        current_employees=data.current_employees,
        first_meeting_date=data.first_meeting_date,
        batch_id=data.batch_id,
        assigned_manager_id=user.id,
        # BHV 확장 필드
        ksic_code=data.ksic_code,
        main_product=data.main_product,
        stock_market=data.stock_market,
        listing_date=data.listing_date,
        total_assets=data.total_assets,
        capital=data.capital,
        operating_profit=data.operating_profit,
        has_research_lab=data.has_research_lab,
        research_staff_count=data.research_staff_count,
        city=data.city,
        website=data.website,
        contact_person=data.contact_person,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        notes=data.notes,
    )
    db.add(startup)
    await db.flush()

    # DealFlow 자동 생성 (inbound) — 기업정보 등록 시에는 건너뜀
    if not data.skip_deal_flow:
        deal_flow = DealFlow(
            startup_id=startup.id,
            stage=DealStage.INBOUND,
            moved_by=user.id,
        )
        db.add(deal_flow)

    # ActivityLog 기록
    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "startup", "company_name": data.company_name},
        startup_id=startup.id,
    )
    await db.refresh(startup)
    return startup


async def update(
    db: AsyncSession, startup: Startup, data: StartupUpdate, user: User,
) -> Startup:
    """스타트업 수정 + ActivityLog 기록"""
    changes: dict[str, object] = {}
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        old_value = getattr(startup, field)
        if old_value != value:
            setattr(startup, field, value)
            changes[field] = {"old": str(old_value), "new": str(value)}

    if changes:
        db.add(startup)
        await db.flush()

        await activity_log_service.log(
            db, user.id, "update",
            {"entity": "startup", "changes": changes},
            startup_id=startup.id,
        )
        await db.refresh(startup)

    return startup


async def soft_delete(db: AsyncSession, startup: Startup, user: User) -> None:
    """스타트업 소프트 삭제 + ActivityLog 기록"""
    startup.is_deleted = True

    await activity_log_service.log(
        db, user.id, "delete",
        {"entity": "startup", "company_name": startup.company_name},
        startup_id=startup.id,
    )

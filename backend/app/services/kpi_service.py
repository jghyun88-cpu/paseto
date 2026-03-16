"""KPI 서비스 — 월간 입력 + 3개월 연속 하락 감지 (§18 #7)"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import NotificationType
from app.models.incubation import Incubation
from app.models.kpi_record import KPIRecord
from app.models.user import User
from app.schemas.kpi_record import KPIRecordCreate, KPIRecordUpdate, KPITrendResponse, KPIWarning
from app.services import activity_log_service, notification_service

METRIC_LABELS = {
    "revenue": "매출",
    "customer_count": "고객 수",
    "runway_months": "잔여 운영 개월(runway)",
}


async def get_list(
    db: AsyncSession,
    startup_id: uuid.UUID | None = None,
    period: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[KPIRecord], int]:
    query = select(KPIRecord).where(KPIRecord.is_deleted == False)  # noqa: E712

    if startup_id:
        query = query.where(KPIRecord.startup_id == startup_id)
    if period:
        query = query.where(KPIRecord.period == period)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(KPIRecord.period.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_by_id(
    db: AsyncSession, record_id: uuid.UUID,
) -> KPIRecord | None:
    result = await db.execute(
        select(KPIRecord).where(
            KPIRecord.id == record_id,
            KPIRecord.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def get_trend(
    db: AsyncSession, startup_id: uuid.UUID, months: int = 6,
) -> KPITrendResponse:
    """최근 N개월 KPI 트렌드 + 3개월 하락 경보"""
    result = await db.execute(
        select(KPIRecord)
        .where(KPIRecord.startup_id == startup_id, KPIRecord.is_deleted == False)  # noqa: E712
        .order_by(KPIRecord.period.desc())
        .limit(months)
    )
    records = list(reversed(list(result.scalars().all())))

    periods = [r.period for r in records]
    revenue = [r.revenue for r in records]
    customer_count = [r.customer_count for r in records]
    runway_months = [r.runway_months for r in records]

    warnings = _check_decline(records)

    return KPITrendResponse(
        startup_id=startup_id,
        periods=periods,
        revenue=revenue,
        customer_count=customer_count,
        runway_months=runway_months,
        warnings=warnings,
    )


async def create(
    db: AsyncSession, data: KPIRecordCreate, user: User,
) -> KPIRecord:
    """KPI 입력 (PRG-F04) + 자동화 #7: 3개월 하락 감지"""
    # 중복 체크
    existing = await db.execute(
        select(KPIRecord).where(
            KPIRecord.startup_id == data.startup_id,
            KPIRecord.period == data.period,
            KPIRecord.is_deleted == False,  # noqa: E712
        )
    )
    if existing.scalar_one_or_none():
        from app.errors import kpi_period_duplicate
        raise kpi_period_duplicate()

    record = KPIRecord(
        startup_id=data.startup_id,
        period=data.period,
        revenue=data.revenue,
        customer_count=data.customer_count,
        active_users=data.active_users,
        poc_count=data.poc_count,
        repurchase_rate=data.repurchase_rate,
        release_velocity=data.release_velocity,
        cac=data.cac,
        ltv=data.ltv,
        pilot_conversion_rate=data.pilot_conversion_rate,
        mou_to_contract_rate=data.mou_to_contract_rate,
        headcount=data.headcount,
        runway_months=data.runway_months,
        follow_on_meetings=data.follow_on_meetings,
        notes=data.notes,
    )
    db.add(record)
    await db.flush()

    # 자동화 #7: 3개월 연속 하락 체크
    await _check_and_alert_decline(db, data.startup_id)

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "kpi_record", "period": data.period},
        startup_id=data.startup_id,
    )

    await db.commit()
    await db.refresh(record)
    return record


async def update(
    db: AsyncSession, record: KPIRecord, data: KPIRecordUpdate, user: User,
) -> KPIRecord:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "kpi_record", "period": record.period, "fields": list(update_data.keys())},
        startup_id=record.startup_id,
    )

    await db.commit()
    await db.refresh(record)
    return record


def _check_decline(records: list[KPIRecord]) -> list[KPIWarning]:
    """3개월 연속 하락 판정 (revenue, customer_count, runway_months)"""
    if len(records) < 3:
        return []

    last_3 = records[-3:]
    warnings = []

    for metric in ("revenue", "customer_count", "runway_months"):
        values = [getattr(r, metric) for r in last_3]
        if all(v is not None for v in values) and values[0] > values[1] > values[2]:
            severity = "critical" if metric == "runway_months" else "warning"
            warnings.append(KPIWarning(
                metric=metric,
                message=f"{METRIC_LABELS[metric]}이(가) 3개월 연속 하락했습니다",
                severity=severity,
            ))

    return warnings


async def _check_and_alert_decline(db: AsyncSession, startup_id: uuid.UUID) -> None:
    """3개월 하락 감지 시 KPI_WARNING 알림 + crisis_flags 업데이트"""
    result = await db.execute(
        select(KPIRecord)
        .where(KPIRecord.startup_id == startup_id, KPIRecord.is_deleted == False)  # noqa: E712
        .order_by(KPIRecord.period.desc())
        .limit(3)
    )
    records = list(reversed(list(result.scalars().all())))
    warnings = _check_decline(records)

    if not warnings:
        return

    # 보육팀 + partner에게 알림
    for warning in warnings:
        await notification_service.notify_team(
            db, "incubation",
            title=f"KPI 경고: {warning.message}",
            message=f"스타트업 ID: {startup_id}",
            notification_type=NotificationType.KPI_WARNING,
            related_entity_type="startup",
            related_entity_id=startup_id,
        )

    # crisis_flags 업데이트 (runway 하락 시)
    runway_warning = next((w for w in warnings if w.metric == "runway_months"), None)
    if runway_warning:
        incubation_result = await db.execute(
            select(Incubation).where(
                Incubation.startup_id == startup_id,
                Incubation.is_deleted == False,  # noqa: E712
            )
        )
        incubation = incubation_result.scalar_one_or_none()
        if incubation and incubation.crisis_flags:
            flags = dict(incubation.crisis_flags)
            flags["cash_critical"] = True
            incubation.crisis_flags = flags

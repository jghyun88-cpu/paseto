"""인계 서비스 — HandoverDocument 생성 + 수신 확인 + 수동 생성 + 통계"""

import uuid
from datetime import datetime, timezone

from pydantic import ValidationError
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import NotificationType
from app.errors import handover_already_acknowledged, handover_content_invalid, invalid_handover_type
from app.models.handover import HandoverDocument
from app.models.screening import Screening
from app.models.startup import Startup
from app.models.user import User
from app.schemas.handover import CONTENT_MODEL_MAP, VALID_HANDOVER_TYPES
from app.services import activity_log_service, notification_service


ALL_TEAMS = ["sourcing", "review", "incubation", "oi", "backoffice"]

# --- 경로별 from/to 매핑 ---

HANDOVER_TYPE_MAP: dict[str, tuple[str, str]] = {
    "sourcing_to_review":     ("sourcing",    "review"),
    "review_to_backoffice":   ("review",      "backoffice"),
    "review_to_incubation":   ("review",      "incubation"),
    "incubation_to_oi":       ("incubation",  "oi"),
    "oi_to_review":           ("oi",          "review"),
    "backoffice_broadcast":   ("backoffice",  "all"),
}


async def _get_latest_screening(db: AsyncSession, startup_id: uuid.UUID) -> Screening | None:
    """해당 기업의 최신 스크리닝 조회"""
    result = await db.execute(
        select(Screening)
        .where(Screening.startup_id == startup_id, Screening.is_deleted == False)  # noqa: E712
        .order_by(Screening.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _build_company_overview(startup: Startup) -> dict:
    """모든 경로에서 재사용하는 기업 개요 구성"""
    return {
        "name": startup.company_name,
        "ceo": startup.ceo_name,
        "industry": startup.industry,
        "stage": startup.stage,
        "one_liner": startup.one_liner,
    }


async def create_from_screening(
    db: AsyncSession,
    startup: Startup,
    screening: Screening,
    user: User,
) -> HandoverDocument:
    """스크리닝 결과 기반 인계 문서 자동 생성 (sourcing → review)"""
    risk_lines = [r.strip() for r in (screening.risk_notes or "").split("\n") if r.strip()]
    content = {
        "screening_results": {
            "grade": screening.recommendation,
            "overall_score": screening.overall_score,
            "risk_notes": screening.risk_notes,
        },
        "company_overview": _build_company_overview(startup),
        "handover_memo": screening.handover_memo,
        "key_risks": risk_lines[:3],
    }
    return await _create_handover(db, startup, user, "sourcing_to_review", content)


# --- FR-01: review → backoffice (IC 승인 시) ---

async def create_review_to_backoffice(
    db: AsyncSession,
    startup: Startup,
    user: User,
    ic_decision: str = "approved",
    investment_terms: dict | None = None,
    preconditions: list[str] | None = None,
    legal_memo: str | None = None,
) -> HandoverDocument:
    """IC 승인 시 백오피스팀에 인계 — 투자조건표 + 선행조건"""
    content = {
        "ic_decision": ic_decision,
        "investment_terms": investment_terms or {},
        "preconditions": preconditions or [],
        "legal_memo": legal_memo,
        "company_overview": _build_company_overview(startup),
    }
    return await _create_handover(
        db, startup, user, "review_to_backoffice", content,
    )


# --- FR-02: review → incubation (계약 체결 시) ---

async def create_review_to_incubation(
    db: AsyncSession,
    startup: Startup,
    user: User,
    investment_memo_summary: str = "",
    growth_bottlenecks: list[str] | None = None,
    six_month_priorities: list[str] | None = None,
    risk_signals: list[str] | None = None,
) -> HandoverDocument:
    """계약 체결(CLOSED) 시 보육팀에 인계 — 투자메모 + 성장과제"""
    content = {
        "investment_memo_summary": investment_memo_summary,
        "growth_bottlenecks": growth_bottlenecks or [],
        "six_month_priorities": six_month_priorities or [],
        "risk_signals": risk_signals or [],
        "company_overview": _build_company_overview(startup),
    }
    return await _create_handover(
        db, startup, user, "review_to_incubation", content,
    )


# --- FR-03: incubation → oi (PoC 매칭 요청) ---

async def create_incubation_to_oi(
    db: AsyncSession,
    startup: Startup,
    user: User,
    tech_product_status: str = "",
    poc_areas: list[str] | None = None,
    matching_priorities: list[str] | None = None,
    available_resources: str = "",
) -> HandoverDocument:
    """PoC 매칭 요청 시 OI팀에 인계 — 기술상태 + 매칭우선순위"""
    content = {
        "tech_product_status": tech_product_status,
        "poc_areas": poc_areas or [],
        "matching_priorities": matching_priorities or [],
        "available_resources": available_resources,
        "company_overview": _build_company_overview(startup),
    }
    return await _create_handover(
        db, startup, user, "incubation_to_oi", content,
    )


# --- FR-04: oi → review (후속투자 추천) ---

async def create_oi_to_review(
    db: AsyncSession,
    startup: Startup,
    user: User,
    strategic_investment_potential: str = "",
    customer_feedback: str = "",
    pilot_results: str = "",
    follow_on_points: list[str] | None = None,
) -> HandoverDocument:
    """후속투자 추천 시 심사팀에 역인계 — 실증성과 + 투자포인트"""
    content = {
        "strategic_investment_potential": strategic_investment_potential,
        "customer_feedback": customer_feedback,
        "pilot_results": pilot_results,
        "follow_on_points": follow_on_points or [],
        "company_overview": _build_company_overview(startup),
    }
    return await _create_handover(
        db, startup, user, "oi_to_review", content,
    )


# --- FR-05: backoffice → broadcast (계약 상태 변경) ---

async def create_backoffice_broadcast(
    db: AsyncSession,
    startup: Startup,
    user: User,
    contract_status: str = "",
    report_deadline: str | None = None,
    risk_alert: str | None = None,
    document_updates: list[str] | None = None,
) -> HandoverDocument:
    """전 조직 브로드캐스트 — 계약상태 + 리스크 알림"""
    content = {
        "contract_status": contract_status,
        "report_deadline": report_deadline,
        "risk_alert": risk_alert,
        "document_updates": document_updates or [],
        "company_overview": _build_company_overview(startup),
    }
    return await _create_handover(
        db, startup, user, "backoffice_broadcast", content,
    )


# --- 공통 내부 헬퍼 ---

async def _create_handover(
    db: AsyncSession,
    startup: Startup,
    user: User,
    handover_type: str,
    content: dict,
) -> HandoverDocument:
    """내부 공통 — HandoverDocument 생성 + ActivityLog + 알림 (중복 방지)"""
    from_team, to_team = HANDOVER_TYPE_MAP[handover_type]

    # 중복 방지: 같은 startup + handover_type의 미확인 인계가 존재하면 skip
    existing_result = await db.execute(
        select(HandoverDocument).where(
            HandoverDocument.startup_id == startup.id,
            HandoverDocument.handover_type == handover_type,
            HandoverDocument.acknowledged_at.is_(None),
            HandoverDocument.is_deleted == False,  # noqa: E712
        ).limit(1)
    )
    existing_doc = existing_result.scalar_one_or_none()
    if existing_doc is not None:
        return existing_doc

    handover = HandoverDocument(
        startup_id=startup.id,
        from_team=from_team,
        to_team=to_team,
        handover_type=handover_type,
        content=content,
        created_by=user.id,
    )
    db.add(handover)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "handover",
        {"entity": "handover", "from": from_team, "to": to_team, "type": handover_type},
        startup_id=startup.id,
    )

    # 수신팀 알림
    notify_teams = ALL_TEAMS if to_team == "all" else [to_team]
    for team in notify_teams:
        await notification_service.notify_team(
            db, team,
            title=f"인계 도착: {startup.company_name}",
            message=f"{from_team}팀에서 {startup.company_name}을(를) 인계했습니다.",
            notification_type=NotificationType.HANDOVER_REQUEST,
            related_entity_type="startup",
            related_entity_id=startup.id,
        )

    return handover


async def get_list(
    db: AsyncSession,
    from_team: str | None = None,
    to_team: str | None = None,
    handover_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[HandoverDocument], int]:
    """인계 목록 (페이지네이션 + 필터)"""
    query = select(HandoverDocument).where(HandoverDocument.is_deleted == False)  # noqa: E712
    if from_team:
        query = query.where(HandoverDocument.from_team == from_team)
    if to_team:
        query = query.where(HandoverDocument.to_team == to_team)
    if handover_type:
        query = query.where(HandoverDocument.handover_type == handover_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    items_query = query.order_by(HandoverDocument.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_query)
    return list(result.scalars().all()), total


async def get_by_id(
    db: AsyncSession, handover_id: uuid.UUID,
) -> HandoverDocument | None:
    result = await db.execute(
        select(HandoverDocument).where(HandoverDocument.id == handover_id, HandoverDocument.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def soft_delete(
    db: AsyncSession,
    handover: HandoverDocument,
    user: User,
) -> None:
    """인계 문서 soft delete"""
    handover.is_deleted = True
    db.add(handover)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "delete",
        {"entity": "handover", "action": "soft_deleted"},
        startup_id=handover.startup_id,
    )


async def acknowledge(
    db: AsyncSession,
    handover: HandoverDocument,
    user: User,
) -> HandoverDocument:
    """인계 수신 확인 — 이중 확인 방지"""
    if handover.acknowledged_at is not None:
        raise handover_already_acknowledged()

    handover.acknowledged_by = user.id
    handover.acknowledged_at = datetime.now(timezone.utc)

    db.add(handover)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "handover", "action": "acknowledged"},
        startup_id=handover.startup_id,
    )

    await db.refresh(handover)
    return handover


async def create_manual(
    db: AsyncSession,
    startup: Startup,
    user: User,
    handover_type: str,
    content: dict,
    memo: str | None = None,
) -> HandoverDocument:
    """수동 인계 생성 — 기본값 자동 채움 + Content Pydantic 검증 + _create_handover() 위임"""
    if handover_type not in VALID_HANDOVER_TYPES:
        raise invalid_handover_type()

    # company_overview 자동 채움
    if "company_overview" not in content:
        content["company_overview"] = _build_company_overview(startup)

    # sourcing_to_review: screening_results 자동 채움
    if handover_type == "sourcing_to_review" and not content.get("screening_results"):
        latest_screening = await _get_latest_screening(db, startup.id)
        if latest_screening:
            risk_lines = [r.strip() for r in (latest_screening.risk_notes or "").split("\n") if r.strip()]
            content["screening_results"] = {
                "grade": latest_screening.recommendation,
                "overall_score": latest_screening.overall_score,
                "risk_notes": latest_screening.risk_notes,
            }
            if not content.get("key_risks"):
                content["key_risks"] = risk_lines[:3]

    # 경로별 Content 모델로 기본값 채움 후 검증
    content_model = CONTENT_MODEL_MAP.get(handover_type)
    if content_model:
        try:
            validated = content_model.model_validate(content)
            content = validated.model_dump()
        except ValidationError as e:
            first_error = e.errors()[0]
            field = ".".join(str(loc) for loc in first_error["loc"])
            raise handover_content_invalid(field)

    if memo:
        content["memo"] = memo

    return await _create_handover(db, startup, user, handover_type, content)


async def get_stats(db: AsyncSession) -> dict:
    """인계 통계 — SQL 집계로 경로별 건수, 평균 확인 시간, 에스컬레이션 비율 계산"""
    H = HandoverDocument
    base = H.is_deleted == False  # noqa: E712

    # 경로별 집계 (GROUP BY handover_type)
    type_stats_q = (
        select(
            H.handover_type,
            func.count().label("total"),
            func.count(H.acknowledged_at).label("acknowledged"),
            func.sum(case((H.escalated == True, 1), else_=0)).label("escalated"),  # noqa: E712
        )
        .where(base)
        .group_by(H.handover_type)
    )
    type_rows = (await db.execute(type_stats_q)).all()

    by_type: dict[str, dict[str, int]] = {}
    grand_total = 0
    grand_escalated = 0
    for row in type_rows:
        total = row.total
        acked = row.acknowledged
        esc = int(row.escalated or 0)
        by_type[row.handover_type] = {
            "total": total,
            "acknowledged": acked,
            "pending": total - acked - esc,
            "escalated": esc,
        }
        grand_total += total
        grand_escalated += esc

    # 평균 확인 시간 (SQL AVG)
    avg_q = (
        select(
            func.avg(
                extract("epoch", H.acknowledged_at - H.created_at) / 3600
            ).label("avg_hours")
        )
        .where(base, H.acknowledged_at.isnot(None))
    )
    avg_hours = (await db.execute(avg_q)).scalar_one_or_none()

    esc_rate = grand_escalated / grand_total if grand_total > 0 else 0.0

    return {
        "by_type": by_type,
        "avg_acknowledge_hours": round(float(avg_hours), 1) if avg_hours is not None else None,
        "escalation_rate": round(esc_rate, 3),
    }

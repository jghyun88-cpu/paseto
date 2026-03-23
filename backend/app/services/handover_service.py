"""인계 서비스 — HandoverDocument 생성 + 수신 확인 + 수동 생성 + 통계"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.handover import HandoverDocument
from app.models.screening import Screening
from app.models.startup import Startup
from app.models.user import User
from app.services import activity_log_service


# --- 경로별 from/to 매핑 ---

HANDOVER_TYPE_MAP: dict[str, tuple[str, str]] = {
    "sourcing_to_review":     ("sourcing",    "review"),
    "review_to_backoffice":   ("review",      "backoffice"),
    "review_to_incubation":   ("review",      "incubation"),
    "incubation_to_oi":       ("incubation",  "oi"),
    "oi_to_review":           ("oi",          "review"),
    "backoffice_broadcast":   ("backoffice",  "all"),
}


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
    content = {
        "screening_results": {
            "grade": screening.recommendation,
            "overall_score": screening.overall_score,
            "risk_notes": screening.risk_notes,
        },
        "company_overview": {
            "name": startup.company_name,
            "ceo": startup.ceo_name,
            "industry": startup.industry,
            "stage": startup.stage,
            "one_liner": startup.one_liner,
        },
        "handover_memo": screening.handover_memo,
        "key_risks": (screening.risk_notes or "").split("\n")[:3],
    }

    handover = HandoverDocument(
        startup_id=startup.id,
        from_team="sourcing",
        to_team="review",
        handover_type="sourcing_to_review",
        content=content,
        created_by=user.id,
    )
    db.add(handover)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "handover",
        {"entity": "handover", "from": "sourcing", "to": "review"},
        startup_id=startup.id,
    )

    return handover


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
    """내부 공통 — HandoverDocument 생성 + ActivityLog + 알림"""
    from_team, to_team = HANDOVER_TYPE_MAP[handover_type]

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
    from app.enums import NotificationType
    from app.services import notification_service
    notify_teams = ["sourcing", "review", "incubation", "oi", "backoffice"] if to_team == "all" else [to_team]
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
) -> list[HandoverDocument]:
    query = select(HandoverDocument).where(HandoverDocument.is_deleted == False).order_by(HandoverDocument.created_at.desc())  # noqa: E712
    if from_team:
        query = query.where(HandoverDocument.from_team == from_team)
    if to_team:
        query = query.where(HandoverDocument.to_team == to_team)
    if handover_type:
        query = query.where(HandoverDocument.handover_type == handover_type)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, handover_id: uuid.UUID,
) -> HandoverDocument | None:
    result = await db.execute(
        select(HandoverDocument).where(HandoverDocument.id == handover_id, HandoverDocument.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def acknowledge(
    db: AsyncSession,
    handover: HandoverDocument,
    user: User,
) -> HandoverDocument:
    """인계 수신 확인 — 이중 확인 방지"""
    if handover.acknowledged_at is not None:
        from app.errors import handover_already_acknowledged
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
    """수동 인계 생성 — Content Pydantic 검증 + _create_handover() 위임"""
    from pydantic import ValidationError

    from app.errors import handover_content_invalid, invalid_handover_type
    from app.schemas.handover import CONTENT_MODEL_MAP, VALID_HANDOVER_TYPES

    if handover_type not in VALID_HANDOVER_TYPES:
        raise invalid_handover_type()

    # 경로별 Content 모델로 검증
    content_model = CONTENT_MODEL_MAP.get(handover_type)
    if content_model:
        try:
            content_model.model_validate(content)
        except ValidationError as e:
            first_error = e.errors()[0]
            field = ".".join(str(loc) for loc in first_error["loc"])
            raise handover_content_invalid(field)

    if memo:
        content["memo"] = memo
    if "company_overview" not in content:
        content["company_overview"] = _build_company_overview(startup)

    return await _create_handover(db, startup, user, handover_type, content)


async def get_stats(db: AsyncSession) -> dict:
    """인계 통계 — 경로별 건수, 평균 확인 시간, 에스컬레이션 비율"""
    query = select(HandoverDocument).where(HandoverDocument.is_deleted == False)  # noqa: E712
    result = await db.execute(query)
    items = list(result.scalars().all())

    by_type: dict[str, dict[str, int]] = {}
    ack_hours_list: list[float] = []
    total_count = len(items)
    escalated_count = 0

    for h in items:
        ht = h.handover_type
        if ht not in by_type:
            by_type[ht] = {"total": 0, "acknowledged": 0, "pending": 0, "escalated": 0}

        by_type[ht]["total"] += 1

        if h.acknowledged_at:
            by_type[ht]["acknowledged"] += 1
            delta = (h.acknowledged_at - h.created_at).total_seconds() / 3600
            ack_hours_list.append(delta)
        elif h.escalated:
            by_type[ht]["escalated"] += 1
            escalated_count += 1
        else:
            by_type[ht]["pending"] += 1

    avg_hours = sum(ack_hours_list) / len(ack_hours_list) if ack_hours_list else None
    esc_rate = escalated_count / total_count if total_count > 0 else 0.0

    return {
        "by_type": by_type,
        "avg_acknowledge_hours": round(avg_hours, 1) if avg_hours is not None else None,
        "escalation_rate": round(esc_rate, 3),
    }

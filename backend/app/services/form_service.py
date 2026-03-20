"""양식 서비스 — 템플릿 CRUD + 제출 + ActivityLog #10 + 14개 시드"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.user import User
from app.schemas.form import FormSubmissionCreate, FormTemplateCreate
from app.services import activity_log_service

FORM_SEEDS = [
    {
        "form_code": "SRC-F01", "title": "스타트업 초기등록표", "owning_team": "sourcing",
        "fields": [
            {"key": "company_name", "label": "기업명", "type": "text", "required": True},
            {"key": "ceo_name", "label": "대표자", "type": "text", "required": True},
            {"key": "founded_date", "label": "설립일", "type": "date"},
            {"key": "location", "label": "소재지", "type": "text"},
            {"key": "industry", "label": "산업분야", "type": "select",
             "options": ["반도체", "모빌리티", "AI", "배터리", "로보틱스", "바이오", "기타"], "required": True},
            {"key": "stage", "label": "단계", "type": "select", "options": ["예비창업", "Pre-seed", "Seed"]},
            {"key": "core_product", "label": "핵심 제품/기술", "type": "textarea", "required": True},
            {"key": "main_customer", "label": "주요 고객", "type": "text"},
            {"key": "current_traction", "label": "현재 성과", "type": "textarea"},
            {"key": "sourcing_channel", "label": "유입경로", "type": "select",
             "options": ["대학/연구소", "대기업OI", "포트폴리오추천", "VC/CVC", "공공기관", "경진대회", "온라인모집", "직접발굴", "기술전시회"]},
            {"key": "referrer", "label": "추천인", "type": "text"},
            {"key": "notes", "label": "비고", "type": "textarea"},
        ],
    },
    {
        "form_code": "SRC-F02", "title": "1차 스크리닝 시트", "owning_team": "sourcing",
        "fields": [
            {"key": "team_capability", "label": "창업팀 역량", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "problem_clarity", "label": "문제정의 명확성", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "tech_diff", "label": "제품/기술 차별성", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "market_potential", "label": "시장성", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "traction", "label": "현재 진척도", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "program_fit", "label": "프로그램 적합성", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "investment_potential", "label": "투자검토 가능성", "type": "select", "options": ["상", "중", "하"], "required": True},
            {"key": "overall_opinion", "label": "종합의견", "type": "textarea", "required": True},
            {"key": "grade", "label": "추천등급", "type": "select", "options": ["A", "B", "C", "D"], "required": True},
            {"key": "next_action", "label": "후속조치", "type": "textarea"},
            {"key": "handover_to_review", "label": "심사팀 인계 여부", "type": "checkbox"},
        ],
    },
    {"form_code": "INV-F01", "title": "DD 자료 요청표", "owning_team": "review", "fields": []},
    {"form_code": "INV-F02", "title": "투자 메모", "owning_team": "review", "fields": []},
    {"form_code": "INV-F03", "title": "IC 결과지", "owning_team": "review", "fields": []},
    {"form_code": "OPS-F01", "title": "투자계약 체크리스트", "owning_team": "backoffice", "fields": []},
    {"form_code": "OPS-F02", "title": "보고 일정 캘린더", "owning_team": "backoffice", "fields": []},
    {"form_code": "PRG-F01", "title": "온보딩 시트", "owning_team": "incubation", "fields": []},
    {"form_code": "PRG-F02", "title": "90일 액션플랜", "owning_team": "incubation", "fields": []},
    {"form_code": "PRG-F03", "title": "멘토링 기록지", "owning_team": "incubation", "fields": []},
    {"form_code": "PRG-F04", "title": "월간 KPI 점검표", "owning_team": "incubation", "fields": []},
    {"form_code": "OI-F01", "title": "파트너 수요정리표", "owning_team": "oi", "fields": []},
    {"form_code": "OI-F02", "title": "PoC 제안서", "owning_team": "oi", "fields": []},
    {"form_code": "OI-F03", "title": "PoC 진행관리표", "owning_team": "oi", "fields": []},
]


async def get_templates(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[FormTemplate], int]:
    query = select(FormTemplate).where(FormTemplate.is_deleted == False)  # noqa: E712
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(FormTemplate.form_code).offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_template_by_code(db: AsyncSession, form_code: str) -> FormTemplate | None:
    result = await db.execute(
        select(FormTemplate).where(FormTemplate.form_code == form_code, FormTemplate.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def get_template_by_id(db: AsyncSession, template_id: uuid.UUID) -> FormTemplate | None:
    result = await db.execute(select(FormTemplate).where(FormTemplate.id == template_id, FormTemplate.is_deleted == False))  # noqa: E712
    return result.scalar_one_or_none()


async def create_template(db: AsyncSession, data: FormTemplateCreate, user: User) -> FormTemplate:
    tmpl = FormTemplate(**data.model_dump())
    db.add(tmpl)
    await db.flush()
    await activity_log_service.log(db, user.id, "create", {"entity": "form_template", "code": data.form_code})
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


async def seed_templates(db: AsyncSession) -> int:
    count = 0
    for seed in FORM_SEEDS:
        existing = await db.execute(select(FormTemplate).where(FormTemplate.form_code == seed["form_code"]))
        if existing.scalar_one_or_none():
            continue
        fields = seed.get("fields", [])
        seed_without_fields = {k: v for k, v in seed.items() if k != "fields"}
        tmpl = FormTemplate(fields=fields, **seed_without_fields)
        db.add(tmpl)
        count += 1
    await db.commit()
    return count


async def get_submissions(db: AsyncSession, page: int = 1, page_size: int = 20, startup_id: uuid.UUID | None = None) -> tuple[list[FormSubmission], int]:
    query = select(FormSubmission).where(FormSubmission.is_deleted == False)  # noqa: E712
    if startup_id:
        query = query.where(FormSubmission.startup_id == startup_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(FormSubmission.submitted_at.desc()).offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_submission_by_id(db: AsyncSession, sub_id: uuid.UUID) -> FormSubmission | None:
    result = await db.execute(select(FormSubmission).where(FormSubmission.id == sub_id, FormSubmission.is_deleted == False))  # noqa: E712
    return result.scalar_one_or_none()


async def submit_form(db: AsyncSession, data: FormSubmissionCreate, user: User) -> FormSubmission:
    """양식 제출 + 자동화 #10 (ActivityLog 자동 기록)"""
    submission = FormSubmission(
        form_template_id=data.form_template_id, startup_id=data.startup_id,
        submitted_by=user.id, data=data.data,
    )
    db.add(submission)
    await db.flush()

    # 자동화 #10: 모든 양식 제출 → ActivityLog
    tmpl = await get_template_by_id(db, data.form_template_id)
    form_code = tmpl.form_code if tmpl else "unknown"
    await activity_log_service.log(
        db, user.id, "form_submission",
        {"entity": "form_submission", "form_code": form_code, "submission_id": str(submission.id)},
        startup_id=data.startup_id,
    )

    # 양식별 자동화 트리거
    if form_code == "SRC-F01":
        startup = await _trigger_src_f01(db, data.data, user)
        submission.startup_id = startup.id
    elif form_code == "SRC-F02" and data.startup_id:
        await _trigger_src_f02(db, data.data, data.startup_id, user)

    await db.commit()
    await db.refresh(submission)
    return submission


# --- 자동화 트리거 함수 ---

RATING_MAP = {"상": 5, "중": 3, "하": 1}


async def _trigger_src_f01(db: AsyncSession, form_data: dict, user: User):
    """SRC-F01 제출 → Startup 자동 생성 + DealFlow(inbound) (마스터 §18 #1)"""
    from app.enums import DealStage
    from app.models.startup import Startup
    from app.services import deal_flow_service

    company_name = (form_data.get("company_name") or "").strip()
    ceo_name = (form_data.get("ceo_name") or "").strip()
    if not company_name:
        raise ValueError("SRC-F01: 기업명은 필수 입력 항목입니다.")

    startup = Startup(
        company_name=company_name,
        ceo_name=ceo_name,
        location=form_data.get("location"),
        industry=form_data.get("industry", "기타"),
        stage=form_data.get("stage", "Pre-seed"),
        core_product=form_data.get("core_product"),
        main_customer=form_data.get("main_customer"),
        current_traction=form_data.get("current_traction"),
        sourcing_channel=form_data.get("sourcing_channel"),
        referrer=form_data.get("referrer"),
        current_deal_stage=DealStage.INBOUND,
    )
    db.add(startup)
    await db.flush()

    # DealFlow inbound 기록
    await deal_flow_service.move_stage(db, startup, DealStage.INBOUND, user)

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "startup", "trigger": "SRC-F01", "company_name": startup.company_name},
        startup_id=startup.id,
    )

    return startup


async def _trigger_src_f02(db: AsyncSession, form_data: dict, startup_id: uuid.UUID, user: User):
    """SRC-F02 제출 → screening_service.create() 호출 (상/중/하 → 5/3/1 환산)"""
    from app.schemas.screening import ScreeningCreate
    from app.services import screening_service

    screening_data = ScreeningCreate(
        startup_id=startup_id,
        fulltime_commitment=RATING_MAP.get(form_data.get("team_capability", "중"), 3),
        problem_clarity=RATING_MAP.get(form_data.get("problem_clarity", "중"), 3),
        tech_differentiation=RATING_MAP.get(form_data.get("tech_diff", "중"), 3),
        market_potential=RATING_MAP.get(form_data.get("market_potential", "중"), 3),
        initial_validation=RATING_MAP.get(form_data.get("traction", "중"), 3),
        legal_clear=True,
        strategy_fit=RATING_MAP.get(form_data.get("program_fit", "중"), 3),
        risk_notes=form_data.get("overall_opinion"),
        handover_memo=form_data.get("next_action"),
        handover_to_review=form_data.get("handover_to_review", False),
    )

    await screening_service.create(db, screening_data, user)

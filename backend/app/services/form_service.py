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
    {"form_code": "SRC-F01", "title": "스타트업 초기등록표", "owning_team": "sourcing"},
    {"form_code": "SRC-F02", "title": "1차 스크리닝 시트", "owning_team": "sourcing"},
    {"form_code": "INV-F01", "title": "DD 자료 요청표", "owning_team": "review"},
    {"form_code": "INV-F02", "title": "투자 메모", "owning_team": "review"},
    {"form_code": "INV-F03", "title": "IC 결과지", "owning_team": "review"},
    {"form_code": "OPS-F01", "title": "투자계약 체크리스트", "owning_team": "backoffice"},
    {"form_code": "OPS-F02", "title": "보고 일정 캘린더", "owning_team": "backoffice"},
    {"form_code": "PRG-F01", "title": "온보딩 시트", "owning_team": "incubation"},
    {"form_code": "PRG-F02", "title": "90일 액션플랜", "owning_team": "incubation"},
    {"form_code": "PRG-F03", "title": "멘토링 기록지", "owning_team": "incubation"},
    {"form_code": "PRG-F04", "title": "월간 KPI 점검표", "owning_team": "incubation"},
    {"form_code": "OI-F01", "title": "파트너 수요정리표", "owning_team": "oi"},
    {"form_code": "OI-F02", "title": "PoC 제안서", "owning_team": "oi"},
    {"form_code": "OI-F03", "title": "PoC 진행관리표", "owning_team": "oi"},
]


async def get_templates(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[FormTemplate], int]:
    query = select(FormTemplate).where(FormTemplate.is_deleted == False)  # noqa: E712
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(FormTemplate.form_code).offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


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
        tmpl = FormTemplate(fields=[], **seed)
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

    await db.commit()
    await db.refresh(submission)
    return submission

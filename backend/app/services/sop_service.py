"""SOP 서비스 — 템플릿 CRUD + 실행 추적 + 6개 시드"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sop_execution import SOPExecution
from app.models.sop_template import SOPTemplate
from app.models.user import User
from app.schemas.sop import SOPExecutionCreate, SOPStepUpdate, SOPTemplateCreate
from app.services import activity_log_service

SOP_SEEDS = [
    {"document_number": "SOP-SRC-01", "title": "스타트업 소싱 및 1차 스크리닝", "owning_team": "sourcing",
     "purpose": "유망 초기기업 발굴 및 1차 적합성 검토", "scope": "유입등록~심사팀 인계",
     "steps": [{"step": 1, "name": "유입등록", "forms": ["SRC-F01"]}, {"step": 2, "name": "1차자료검토"}, {"step": 3, "name": "초기미팅"}, {"step": 4, "name": "등급분류", "forms": ["SRC-F02"]}, {"step": 5, "name": "인계"}],
     "required_forms": ["SRC-F01", "SRC-F02"]},
    {"document_number": "SOP-INV-01", "title": "투자심사 및 IC 상정", "owning_team": "review",
     "purpose": "투자 의사결정을 위한 심사 프로세스", "scope": "심사착수~결과통보",
     "steps": [{"step": 1, "name": "심사착수", "forms": ["INV-F01"]}, {"step": 2, "name": "정밀검토"}, {"step": 3, "name": "투자메모작성", "forms": ["INV-F02"]}, {"step": 4, "name": "사전리뷰"}, {"step": 5, "name": "IC상정", "forms": ["INV-F03"]}, {"step": 6, "name": "결과통보"}],
     "required_forms": ["INV-F01", "INV-F02", "INV-F03"]},
    {"document_number": "SOP-OPS-01", "title": "투자계약 및 집행", "owning_team": "backoffice",
     "purpose": "투자 계약 체결 및 자금 집행", "scope": "IC결과수령~사후보관",
     "steps": [{"step": 1, "name": "IC결과수령", "forms": ["OPS-F01"]}, {"step": 2, "name": "계약협의"}, {"step": 3, "name": "집행준비"}, {"step": 4, "name": "투자금집행"}, {"step": 5, "name": "사후보관"}],
     "required_forms": ["OPS-F01"]},
    {"document_number": "SOP-PRG-01", "title": "포트폴리오 온보딩 및 보육 운영", "owning_team": "incubation",
     "purpose": "포트폴리오 기업의 성장 병목 제거", "scope": "온보딩~월간리뷰",
     "steps": [{"step": 1, "name": "온보딩", "forms": ["PRG-F01"]}, {"step": 2, "name": "진단회의"}, {"step": 3, "name": "90일액션플랜", "forms": ["PRG-F02"]}, {"step": 4, "name": "멘토링", "forms": ["PRG-F03"]}, {"step": 5, "name": "월간리뷰", "forms": ["PRG-F04"]}],
     "required_forms": ["PRG-F01", "PRG-F02", "PRG-F03", "PRG-F04"]},
    {"document_number": "SOP-OI-01", "title": "오픈이노베이션 및 PoC 운영", "owning_team": "oi",
     "purpose": "수요기업-스타트업 매칭 및 PoC 관리", "scope": "수요발굴~종료/전환",
     "steps": [{"step": 1, "name": "수요발굴", "forms": ["OI-F01"]}, {"step": 2, "name": "스타트업매칭"}, {"step": 3, "name": "PoC설계", "forms": ["OI-F02"]}, {"step": 4, "name": "실행관리", "forms": ["OI-F03"]}, {"step": 5, "name": "종료/전환"}],
     "required_forms": ["OI-F01", "OI-F02", "OI-F03"]},
    {"document_number": "SOP-OPS-02", "title": "보고 및 컴플라이언스 관리", "owning_team": "backoffice",
     "purpose": "정기 보고 및 컴플라이언스 준수", "scope": "보고일정등록~제출/보관",
     "steps": [{"step": 1, "name": "보고일정등록", "forms": ["OPS-F02"]}, {"step": 2, "name": "자료취합"}, {"step": 3, "name": "검증"}, {"step": 4, "name": "제출/보관"}],
     "required_forms": ["OPS-F02"]},
]


async def get_templates(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[SOPTemplate], int]:
    query = select(SOPTemplate).where(SOPTemplate.is_deleted == False)  # noqa: E712
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(SOPTemplate.document_number).offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_template_by_id(db: AsyncSession, template_id: uuid.UUID) -> SOPTemplate | None:
    result = await db.execute(select(SOPTemplate).where(SOPTemplate.id == template_id, SOPTemplate.is_deleted == False))  # noqa: E712
    return result.scalar_one_or_none()


async def create_template(db: AsyncSession, data: SOPTemplateCreate, user: User) -> SOPTemplate:
    tmpl = SOPTemplate(**data.model_dump())
    db.add(tmpl)
    await db.flush()
    await activity_log_service.log(db, user.id, "create", {"entity": "sop_template", "doc": data.document_number})
    await db.refresh(tmpl)
    return tmpl


async def seed_templates(db: AsyncSession, user: User) -> int:
    count = 0
    today = date.today()
    for seed in SOP_SEEDS:
        existing = await db.execute(select(SOPTemplate).where(SOPTemplate.document_number == seed["document_number"]))
        if existing.scalar_one_or_none():
            continue
        tmpl = SOPTemplate(effective_date=today, checkpoints=[], **seed)
        db.add(tmpl)
        count += 1
    return count


async def get_executions(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[SOPExecution], int]:
    query = select(SOPExecution).where(SOPExecution.is_deleted == False)  # noqa: E712
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(SOPExecution.started_at.desc()).offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_execution_by_id(db: AsyncSession, exec_id: uuid.UUID) -> SOPExecution | None:
    result = await db.execute(select(SOPExecution).where(SOPExecution.id == exec_id, SOPExecution.is_deleted == False))  # noqa: E712
    return result.scalar_one_or_none()


async def start_execution(db: AsyncSession, data: SOPExecutionCreate, user: User) -> SOPExecution:
    tmpl = await get_template_by_id(db, data.sop_template_id)
    step_count = len(tmpl.steps) if tmpl else 5
    statuses = {str(i + 1): "pending" for i in range(step_count)}
    statuses["1"] = "in_progress"

    execution = SOPExecution(
        sop_template_id=data.sop_template_id, startup_id=data.startup_id,
        initiated_by=user.id, current_step=1, step_statuses=statuses, notes=data.notes,
    )
    db.add(execution)
    await db.flush()
    await activity_log_service.log(db, user.id, "create", {"entity": "sop_execution"}, startup_id=data.startup_id)
    await db.refresh(execution)
    return execution


async def advance_step(db: AsyncSession, execution: SOPExecution, data: SOPStepUpdate, user: User) -> SOPExecution:
    statuses = dict(execution.step_statuses)
    statuses[str(data.step_number)] = data.status

    if data.status == "completed":
        next_step = data.step_number + 1
        if str(next_step) in statuses:
            statuses[str(next_step)] = "in_progress"
            execution.current_step = next_step
        else:
            execution.completed_at = datetime.now(timezone.utc)

    execution.step_statuses = statuses
    await activity_log_service.log(db, user.id, "update", {"entity": "sop_execution", "step": data.step_number, "status": data.status}, startup_id=execution.startup_id)
    await db.refresh(execution)
    return execution

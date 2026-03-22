"""직무기술서 서비스 — CRUD + 10개 시드"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_description import JobDescription
from app.models.user import User
from app.schemas.job_description import JDCreate
from app.services import activity_log_service

JD_SEEDS = [
    {"jd_code": "JD-01", "title": "Sourcing Manager", "team": "sourcing", "reports_to": "Sourcing Lead",
     "purpose": "유망 초기기업을 발굴하고 고품질 딜플로우를 확보한다",
     "core_responsibilities": ["유망 스타트업 발굴", "상시/배치 모집 실행", "네트워크 구축", "1차 스크리닝", "심사팀 인계"],
     "authority_scope": ["1차 미팅 진행", "스크리닝 등급 부여", "심사팀 검토 요청"],
     "approval_required": ["최종 투자조건 결정", "법무 판단"]},
    {"jd_code": "JD-02", "title": "Sourcing Lead", "team": "sourcing", "reports_to": "Partner",
     "purpose": "소싱 전략을 수립하고 팀 성과를 관리한다",
     "core_responsibilities": ["소싱 전략 수립", "팀원 관리", "채널별 ROI 분석", "파트너 보고"],
     "authority_scope": ["소싱 전략 결정", "팀원 업무 배분"], "approval_required": ["투자위원회 안건"]},
    {"jd_code": "JD-03", "title": "Investment Associate", "team": "review", "reports_to": "Investment Manager",
     "purpose": "투자 의사결정이 가능하도록 심사자료를 구조화한다",
     "core_responsibilities": ["서류 검토", "인터뷰 심사", "DD 진행", "투자 메모 작성", "IC 상정자료 작성"],
     "authority_scope": ["DD 자료 요청", "투자검토 의견 제시"], "approval_required": ["계약서 최종 보관"]},
    {"jd_code": "JD-04", "title": "Investment Manager", "team": "review", "reports_to": "Partner",
     "purpose": "투자심사 프로세스를 총괄하고 품질을 관리한다",
     "core_responsibilities": ["심사 프로세스 총괄", "IC 운영", "투자조건 협상 지원", "리스크 관리"],
     "authority_scope": ["심사 일정 확정", "IC 안건 최종 확정"], "approval_required": ["밸류에이션 최종 결정"]},
    {"jd_code": "JD-05", "title": "Program Manager", "team": "incubation", "reports_to": "Head of Program",
     "purpose": "포트폴리오 기업의 성장 병목을 진단하고 해소한다",
     "core_responsibilities": ["온보딩 운영", "멘토링 기획", "KPI 관리", "IR 준비 지원", "데모데이 운영"],
     "authority_scope": ["멘토링 계획 수립", "기업별 지원 우선순위 제안"], "approval_required": ["투자 약속", "밸류에이션 협상"]},
    {"jd_code": "JD-06", "title": "Head of Program", "team": "incubation", "reports_to": "Partner",
     "purpose": "보육 프로그램 전체를 설계하고 성과를 관리한다",
     "core_responsibilities": ["프로그램 설계", "멘토단 관리", "배치 운영", "KPI 총괄", "대표 보고"],
     "authority_scope": ["프로그램 구조 결정", "멘토 배정"], "approval_required": ["예산 확정"]},
    {"jd_code": "JD-07", "title": "Open Innovation Manager", "team": "oi", "reports_to": "Head of OI",
     "purpose": "스타트업과 수요기업 간 협업 기회를 PoC와 계약으로 전환한다",
     "core_responsibilities": ["파트너 발굴", "매칭", "PoC 기획", "실증 관리", "전략투자 연결"],
     "authority_scope": ["파트너 미팅 주관", "PoC 구조 제안"], "approval_required": ["법적 구속력 있는 거래 약속"]},
    {"jd_code": "JD-08", "title": "Head of Open Innovation", "team": "oi", "reports_to": "Partner",
     "purpose": "OI 전략을 수립하고 팀 성과를 관리한다",
     "core_responsibilities": ["OI 전략", "파트너십 총괄", "전략투자 협의", "정부사업 연계"],
     "authority_scope": ["파트너십 전략 결정"], "approval_required": ["투자조건 확약"]},
    {"jd_code": "JD-09", "title": "Operations Manager", "team": "backoffice", "reports_to": "Head of Operations",
     "purpose": "투자 계약, 보고, 컴플라이언스의 실무 통제를 담당한다",
     "core_responsibilities": ["계약서 관리", "투자집행", "Cap Table", "보고서 작성", "컴플라이언스"],
     "authority_scope": ["계약 문서 검토 요청", "보고자료 제출 요청"], "approval_required": ["투자판단", "성장전략 수립"]},
    {"jd_code": "JD-10", "title": "Head of Operations", "team": "backoffice", "reports_to": "Partner",
     "purpose": "백오피스 전체 운영을 총괄하고 리스크를 통제한다",
     "core_responsibilities": ["운영 총괄", "감사 대응", "규정 관리", "조합 관리", "대표 보고"],
     "authority_scope": ["운영 프로세스 결정", "시정 요청"], "approval_required": ["투자 의사결정"]},
]


async def get_list(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[JobDescription], int]:
    query = select(JobDescription).where(JobDescription.is_deleted == False)  # noqa: E712
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(JobDescription.jd_code).offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, jd_id: uuid.UUID) -> JobDescription | None:
    result = await db.execute(select(JobDescription).where(JobDescription.id == jd_id, JobDescription.is_deleted == False))  # noqa: E712
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: JDCreate, user: User) -> JobDescription:
    jd = JobDescription(**data.model_dump(), daily_tasks=[], weekly_tasks=[], monthly_tasks=[],
                         collaboration_teams=[], deliverables=[], kpi_quantitative=[],
                         required_skills={}, preferred_qualifications=[], responsibility_scope=[])
    db.add(jd)
    await db.flush()
    await activity_log_service.log(db, user.id, "create", {"entity": "job_description", "jd_code": data.jd_code})
    await db.refresh(jd)
    return jd


async def seed_jds(db: AsyncSession, user: User) -> int:
    count = 0
    for seed in JD_SEEDS:
        existing = await db.execute(select(JobDescription).where(JobDescription.jd_code == seed["jd_code"]))
        if existing.scalar_one_or_none():
            continue
        jd = JobDescription(
            **seed, daily_tasks=[], weekly_tasks=[], monthly_tasks=[],
            collaboration_teams=[], deliverables=[], kpi_quantitative=[],
            required_skills={}, preferred_qualifications=[], responsibility_scope=[],
        )
        db.add(jd)
        count += 1
    return count

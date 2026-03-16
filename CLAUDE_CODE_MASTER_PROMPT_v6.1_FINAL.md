# 딥테크 액셀러레이터 업무운영시스템 (Operations OS)
## Claude Code 마스터 프롬프트 v6.1 FINAL

> 이 문서는 Claude Code가 프로젝트 전체 맥락을 이해하고, 일관된 아키텍처로 시스템을 구축하기 위한 **프로젝트 정의서(CLAUDE.md)** 입니다.
> `CLAUDE.md` 파일로 프로젝트 루트에 배치하세요.

---

## 1. 프로젝트 개요

### 1-1. 시스템 정의
딥테크 액셀러레이터(창업기획자)의 **전주기 업무를 디지털화**하는 웹 기반 운영 플랫폼이다.
"좋은 초기기업을 발굴 → 심사 → 투자 → 보육 → 수요기업 연결 → 후속투자 → 회수"까지
**하나의 파이프라인**으로 연결되는 운영시스템을 구축한다.

### 1-2. 핵심 설계 원칙
1. **릴레이 관리**: 스타트업은 '한 팀 전담'이 아니라 팀 간 인계 흐름으로 관리한다.
2. **단일 기업 ID**: 소싱부터 사후관리까지 같은 기업 ID + 같은 데이터룸으로 이어진다.
3. **문서·KPI 기반 의사결정**: 구두 판단이 아니라 기록과 수치로 결정한다.
4. **성장 병목 제거**: 보육은 이벤트/교육이 아니라 개별 성장병목 제거 프로젝트다.
5. **PoC→계약→매출 전환**: 수요기업 연결은 소개가 아니라 거래와 실증으로 이어져야 한다.
6. **백오피스 = 리스크 통제**: 행정지원이 아니라 투자·계약·컴플라이언스 통제 허브다.
7. **회수 전략은 투자 시점부터 설계**: 특히 딥테크는 투자부터 exit 경로를 가정해야 한다.

### 1-3. 사용자 조직 구조
```
대표/파트너 (투자위원회 IC)
├── Sourcing팀: 딜발굴·파이프라인·1차스크리닝
├── 심사팀: 서류심사·인터뷰·DD·투자메모·IC상정
├── 보육팀: 온보딩·멘토링·KPI관리·IR/DemoDay
├── 오픈이노베이션팀: 수요기업매칭·PoC·실증·전략투자
└── 백오피스팀: 계약·집행·조합·보고·컴플라이언스
```

### 1-4. 투자 전략(Thesis) 설계 — 시스템에 설정값으로 내장
시스템 `admin/settings`에서 관리하는 조직 레벨 설정:
```
투자 Thesis:
- 집중 산업: [반도체, 모빌리티, AI, 배터리, 로보틱스]  ← 선택형 태그
- 투자 단계: [예비창업, Pre-seed, Seed]
- 지원 방식: [현금투자, 보육공간, 멘토링, 실증, 고객연결]
- 성과 목표: {후속투자유치율: 60%, 매출성장률: 200%, PoC성사율: 30%, TIPS선정률: 40%}

운영 모델:
- 연간 배치 수: 2
- 배치당 선발 팀 수: 10
- 1개사 평균 투자금: 50,000,000 원
- 의무 보육기간: 6개월
- 데모데이: 배치 종료 시

자금 구조:
- 자기자본 직접투자
- 개인투자조합 (등록 창업기획자 자격)
- 벤처투자조합
- 정부 연계 프로그램 (TIPS 운영사)
- LP 네트워크
- CVC 공동투자
```
이 설정값들은 소싱팀의 타깃 정의, 심사팀의 전략 적합성 평가, KPI 목표 설정에 자동 연동된다.

### 1-5. 운영 배포 환경
- 로컬 개발: `C:\Users\jghyu\elsa`
- 외부 접근: Cloudflare Tunnel (`jghyun.cloudflareaccess.com`)
- 다중 사용자 동시 접속 지원 필수

---

## 2. 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| Backend | **FastAPI** (Python 3.11+) | async, Pydantic v2 |
| Frontend | **Next.js 14** (App Router) | TypeScript, Tailwind CSS, shadcn/ui |
| Database | **PostgreSQL 16** | UTF-8 설정 필수, 주 DB |
| Cache/Queue | **Redis 7** | 캐시 + Celery broker |
| Task Queue | **Celery** | 비동기 작업 (알림, KPI 자동집계, 보고서 생성) |
| ORM | **SQLAlchemy 2.0** | async session |
| Auth | **JWT** + Role-Based Access Control | 팀별 권한 분리 |
| Deploy | **Docker Compose** | 로컬 개발 + Cloudflare Tunnel |
| 파일저장 | 로컬 volume (초기) → S3 호환 (확장) | |
| Migration | **Alembic** | DB 스키마 버전 관리 |

---

## 3. 데이터베이스 스키마

### 3-1. 핵심 엔티티 관계
```
[Startup] ←1:N→ [DealFlow] ←1:N→ [Screening]
    ↓                                    ↓
[DueDiligence] ←→ [InvestmentMemo]  [ICDecision]
    ↓                                    ↓
[InvestmentContract] ←→ [CapTable]  [Portfolio]
    ↓                                    ↓
[Incubation] ←1:N→ [Mentoring]     [KPIRecord]
    ↓                                    ↓
[OpenInnovation] ←1:N→ [PoC]       [PartnerMatch]
    ↓                                    ↓
[FollowOnInvestment]                [Exit]
```

### 3-2. Enum 정의 (반드시 이 값들을 사용)

```python
# --- 파이프라인 단계 ---
class DealStage(str, Enum):
    INBOUND = "inbound"                    # 유입
    FIRST_SCREENING = "first_screening"    # 1차 스크리닝
    DEEP_REVIEW = "deep_review"            # 심층검토
    INTERVIEW = "interview"                # 인터뷰
    DUE_DILIGENCE = "due_diligence"        # 기초실사
    IC_PENDING = "ic_pending"              # 투자위 상정 대기
    IC_REVIEW = "ic_review"               # 투자위 심사중
    APPROVED = "approved"                  # 승인
    CONDITIONAL = "conditional"            # 조건부 승인
    ON_HOLD = "on_hold"                   # 보류
    INCUBATION_FIRST = "incubation_first" # 보육 우선 후 재심
    REJECTED = "rejected"                  # 부결
    CONTRACT = "contract"                  # 계약 진행
    CLOSED = "closed"                      # 클로징 완료
    PORTFOLIO = "portfolio"                # 포트폴리오 편입

# --- 투자위원회 결정 ---
class ICDecisionType(str, Enum):
    APPROVED = "approved"
    CONDITIONAL = "conditional"
    ON_HOLD = "on_hold"
    INCUBATION_FIRST = "incubation_first"
    REJECTED = "rejected"

# --- 투자 구조 ---
class InvestmentVehicle(str, Enum):
    COMMON_STOCK = "common_stock"             # 보통주
    PREFERRED_STOCK = "preferred_stock"       # 우선주
    RCPS = "rcps"                             # 상환전환우선주
    CONVERTIBLE_NOTE = "convertible_note"     # CB
    SAFE = "safe"
    DIRECT = "direct"                         # 자기자본 직접투자
    INDIVIDUAL_UNION = "individual_union"     # 개인투자조합
    VENTURE_FUND = "venture_fund"             # 벤처투자조합

# --- 딜소싱 채널 ---
class SourcingChannel(str, Enum):
    UNIVERSITY_LAB = "university_lab"              # 대학/연구소
    CORPORATE_OI = "corporate_oi"                  # 대기업 오픈이노베이션
    PORTFOLIO_REFERRAL = "portfolio_referral"       # 포트폴리오/창업자 추천
    VC_CVC_ANGEL = "vc_cvc_angel"                  # VC/CVC/엔젤 네트워크
    PUBLIC_PROGRAM = "public_program"              # 공공기관/지자체
    COMPETITION_FORUM = "competition_forum"        # 경진대회/포럼/학회
    ONLINE_APPLICATION = "online_application"      # 온라인 상시모집
    DIRECT_OUTREACH = "direct_outreach"            # 직접 발굴
    TECH_EXPO = "tech_expo"                        # 기술전시회

# --- 포트폴리오 등급 ---
class PortfolioGrade(str, Enum):
    A = "A"  # 후속투자 임박, 집중 지원
    B = "B"  # 시장검증 필요, 실증/고객 연결 우선
    C = "C"  # 전략 전환 필요
    D = "D"  # 회수 가능성 낮음, 최소 관리

# --- PoC 상태 ---
class PoCStatus(str, Enum):
    DEMAND_IDENTIFIED = "demand_identified"        # 수요발굴
    MATCHING = "matching"                          # 매칭진행
    PLANNING = "planning"                          # PoC설계
    KICKOFF = "kickoff"
    IN_PROGRESS = "in_progress"
    MID_REVIEW = "mid_review"
    COMPLETED = "completed"
    COMMERCIAL_CONTRACT = "commercial_contract"    # 상용 계약 전환
    JOINT_DEVELOPMENT = "joint_development"        # 공동개발 확대
    STRATEGIC_INVESTMENT = "strategic_investment"   # 전략적 투자 검토
    RETRY = "retry"                                # 보완 후 재실증
    TERMINATED = "terminated"

# --- 회수 방식 ---
class ExitType(str, Enum):
    SECONDARY_SALE = "secondary_sale"      # 구주매각
    MA = "ma"                              # M&A
    STRATEGIC_SALE = "strategic_sale"      # 전략적 지분매각
    IPO = "ipo"
    SECONDARY_MARKET = "secondary_market"  # 세컨더리
    TECH_TRANSFER = "tech_transfer"        # 기술이전
    JV = "jv"                              # 합작법인
    WRITEOFF = "writeoff"                  # 손실처리

# --- 계약 진행 상태 ---
class ContractStatus(str, Enum):
    IC_RECEIVED = "ic_received"            # IC결과수령
    TERM_SHEET = "term_sheet"              # 텀시트협의
    LEGAL_REVIEW = "legal_review"          # 법무검토
    SIGNING = "signing"                    # 서명진행
    DISBURSEMENT = "disbursement"          # 집행준비
    COMPLETED = "completed"                # 집행완료
    POST_FILING = "post_filing"            # 사후문서정리

# --- 회의 유형 ---
class MeetingType(str, Enum):
    WEEKLY_DEAL = "weekly_deal"            # 주간딜회의
    WEEKLY_PORTFOLIO = "weekly_portfolio"  # 주간포트폴리오회의
    MONTHLY_OPS = "monthly_ops"           # 월간운영회의
    IC = "ic"                             # 투자위원회
    MENTORING = "mentoring"               # 멘토링
    PARTNER_REVIEW = "partner_review"     # 파트너십회의
    RISK_REVIEW = "risk_review"           # 리스크점검회의

# --- 알림 유형 ---
class NotificationType(str, Enum):
    HANDOVER_REQUEST = "handover_request"  # 인계요청
    DEADLINE_ALERT = "deadline_alert"      # 기한알림
    IC_SCHEDULE = "ic_schedule"            # IC일정
    KPI_WARNING = "kpi_warning"            # KPI경고 (3개월 연속 하락)
    REPORT_DEADLINE = "report_deadline"    # 보고기한
    CRISIS_ALERT = "crisis_alert"          # 위기감지 (현금고갈, 인력이탈 등)
    ESCALATION = "escalation"              # 에스컬레이션 (미확인 인계 24h)
    CONTRACT_OVERDUE = "contract_overdue"  # 계약 10일 초과
```

### 3-3. 핵심 테이블 설계

```python
# === 스타트업 (단일 기업 ID — 전 시스템 공통) ===
class Startup(Base):
    __tablename__ = "startups"
    id: Mapped[uuid.UUID]            # 전체 파이프라인 관통 ID
    company_name: Mapped[str]
    corporate_number: Mapped[str | None]     # 법인등록번호
    ceo_name: Mapped[str]
    industry: Mapped[str]                    # 반도체, 모빌리티, AI, 배터리, 로보틱스 등
    stage: Mapped[str]                       # 예비창업, Pre-seed, Seed, Pre-A
    one_liner: Mapped[str]
    problem_definition: Mapped[str | None]
    solution_description: Mapped[str | None]
    team_size: Mapped[int | None]
    is_fulltime: Mapped[bool]               # 전일제 여부
    sourcing_channel: Mapped[SourcingChannel]
    referrer: Mapped[str | None]            # 추천인
    current_deal_stage: Mapped[DealStage]
    portfolio_grade: Mapped[PortfolioGrade | None]
    is_portfolio: Mapped[bool]              # 포트폴리오 편입 여부
    program_batch: Mapped[str | None]       # 배치명
    invested_at: Mapped[datetime | None]    # 투자 실행일
    assigned_manager_id: Mapped[uuid.UUID | None]  # 전담 매니저
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    # soft delete
    is_deleted: Mapped[bool] = False

# === 딜플로우 파이프라인 (CRM) ===
class DealFlow(Base):
    __tablename__ = "deal_flows"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]        # FK → startups
    stage: Mapped[DealStage]
    moved_at: Mapped[datetime]           # 단계 이동 시각
    moved_by: Mapped[uuid.UUID]          # 누가 이동시켰는가
    notes: Mapped[str | None]

# === 1차 스크리닝 ===
class Screening(Base):
    __tablename__ = "screenings"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    screener_id: Mapped[uuid.UUID]
    fulltime_commitment: Mapped[int]     # 1-5 점
    problem_clarity: Mapped[int]
    tech_differentiation: Mapped[int]
    market_potential: Mapped[int]
    initial_validation: Mapped[int]
    legal_clear: Mapped[bool]
    strategy_fit: Mapped[int]
    overall_score: Mapped[float]
    recommendation: Mapped[str]          # pass / review / reject
    risk_notes: Mapped[str | None]       # 핵심 리스크 3개
    handover_memo: Mapped[str | None]    # 심사팀 인계 메모
    created_at: Mapped[datetime]

# === 심사 (서류 + 인터뷰 + DD) ===
class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    reviewer_id: Mapped[uuid.UUID]
    review_type: Mapped[str]             # document / interview / dd
    # 서류심사 5축
    team_score: Mapped[int | None]       # 팀: 집착력, 전문성, 실행력
    problem_score: Mapped[int | None]    # 문제: 고객 고통의 진짜 여부
    solution_score: Mapped[int | None]   # 해결책: 차별화된 제품/기술
    market_score: Mapped[int | None]     # 시장: 충분한 크기
    traction_score: Mapped[int | None]   # 진척도: 학습속도
    # 인터뷰 평가
    number_literacy: Mapped[int | None]  # 사업을 숫자로 이해하는가
    customer_experience: Mapped[int | None]
    tech_moat: Mapped[int | None]
    execution_plan: Mapped[int | None]   # 12개월 실행계획
    feedback_absorption: Mapped[int | None]
    cofounder_stability: Mapped[int | None]
    # DD 체크리스트 (JSON)
    dd_checklist: Mapped[dict | None]    # 법인등기, 주주구조, IP, 재무 등 10개항
    risk_log: Mapped[str | None]
    overall_verdict: Mapped[str]         # proceed / concern / reject
    started_at: Mapped[datetime]
    completed_at: Mapped[datetime | None]

# === 투자 메모 ===
class InvestmentMemo(Base):
    __tablename__ = "investment_memos"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    author_id: Mapped[uuid.UUID]
    version: Mapped[int]                 # 버전 관리
    # 투자 메모 9개 필수 섹션
    overview: Mapped[str]                # 투자 개요
    team_assessment: Mapped[str]         # 팀 평가
    market_assessment: Mapped[str]       # 시장 평가
    tech_product_assessment: Mapped[str] # 기술/제품 평가
    traction: Mapped[str]
    risks: Mapped[str]                   # 5대 리스크 (팀/시장/기술/법무/자금)
    value_add_points: Mapped[str]        # 기대 밸류업 포인트
    proposed_terms: Mapped[dict]         # 제안 투자조건 (JSON)
    post_investment_plan: Mapped[str]    # 투자 후 6개월 지원전략
    status: Mapped[str]                  # draft / submitted / ic_ready
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

# === 투자위원회 결정 ===
class ICDecision(Base):
    __tablename__ = "ic_decisions"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    memo_id: Mapped[uuid.UUID]           # FK → investment_memos
    decision: Mapped[ICDecisionType]
    conditions: Mapped[str | None]       # 조건부 승인 시 조건
    monitoring_points: Mapped[str | None]
    attendees: Mapped[list]              # 참석자 목록
    contract_assignee_id: Mapped[uuid.UUID | None]  # 계약 담당
    program_assignee_id: Mapped[uuid.UUID | None]   # 보육 인계 담당
    decided_at: Mapped[datetime]
    notes: Mapped[str | None]

# === 투자 계약 ===
class InvestmentContract(Base):
    __tablename__ = "investment_contracts"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    ic_decision_id: Mapped[uuid.UUID]
    status: Mapped[ContractStatus]
    # 주요 협의 항목 10개
    investment_amount: Mapped[int]       # 투자금액 (원, Decimal 권장)
    pre_money_valuation: Mapped[int]     # 기업가치
    equity_pct: Mapped[Decimal]          # 지분율
    vehicle: Mapped[InvestmentVehicle]   # 투자구조
    follow_on_rights: Mapped[bool]       # 후속투자 권리
    information_rights: Mapped[bool]
    lockup_months: Mapped[int | None]    # 보호예수 기간
    reverse_vesting: Mapped[bool]        # 핵심인력 리버스베스팅
    conditions_precedent: Mapped[dict | None]  # 선행조건(CP) JSON
    representations_warranties: Mapped[str | None]  # 진술·보장
    # 계약 문서 추적
    termsheet_doc_id: Mapped[str | None]
    sha_doc_id: Mapped[str | None]       # 신주인수계약
    sha_agreement_doc_id: Mapped[str | None]  # 주주간계약
    articles_amendment_doc_id: Mapped[str | None]  # 정관 개정안
    board_minutes_doc_id: Mapped[str | None]  # 이사회/주총 의사록
    # 클로징 체크리스트
    closing_checklist: Mapped[dict | None]  # OPS-F01 10개 항목 JSON
    signed_at: Mapped[datetime | None]
    closed_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

# === Cap Table ===
class CapTableEntry(Base):
    __tablename__ = "cap_table_entries"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    shareholder_name: Mapped[str]
    share_type: Mapped[str]              # common / preferred / rcps / option
    shares: Mapped[int]
    ownership_pct: Mapped[Decimal]
    investment_amount: Mapped[int | None]
    investment_date: Mapped[date | None]
    round_name: Mapped[str | None]       # Seed, Pre-A, Series A 등
    notes: Mapped[str | None]
    created_at: Mapped[datetime]

# === 보육 (Incubation) ===
class Incubation(Base):
    __tablename__ = "incubations"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    batch_name: Mapped[str | None]       # 배치명
    program_start: Mapped[date]
    program_end: Mapped[date]
    assigned_pm_id: Mapped[uuid.UUID]    # 전담 PM
    # 온보딩 진단 7개 항목
    diagnosis: Mapped[dict | None]       # {customer, product, tech, org, sales, finance, investment_readiness}
    # 90일 액션플랜
    action_plan: Mapped[dict | None]     # {goals, hypotheses, experiments, owners, timeline, resources}
    growth_bottleneck: Mapped[str | None]
    portfolio_grade: Mapped[PortfolioGrade]
    status: Mapped[str]                  # onboarding / active / graduated / paused
    # 위기 신호 플래그
    crisis_flags: Mapped[dict | None]    # {cash_critical, key_person_left, customer_churn, dev_delay, lawsuit}
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

# === 멘토링 세션 ===
class MentoringSession(Base):
    __tablename__ = "mentoring_sessions"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    mentor_id: Mapped[uuid.UUID | None]  # nullable for 외부 멘토
    mentor_name: Mapped[str]             # 외부 멘토도 지원
    mentor_type: Mapped[str]             # dedicated / functional / industry / investment / customer_dev
    session_date: Mapped[datetime]
    # 실행관리 구조 (이벤트가 아닌 실행관리)
    pre_agenda: Mapped[str | None]       # 사전 아젠다
    discussion_summary: Mapped[str]      # 세션 내용 요약
    feedback: Mapped[str | None]         # 피드백 요약
    action_items: Mapped[list]           # 액션아이템 목록 (JSON: [{item, owner, deadline, status}])
    next_session_date: Mapped[date | None]
    action_completion_rate: Mapped[float | None]  # 이행률 (0-100)
    improvement_notes: Mapped[str | None]  # 실제 개선사항
    pm_confirmed_by: Mapped[uuid.UUID | None]
    created_at: Mapped[datetime]

# === KPI 기록 ===
class KPIRecord(Base):
    __tablename__ = "kpi_records"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    period: Mapped[str]                  # 2026-03 (YYYY-MM)
    period_type: Mapped[str]             # monthly / biweekly / quarterly
    # 12개 핵심 KPI
    revenue: Mapped[int | None]
    customer_count: Mapped[int | None]
    active_users: Mapped[int | None]
    poc_count: Mapped[int | None]
    repurchase_rate: Mapped[float | None]
    release_velocity: Mapped[str | None]  # 제품 릴리즈 속도
    cac: Mapped[int | None]
    ltv: Mapped[int | None]
    pilot_conversion_rate: Mapped[float | None]
    mou_to_contract_rate: Mapped[float | None]
    headcount: Mapped[int | None]
    runway_months: Mapped[float | None]
    follow_on_meetings: Mapped[int | None]  # 후속투자 미팅 수
    # 해석 메모
    notes: Mapped[str | None]
    created_at: Mapped[datetime]

# === 오픈이노베이션 / 파트너 매칭 ===
class PartnerDemand(Base):
    __tablename__ = "partner_demands"
    id: Mapped[uuid.UUID]
    partner_company: Mapped[str]         # 수요기업명
    contact_name: Mapped[str | None]
    department: Mapped[str | None]       # 현업부서 (대외협력부서가 아닌)
    demand_type: Mapped[str]             # tech_adoption / joint_dev / vendor / new_biz / strategic_invest
    description: Mapped[str]
    tech_requirements: Mapped[str | None]
    timeline: Mapped[str | None]
    budget_range: Mapped[str | None]
    nda_required: Mapped[bool]
    candidate_startups: Mapped[list | None]  # [{startup_id, fit_reason}]
    status: Mapped[str]                  # open / matched / in_poc / contracted / closed
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class PoCProject(Base):
    __tablename__ = "poc_projects"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    partner_demand_id: Mapped[uuid.UUID]
    project_name: Mapped[str]
    # PoC 설계 7개 필수항목
    objective: Mapped[str]               # 목표
    scope: Mapped[str]                   # 범위
    duration_weeks: Mapped[int]          # 기간
    validation_metrics: Mapped[list]     # 검증지표 (JSON)
    cost_structure: Mapped[str | None]   # 비용부담 구조
    data_scope: Mapped[str | None]       # 데이터 제공 범위
    success_criteria: Mapped[str]        # 성공 기준
    next_step_if_success: Mapped[str | None]  # 성공 시 다음 단계
    # 추가 PoC 제안서 필드 (OI-F02)
    participants: Mapped[dict | None]    # 참여기관
    role_division: Mapped[str | None]    # 역할 분담
    provided_resources: Mapped[str | None]  # 제공 자원
    key_risks: Mapped[list | None]       # 리스크 및 대응
    # 진행관리 (OI-F03)
    status: Mapped[PoCStatus]
    kickoff_date: Mapped[date | None]
    completion_date: Mapped[date | None]
    weekly_issues: Mapped[str | None]
    support_needed: Mapped[str | None]
    partner_feedback: Mapped[str | None]
    startup_feedback: Mapped[str | None]
    conversion_likelihood: Mapped[str | None]  # 높음/중간/낮음
    result_summary: Mapped[str | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

# === 후속투자 ===
class FollowOnInvestment(Base):
    __tablename__ = "follow_on_investments"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    round_type: Mapped[str]              # bridge / pre_a / series_a / strategic
    target_amount: Mapped[int | None]
    # 투자자 맵 (JSON)
    investor_map: Mapped[dict | None]    # {angels, accelerators, seed_vc, pre_a_vc, cvc, strategic, overseas}
    # 매칭 기준: 산업이해도/단계적합성/ticket size/후속투자여력/밸류업기여/포트폴리오시너지충돌
    matching_criteria: Mapped[dict | None]
    lead_investor: Mapped[str | None]
    co_investors: Mapped[list | None]
    status: Mapped[str]                  # planning / ir_active / termsheet / closing / completed
    ir_meetings_count: Mapped[int]
    closed_at: Mapped[date | None]
    created_at: Mapped[datetime]

# === 회수 (Exit) ===
class ExitRecord(Base):
    __tablename__ = "exit_records"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    exit_type: Mapped[ExitType]
    exit_amount: Mapped[int | None]
    multiple: Mapped[Decimal | None]     # 수익배수
    # 회수 준비 체크리스트 7개항
    cap_table_clean: Mapped[bool]
    preferred_terms_reviewed: Mapped[bool]
    drag_tag_reviewed: Mapped[bool]      # drag/tag along
    ip_ownership_clean: Mapped[bool]
    accounting_transparent: Mapped[bool]
    customer_contracts_stable: Mapped[bool]
    management_issue_clear: Mapped[bool] # 경영권 이슈
    exit_date: Mapped[date | None]
    created_at: Mapped[datetime]

# === 팀 간 인계 문서 ===
class HandoverDocument(Base):
    __tablename__ = "handover_documents"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    from_team: Mapped[str]               # sourcing / review / incubation / oi / backoffice
    to_team: Mapped[str]
    handover_type: Mapped[str]           # 인계 유형 (6가지 경로)
    content: Mapped[dict]                # 인계 내용 (팀별 필수항목 JSON)
    created_by: Mapped[uuid.UUID]
    created_at: Mapped[datetime]
    acknowledged_by: Mapped[uuid.UUID | None]
    acknowledged_at: Mapped[datetime | None]
    # 에스컬레이션 (미확인 24시간 후)
    escalated: Mapped[bool] = False
    escalated_at: Mapped[datetime | None] = None

# === 회의 ===
class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[uuid.UUID]
    meeting_type: Mapped[MeetingType]
    title: Mapped[str]
    scheduled_at: Mapped[datetime]
    duration_minutes: Mapped[int | None]
    attendees: Mapped[list]              # [{user_id, team, role}]
    agenda_items: Mapped[list]           # 안건 목록
    minutes: Mapped[str | None]          # 회의록
    action_items: Mapped[list | None]    # [{item, assignee_id, deadline, status}]
    related_startup_ids: Mapped[list | None]
    created_by: Mapped[uuid.UUID]
    created_at: Mapped[datetime]

# === 사용자 및 권한 ===
class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID]
    name: Mapped[str]
    email: Mapped[str]
    hashed_password: Mapped[str]
    role: Mapped[str]                    # partner / analyst / pm / oi_manager / backoffice / admin
    team: Mapped[str]                    # sourcing / review / incubation / oi / backoffice
    role_title: Mapped[str | None]       # Sourcing Manager, Investment Associate 등
    is_active: Mapped[bool]
    created_at: Mapped[datetime]

# === 알림 ===
class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    title: Mapped[str]
    message: Mapped[str]
    notification_type: Mapped[NotificationType]
    related_entity_type: Mapped[str | None]  # startup / handover / meeting / contract
    related_entity_id: Mapped[uuid.UUID | None]
    is_read: Mapped[bool] = False
    created_at: Mapped[datetime]

# === 활동 로그 (감사 추적) ===
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID | None]
    action_type: Mapped[str]             # create / update / handover / decision / alert
    action_detail: Mapped[dict]          # JSON 상세
    created_at: Mapped[datetime]

# === 보고서 관리 ===
class Report(Base):
    __tablename__ = "reports"
    id: Mapped[uuid.UUID]
    report_name: Mapped[str]
    report_type: Mapped[str]             # 월간투자실적/분기포트폴리오/정부사업/LP보고
    target_recipient: Mapped[str]        # 대표/LP/기관
    responsible_team: Mapped[str]
    deadline: Mapped[date]
    prep_start_date: Mapped[date]
    status: Mapped[str]                  # 예정/준비중/진행중/제출완료/지연
    document_path: Mapped[str | None]
    is_recurring: Mapped[bool]           # 반복 여부
    recurrence_pattern: Mapped[str | None]  # monthly / quarterly
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

# === SOP 템플릿 ===
class SOPTemplate(Base):
    __tablename__ = "sop_templates"
    id: Mapped[uuid.UUID]
    document_number: Mapped[str]         # SOP-SRC-01, SOP-INV-01 등
    title: Mapped[str]
    version: Mapped[str]
    effective_date: Mapped[date]
    revision_date: Mapped[date | None]
    owning_team: Mapped[str]
    purpose: Mapped[str]
    scope: Mapped[str]
    steps: Mapped[list]                  # 절차 단계 (JSON)
    required_forms: Mapped[list]         # 관련 양식 코드 목록
    checkpoints: Mapped[list]            # 점검 포인트
    exception_rules: Mapped[str | None]
    is_active: Mapped[bool]

class SOPExecution(Base):
    __tablename__ = "sop_executions"
    id: Mapped[uuid.UUID]
    sop_template_id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID | None]
    initiated_by: Mapped[uuid.UUID]
    current_step: Mapped[int]
    step_statuses: Mapped[dict]          # {step_number: "completed"|"in_progress"|"pending"}
    started_at: Mapped[datetime]
    completed_at: Mapped[datetime | None]
    notes: Mapped[str | None]

# === 양식 시스템 ===
class FormTemplate(Base):
    __tablename__ = "form_templates"
    id: Mapped[uuid.UUID]
    form_code: Mapped[str]               # SRC-F01, INV-F02 등
    title: Mapped[str]
    description: Mapped[str | None]
    owning_team: Mapped[str]
    fields: Mapped[list]                 # JSON: [{name, type, required, options, ...}]
    version: Mapped[str]
    is_active: Mapped[bool]

class FormSubmission(Base):
    __tablename__ = "form_submissions"
    id: Mapped[uuid.UUID]
    form_template_id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID | None]
    submitted_by: Mapped[uuid.UUID]
    data: Mapped[dict]                   # 실제 입력 데이터 (JSON)
    status: Mapped[str]                  # draft / submitted / reviewed / archived
    submitted_at: Mapped[datetime]
    reviewed_by: Mapped[uuid.UUID | None]
    reviewed_at: Mapped[datetime | None]

# === 팀별 KPI ===
class TeamKPI(Base):
    __tablename__ = "team_kpis"
    id: Mapped[uuid.UUID]
    team: Mapped[str]
    period: Mapped[str]                  # 2026-03
    kpi_layer: Mapped[str]               # input / process / output / outcome
    kpi_name: Mapped[str]
    kpi_definition: Mapped[str]
    target_value: Mapped[float]
    actual_value: Mapped[float | None]
    achievement_rate: Mapped[float | None]  # 자동 계산
    mom_change: Mapped[str | None]       # 전월 대비
    notes: Mapped[str | None]
    updated_by: Mapped[uuid.UUID]
    updated_at: Mapped[datetime]

# === 직무기술서 ===
class JobDescription(Base):
    __tablename__ = "job_descriptions"
    id: Mapped[uuid.UUID]
    jd_code: Mapped[str]                 # JD-01 ~ JD-10
    title: Mapped[str]
    team: Mapped[str]
    reports_to: Mapped[str]
    purpose: Mapped[str]
    core_responsibilities: Mapped[list]
    daily_tasks: Mapped[list]
    weekly_tasks: Mapped[list]
    monthly_tasks: Mapped[list]
    quarterly_annual_tasks: Mapped[list | None]
    collaboration_teams: Mapped[list]
    deliverables: Mapped[list]
    kpi_quantitative: Mapped[list]
    kpi_qualitative: Mapped[list | None]
    required_skills: Mapped[dict]        # {knowledge, skills, attitude}
    preferred_qualifications: Mapped[list]
    authority_scope: Mapped[list]
    approval_required: Mapped[list]
    responsibility_scope: Mapped[list]
    version: Mapped[str]
    is_active: Mapped[bool]
```

---

## 4. 5개 팀 모듈 상세 기능 명세

### 4-1. Sourcing팀 모듈

**미션**: 맞는 기업을 정확히 가져오는 팀 (건수가 아니라 적합도)

#### 화면 구성
1. **딜플로우 CRM 대시보드** (칸반보드 형태)
   - 컬럼: Inbound → 1차 스크리닝 → 심층검토 대기 → 심사팀 인계 완료
   - 카드: 기업명, 산업, 소싱채널, 스크리닝 점수, 담당자
   - 드래그앤드롭으로 단계 이동 (이동 시 DealFlow 자동 기록)

2. **1차 스크리닝 폼** (SRC-F02 기반)
   - 7개 평가항목 각 1-5점 슬라이더
   - 핵심 리스크 3개 자유기술
   - 추천 등급 (Pass / Review / Reject)
   - 제출 시 자동 총점 계산

3. **심사팀 인계 패키지 생성**
   - 기업 개요 1페이지 자동 생성
   - 창업자 배경, 현재 단계, 검토 가치 사유, 핵심 리스크 3개
   - 인계 버튼 클릭 → 심사팀 대시보드에 자동 표시 + 알림

4. **소싱 분석 리포트** (자동 생성)
   - 채널별 유입 성과
   - 산업별 소싱 현황
   - 고품질 딜 비율 트렌드
   - 월간 소싱 KPI 대시보드

---

### 4-2. 심사팀 모듈

**미션**: 느낌이 아니라 투자 가능한 판단으로 바꾸는 팀

#### 화면 구성
1. **심사 파이프라인 대시보드**
   - 컬럼: 서류심사 → 인터뷰 → 기초실사 → 투자메모 작성 → IC 상정 → 결정
   - 기업별 심사 진행률 프로그레스바

2. **서류심사 폼** (5축 평가)
   - 팀(집착력/전문성/실행력) · 문제 · 해결책 · 시장 · 진척도
   - 각 1-5점 + 상세 코멘트
   - 자동 radar chart 시각화

3. **구조화 인터뷰 폼** (8개 질문축)
   - 체크리스트 + 점수 + 메모
   - 인터뷰 후 자동 요약 생성

4. **DD 체크리스트** (INV-F01, 10개 항목)
   - 법인등기, 주주구조, IP귀속, 공동창업자, 고용계약, 기존투자자, 고객/파트너계약, 재무/현금소진, 정부과제의존도, 소송/규제
   - 각 항목 상태: ✅완료 / ⚠️이슈발견 / ❌미완료
   - 이슈 발견 시 자동 리스크 로그 등록

5. **투자 메모 작성기** (INV-F02, 9개 섹션)
   - 가이드 템플릿 + 이전 심사 데이터 자동 프리필
   - 리스크 로그 자동 연동

6. **IC 안건 관리** (INV-F03)
   - IC 안건서 자동 생성 + 결정 기록
   - 결정 후 자동 인계 트리거

---

### 4-3. 보육팀 모듈

**미션**: 교육이 아니라 성장 병목을 제거하는 팀

#### 화면 구성
1. **포트폴리오 대시보드**
   - 기업 카드: 등급(A/B/C/D), 핵심 KPI 스파크라인, 전담 PM, 다음 액션
   - 위기 신호 자동 하이라이트 (현금고갈, 핵심인력이탈, 고객이탈 등)

2. **온보딩 워크플로우** (PRG-F01)
   - 2주 내 완료 체크리스트
   - 진단 7개 항목 평가 폼

3. **90일 액션플랜 빌더** (PRG-F02)
   - 딥테크 맞춤 분기: AI SaaS vs 반도체 vs 모빌리티 vs 바이오 템플릿
   - 마일스톤 간트차트

4. **멘토링 관리** (PRG-F03, 실행관리 중심)
   - 사전 아젠다 → 세션 기록 → 피드백 → 액션아이템 → 이행 확인
   - 액션아이템 이행률 자동 추적

5. **KPI 트래커** (PRG-F04)
   - 12개 지표 월간 입력 + 트렌드 차트 + 3개월 연속 하락 경보

6. **IR / Demo Day 준비**
   - 체크리스트: 1분피치, 5분피치, IR deck, 데이터룸, FAQ, 밸류에이션 논리
   - Demo Day 이후 4-8주 후속 추적 (미팅 스케줄, term sheet 협상)

---

### 4-4. 오픈이노베이션팀 모듈

**미션**: 소개가 아니라 거래와 실증으로 연결하는 팀

#### 화면 구성
1. **파트너 수요맵** (OI-F01)
   - 수요 유형 분류: 기술도입 / 공동개발 / 벤더발굴 / 신규사업 / 전략투자
   - 현업부서(!) 담당자 관리 (대외협력부서만 상대하는 것 방지)

2. **매칭 엔진**
   - 5개 기준: 기술적합성, 적용가능성, PoC준비도, 조직대응력, 일정/리소스 현실성

3. **PoC 프로젝트 관리** (OI-F02, OI-F03)
   - 상태 칸반: 수요발굴→매칭→설계→킥오프→진행→중간점검→종료→전환결과

4. **전환결과 추적**
   - 5가지 분류: 상용계약 / 공동개발확대 / 전략투자검토 / 보완후재실증 / 종료
   - 전략투자검토 → 심사팀 역인계 자동 트리거

5. **정부사업 연계 트래커**
   - TIPS/Pre-TIPS, R&D 과제, 규제샌드박스, 실증지원사업, 해외진출 바우처

---

### 4-5. 백오피스팀 모듈

**미션**: 행정이 아니라 리스크와 실행을 통제하는 팀

#### 화면 구성
1. **계약 관리 센터** (OPS-F01)
   - 워크플로우: IC결과수령 → 텀시트 → 법무검토 → 서명 → 집행 → 사후정리
   - 클로징 체크리스트 10개항

2. **투자 집행 관리**
   - 집행 상태 + Cap Table 자동 반영

3. **조합 관리**
   - 개인투자조합 / 벤처투자조합 / LP 보고

4. **보고 센터** (OPS-F02)
   - 보고 일정 캘린더 + 반복 보고 자동 재생성
   - 마감 7일전 / 3일전 / 당일 자동 알림

5. **컴플라이언스 대시보드**
   - 이해상충 체크 + 정보접근 권한 관리 + 감사 대응

---

## 5. 팀 간 인계 허브 (Cross-Team Handover Hub)

### 5-1. 인계 흐름 (6가지 경로)
```
Sourcing → 심사팀: {1차스크리닝시트, 기업개요, 추천사유, 핵심리스크3개, 추천등급}
심사팀 → 백오피스: {투자승인결과, 제안조건표, 선행조건리스트, 법무이슈메모}
심사팀 → 보육팀: {투자메모, 성장병목요약, 6개월핵심과제, 위험신호}
보육팀 → 오픈이노베이션: {기술/제품상태, PoC가능영역, 수요기업매칭우선순위, 대응가능리소스}
오픈이노베이션 → 심사팀: {전략투자가능성, 고객반응, 실증성과, 후속라운드설득포인트}
백오피스 → 전 조직: {계약상태, 보고기한, 리스크알림, 권한/문서업데이트}
```

### 5-2. 인계 규칙
- 인계 문서 생성 시 **수신팀에 자동 알림**
- 수신팀은 **확인(acknowledge) 버튼**을 눌러야 인계 완료
- 미확인 인계는 24시간 후 **에스컬레이션 알림**
- 모든 인계 기록은 기업 타임라인에 자동 기록

---

## 6. 회의체 관리

| 회의 | 주기 | 참석 | 핵심 안건 |
|------|------|------|-----------|
| 딜회의 | 주간 | Sourcing + 심사 + 대표 | 신규유입, 유망딜, 인터뷰일정, 탈락사유 |
| 포트폴리오 회의 | 주간 | 보육 + OI + 심사일부 | KPI변동, 병목, 멘토링이슈, PoC연결 |
| 운영회의 | 월간 | 전 팀 리더 + 대표 + 백오피스 | 딜플로우/투자/프로그램/파트너십/리스크 전체 리뷰 |
| 투자위원회(IC) | 수시 | 파트너 + 심사역 + 외부전문가 + 백오피스(배석) | 투자 승인/보류/부결 |
| 리스크점검 | 월간 | 전 팀 리더 + 백오피스 | 위기기업 점검, 보고이슈, 컴플라이언스 |

---

## 7. 권한 체계 (RBAC)

### 역할별 접근 권한 매트릭스

| 기능 | Partner | Sourcing | 심사 | 보육 | OI | 백오피스 |
|------|---------|----------|------|------|----|---------| 
| 딜플로우 CRM | Full | Full | Read | Read | Read | Read |
| 스크리닝 | Read | Full | Read | - | - | - |
| 심사/DD/투자메모 | Full | - | Full | Read | - | Read |
| IC 결정 | Full | - | Write | - | - | Read |
| 계약/집행 | Approve | - | - | - | - | Full |
| 밸류에이션 협상 | Full | - | Full | - | - | - |
| 보육/멘토링 | Read | - | Read | Full | Read | - |
| KPI | Full | - | Read | Full | Read | Read |
| 포트폴리오 등급 변경 | Full | - | - | Full | - | - |
| PoC/매칭 | Read | - | - | Read | Full | - |
| Cap Table | Read | - | Read | - | - | Full |
| 컴플라이언스 | Full | - | - | - | - | Full |
| 법적 계약 약속 | Full | - | - | - | - | - |

### 핵심 권한 제한 규칙 (시스템 강제)
- Sourcing팀은 최종 투자조건을 결정할 수 없다
- 심사팀은 계약서 최종 보관/관리를 단독으로 하지 않는다
- 보육팀은 투자 약속, 밸류에이션 협상을 하지 않는다
- OI팀은 법적 구속력 있는 거래 약속을 단독으로 하지 않는다
- 백오피스는 투자 판단, 성장전략 수립을 하지 않는다

---

## 8. 딥테크 특화 기능

### 8-1. 기술검증 심화 심사
- 논문형 기술 vs 실사용 엔지니어링 구분 필드
- 양산성/스케일업 가능성 평가
- 고객사 공정/시스템 적합성 평가

### 8-2. 실증 중심 PoC 설계
- 고객 장비/라인 적합성
- 샘플 검증 기간 추적
- 인증/신뢰성 테스트 단계 관리
- 구매전환 리드타임 추적

### 8-3. 딥테크 자금전략
- 단계별 자금조달 로드맵 (개발기간 길고 장비/인력비 큼)
- 정부 R&D + 민간투자 병행 관리
- CVC/SI 연계 추적
- 공동개발 계약 / 기술이전 / JV / M&A 시나리오 관리

### 8-4. 산업별 KPI 템플릿
```
반도체: PoC → 샘플테스트 → 신뢰성검증 → 설계 win → 양산
모빌리티: 실증 → 인증 → 파트너사검증 → 양산연계
AI SaaS: 고객전환율 → 유지율 → 파이프라인 확장
바이오/헬스: 규제단계 → 임상/인허가 → 기술검증
배터리: 소재검증 → 셀테스트 → 모듈 → 팩 → 양산
```

---

## 9. API 구조 (RESTful)

### 핵심 라우터
```
/api/v1/auth/              # 인증 (JWT)
/api/v1/users/             # 사용자 관리
/api/v1/startups/          # 스타트업 (단일 기업 ID)
/api/v1/deal-flow/         # 딜플로우 파이프라인
/api/v1/screening/         # 1차 스크리닝
/api/v1/reviews/           # 심사 (서류/인터뷰/DD)
/api/v1/investment-memos/  # 투자 메모
/api/v1/ic-decisions/      # 투자위 결정
/api/v1/contracts/         # 투자 계약
/api/v1/cap-table/         # Cap Table
/api/v1/incubation/        # 보육
/api/v1/mentoring/         # 멘토링 세션
/api/v1/kpi/               # KPI 기록 (기업별)
/api/v1/partners/          # 파트너 수요
/api/v1/poc/               # PoC 프로젝트
/api/v1/follow-on/         # 후속투자
/api/v1/exits/             # 회수
/api/v1/handovers/         # 팀간 인계
/api/v1/meetings/          # 회의
/api/v1/reports/           # 보고서 관리
/api/v1/notifications/     # 알림
/api/v1/activity-logs/     # 활동 로그
/api/v1/dashboard/         # 대시보드 집계
/api/v1/sop/templates/     # SOP 템플릿 CRUD
/api/v1/sop/executions/    # SOP 실행 추적
/api/v1/forms/templates/   # 양식 템플릿 CRUD
/api/v1/forms/submissions/ # 양식 제출 관리
/api/v1/kpi/team/{team}/   # 팀별 KPI 조회/입력
/api/v1/kpi/executive/     # 전사 대시보드 집계
/api/v1/jd/                # 직무기술서 CRUD
/api/v1/demo-days/         # Demo Day 관리
/api/v1/investor-meetings/ # 투자자 미팅 추적
/api/v1/settings/          # 조직 설정 (Thesis, 운영모델)
/api/v1/funds/             # 조합 CRUD + LP + 투자내역
/api/v1/government-programs/ # 정부사업 연계 추적
/api/v1/documents/         # 문서/파일 중앙 관리 (데이터룸)
/api/v1/mentors/           # 멘토 풀 관리
/api/v1/batches/           # 배치 프로그램 관리
```

---

## 10. 프로젝트 구조

```
elsa/
├── CLAUDE.md                          # 이 파일
├── docker-compose.yml
├── .env
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI 앱 진입점
│   │   ├── config.py                  # 설정 (DB, Redis, JWT)
│   │   ├── database.py                # SQLAlchemy async session
│   │   │
│   │   ├── models/                    # SQLAlchemy 모델
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── startup.py
│   │   │   ├── deal_flow.py
│   │   │   ├── screening.py
│   │   │   ├── review.py
│   │   │   ├── investment_memo.py
│   │   │   ├── ic_decision.py
│   │   │   ├── contract.py
│   │   │   ├── cap_table.py
│   │   │   ├── incubation.py
│   │   │   ├── mentoring.py
│   │   │   ├── kpi.py
│   │   │   ├── partner.py
│   │   │   ├── poc.py
│   │   │   ├── follow_on.py
│   │   │   ├── exit_record.py
│   │   │   ├── handover.py
│   │   │   ├── meeting.py
│   │   │   ├── notification.py
│   │   │   ├── activity_log.py
│   │   │   ├── report.py
│   │   │   ├── sop.py
│   │   │   ├── form.py
│   │   │   ├── team_kpi.py
│   │   │   ├── job_description.py
│   │   │   ├── demo_day.py
│   │   │   ├── investor_meeting.py
│   │   │   ├── organization_settings.py
│   │   │   ├── fund.py                  # §24 조합 관리
│   │   │   ├── government_program.py    # §25 정부사업
│   │   │   ├── document.py              # §26 문서/파일
│   │   │   ├── mentor.py                # §31 멘토 풀
│   │   │   └── batch.py                 # §32 배치 관리
│   │   │
│   │   ├── schemas/                   # Pydantic v2 스키마
│   │   │   └── (모델과 1:1 매핑)
│   │   │
│   │   ├── routers/                   # API 라우터
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── startups.py
│   │   │   ├── sourcing.py
│   │   │   ├── review.py
│   │   │   ├── contracts.py
│   │   │   ├── incubation.py
│   │   │   ├── open_innovation.py
│   │   │   ├── follow_on.py
│   │   │   ├── exits.py
│   │   │   ├── handovers.py
│   │   │   ├── meetings.py
│   │   │   ├── reports.py
│   │   │   ├── notifications.py
│   │   │   ├── dashboard.py
│   │   │   ├── sop.py
│   │   │   ├── forms.py
│   │   │   ├── team_kpi.py
│   │   │   ├── jd.py
│   │   │   ├── demo_days.py
│   │   │   ├── investor_meetings.py
│   │   │   ├── settings.py
│   │   │   ├── funds.py
│   │   │   ├── government_programs.py
│   │   │   ├── documents.py
│   │   │   ├── mentors.py
│   │   │   └── batches.py
│   │   │
│   │   ├── services/                  # 비즈니스 로직
│   │   │   ├── pipeline_service.py    # 딜 단계 이동 + 자동 인계
│   │   │   ├── handover_service.py    # 팀간 인계 자동화 + 에스컬레이션
│   │   │   ├── notification_service.py
│   │   │   ├── report_service.py
│   │   │   ├── kpi_alert_service.py   # KPI 3개월 하락 감지
│   │   │   ├── kpi_aggregation_service.py  # 팀별 KPI 자동 집계
│   │   │   ├── crisis_detection_service.py # 위기 감지 (현금/인력/고객)
│   │   │   ├── sop_automation_service.py   # SOP 단계별 자동화
│   │   │   ├── document_service.py        # 파일 업로드/다운로드/버전관리
│   │   │   └── portfolio_grade_service.py  # §33 등급 자동 산정
│   │   │
│   │   ├── tasks/                     # Celery 비동기 작업
│   │   │   ├── notifications.py       # 알림 발송
│   │   │   ├── kpi_aggregation.py     # KPI 자동 집계
│   │   │   ├── report_reminders.py    # 보고 마감 리마인더
│   │   │   ├── escalation.py          # 인계 미확인 에스컬레이션
│   │   │   └── crisis_scan.py         # 위기 신호 주기적 스캔
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.py                # JWT 검증
│   │   │   └── rbac.py                # 역할 기반 접근 제어
│   │   │
│   │   └── enums.py                   # 모든 Enum 정의
│   │
│   ├── alembic/                       # DB 마이그레이션
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # 메인 대시보드
│   │   │   ├── (auth)/
│   │   │   ├── sourcing/
│   │   │   ├── review/
│   │   │   ├── incubation/
│   │   │   ├── oi/
│   │   │   ├── backoffice/
│   │   │   ├── startup/[id]/          # 스타트업 통합 프로필
│   │   │   │   ├── overview/
│   │   │   │   ├── timeline/          # 전체 히스토리 타임라인
│   │   │   │   ├── documents/
│   │   │   │   └── handovers/
│   │   │   ├── meetings/
│   │   │   ├── admin/
│   │   │   │   ├── sop/
│   │   │   │   ├── forms/
│   │   │   │   ├── kpi-settings/
│   │   │   │   ├── jd/
│   │   │   │   └── organization/
│   │   │   ├── forms/
│   │   │   │   ├── [form-code]/       # 동적 양식 렌더러
│   │   │   │   └── submissions/
│   │   │   ├── sop/
│   │   │   │   ├── active/
│   │   │   │   └── [sop-id]/
│   │   │   └── kpi/
│   │   │       ├── team/[team]/
│   │   │       ├── executive/
│   │   │       └── startup/[id]/
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui
│   │   │   ├── kanban/
│   │   │   ├── forms/
│   │   │   │   ├── DynamicFormRenderer.tsx
│   │   │   │   ├── ScreeningForm.tsx
│   │   │   │   ├── InvestmentMemoForm.tsx
│   │   │   │   ├── ActionPlanTable.tsx
│   │   │   │   ├── MentoringLogForm.tsx
│   │   │   │   ├── KPICheckTable.tsx
│   │   │   │   ├── PoCProposalForm.tsx
│   │   │   │   └── ContractChecklist.tsx
│   │   │   ├── charts/
│   │   │   │   ├── KPILayerChart.tsx
│   │   │   │   ├── KPITrendLine.tsx
│   │   │   │   ├── KPIRadar.tsx
│   │   │   │   └── ExecutiveSummary.tsx
│   │   │   ├── sop/
│   │   │   │   ├── SOPProgressTracker.tsx
│   │   │   │   └── SOPChecklist.tsx
│   │   │   └── handover/
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── types.ts               # Backend Enum 미러링
│   │   │
│   │   └── hooks/
│   │
│   ├── package.json
│   ├── tailwind.config.ts
│   └── Dockerfile
│
└── nginx/
    └── nginx.conf
```

---

## 11. 구현 순서 (Phase별)

### Phase 1: 기반 인프라 + 인증 + 스타트업 CRUD
- Docker Compose 세팅 (FastAPI + Next.js + PostgreSQL + Redis)
- DB 스키마 생성 (Alembic migration)
- User 모델 + JWT 인증 + RBAC 미들웨어
- Startup CRUD + 기업 통합 프로필 페이지

### Phase 2: Sourcing팀 모듈
- DealFlow 칸반보드 (드래그앤드롭)
- 1차 스크리닝 폼 + 자동 채점
- 심사팀 인계 패키지 생성 + 알림
- 소싱 채널별 분석 대시보드

### Phase 2.5: 양식 엔진
- FormTemplate + FormSubmission 모델
- DynamicFormRenderer 컴포넌트
- SRC-F01, SRC-F02 양식 구현
- 양식 제출 → Startup/Screening 자동 연동

### Phase 3: 심사팀 모듈
- 서류심사 5축 폼 + radar chart
- 구조화 인터뷰 폼
- DD 체크리스트 + 리스크 로그
- 투자메모 작성기 + IC 안건 관리

### Phase 3.5: 심사팀 양식 확장
- INV-F01 DD 요청 + 자료 수령 추적
- INV-F02 투자 메모 9섹션 폼
- INV-F03 IC 결과지 + 자동 인계 트리거

### Phase 4: 백오피스팀 모듈
- 계약 관리 워크플로우 + 클로징 체크리스트
- 투자 집행 관리 + Cap Table
- 보고 센터 + 컴플라이언스 대시보드

### Phase 5: 보육팀 모듈
- 포트폴리오 대시보드 (등급, KPI 스파크라인)
- 온보딩 + 90일 액션플랜
- 멘토링 실행관리 시스템
- KPI 트래커 + 알림
- Demo Day / IR 관리

### Phase 5.5: 보육팀 양식 확장
- PRG-F01 ~ PRG-F04 전체 구현
- 멘토링 액션아이템 이행률 자동 추적
- KPI 자동 집계 + 3개월 하락 알림

### Phase 6: 오픈이노베이션팀 모듈
- 파트너 수요맵
- 매칭 테이블 + PoC 설계/관리
- 전환결과 추적
- 정부사업 연계 트래커

### Phase 7: 팀간 연결 + 고도화
- Handover Hub 완성 + 에스컬레이션
- 회의체 관리 시스템
- 통합 대시보드 (대표/파트너용)
- 자동 보고서 생성 (Celery)
- 위기감지 알림 시스템
- 활동 로그 + 감사 추적

### Phase 8: KPI 대시보드 + 전사 경영 뷰
- TeamKPI 모델 + 시드 데이터
- 팀별 4계층 KPI 대시보드 5종
- 전사 경영 대시보드
- KPI 자동 집계 엔진 (Celery task)

### Phase 9: SOP 엔진 + JD 관리
- SOPTemplate + SOPExecution 모델
- 6개 SOP 워크플로우 자동화
- SOP 진행 추적 UI
- JD 관리 + RBAC 연동

---

## 12. 코딩 규칙

### Backend (Python/FastAPI)
- Python 3.11+ 타입 힌트 필수
- Pydantic v2 스키마 사용
- SQLAlchemy 2.0 async 패턴
- 서비스 레이어 분리 (router → service → model)
- 모든 Enum은 `enums.py`에 중앙 관리
- 에러 응답은 HTTPException + 한글 메시지 포함
- 금액은 Decimal 타입 사용, 원화 기준

### Frontend (TypeScript/Next.js)
- App Router 사용 (pages/ 아님)
- TypeScript strict mode
- shadcn/ui + Tailwind CSS
- 서버 컴포넌트 우선, 필요 시 "use client"
- API 호출은 lib/api.ts로 중앙화
- 한글 UI (날짜 형식: YYYY.MM.DD)

### 공통
- 커밋 메시지: `[모듈] 설명` 형식 (예: `[sourcing] 딜플로우 칸반보드 구현`)
- 주석은 한글로 작성
- 환경변수는 .env 파일 관리
- 비밀번호, 토큰은 절대 하드코딩 금지
- 모든 timestamp는 Asia/Seoul timezone (KST)
- 삭제는 soft delete만 허용 (감사 추적)
- 모든 변경사항 activity_logs에 기록

---

## 13. 핵심 비즈니스 로직 주의사항

1. **딜 단계 이동 시 자동 인계**: DealStage가 변경되면 해당 인계 문서가 자동 생성되어야 한다
2. **IC 결정 후 분기**: 승인→백오피스+보육팀, 조건부→조건 이행 추적, 보류→재심 스케줄링, 보육우선→보육팀 우선 배정
3. **멘토링은 이벤트가 아니라 실행관리**: 액션아이템 이행률이 핵심 지표
4. **PoC는 소개가 아니라 프로젝트**: 7개 필수항목 설계 + 5단계 실행관리
5. **포트폴리오 등급화**: A/B/C/D 등급에 따라 지원 리소스 자동 분배 가이드
6. **위기 신호 감지**: 현금고갈(runway 3개월 미만), 핵심인력이탈, 고객이탈, 개발지연, 소송 → 자동 알림
7. **회수 준비는 투자 시점부터**: Exit 체크리스트 7개항이 투자 계약 단계에서부터 활성화
8. **투자자 매칭 시 기준 적용**: 산업이해도, 단계적합성, ticket size, 후속투자여력, 밸류업기여, 포트폴리오 시너지/충돌

---

## 14. SOP 시스템 (6개)

| SOP 번호 | 문서명 | 주관부서 | 단계 수 | 관련 양식 |
|----------|--------|----------|--------|-----------|
| SOP-SRC-01 | 스타트업 소싱 및 1차 스크리닝 | Sourcing팀 | 5단계 | SRC-F01, SRC-F02 |
| SOP-INV-01 | 투자심사 및 IC 상정 | 심사팀 | 6단계 | INV-F01, INV-F02, INV-F03 |
| SOP-OPS-01 | 투자계약 및 집행 | 백오피스팀 | 5단계 | OPS-F01 |
| SOP-PRG-01 | 포트폴리오 온보딩 및 보육 운영 | 보육팀 | 5단계 | PRG-F01~F04 |
| SOP-OI-01 | 오픈이노베이션 및 PoC 운영 | OI팀 | 5단계 | OI-F01~F03 |
| SOP-OPS-02 | 보고 및 컴플라이언스 관리 | 백오피스팀 | 4단계 | OPS-F02 |

### SOP별 자동화 워크플로우

**SOP-SRC-01**: 유입등록(SRC-F01→Startup자동생성) → 1차자료검토 → 초기미팅 → 등급분류(SRC-F02, A등급→심사팀인계트리거) → 인계

**SOP-INV-01**: 심사착수(인계자료자동로드+DD요청INV-F01) → 정밀검토 → 투자메모(INV-F02) → 사전리뷰 → IC(INV-F03) → 결과통보(승인→백오피스+보육 동시인계)

**SOP-OPS-01**: IC결과수령(OPS-F01자동생성) → 계약협의 → 집행준비 → 투자금집행(CapTable자동반영) → 사후보관

**SOP-PRG-01**: 온보딩(PRG-F01) → 진단회의 → 90일액션플랜(PRG-F02) → 멘토링(PRG-F03, 세션당자동생성) → 월간리뷰(PRG-F04, 자동집계)

**SOP-OI-01**: 수요발굴(OI-F01) → 스타트업매칭 → PoC설계(OI-F02) → 실행관리(OI-F03) → 종료/전환(5분류판정)

**SOP-OPS-02**: 보고일정등록(OPS-F02) → 자료취합(자동집계) → 검증 → 제출/보관

---

## 15. 표준 양식 14개 — 필드 스키마 (Claude Code가 폼 구현 시 참조)

| 코드 | 양식명 | 소속팀 | 자동화 트리거 |
|------|--------|--------|--------------|
| SRC-F01 | 스타트업 초기등록표 | Sourcing | → Startup 자동 생성 + DealFlow "inbound" |
| SRC-F02 | 1차 스크리닝 시트 | Sourcing | A등급+인계Y → Handover 자동 생성 |
| INV-F01 | DD 자료 요청표 | 심사 | 10개 전 수령 → DD 완료 자동 전환 |
| INV-F02 | 투자 메모 | 심사 | 이전 심사 데이터 자동 프리필 |
| INV-F03 | IC 결과지 | 심사 | 결정 → 백오피스+보육 동시 인계 |
| OPS-F01 | 투자계약 체크리스트 | 백오피스 | 10개 전체완료 → Contract "closed" |
| OPS-F02 | 보고 일정 캘린더 | 백오피스 | 마감 7일전 자동 리마인더 |
| PRG-F01 | 온보딩 시트 | 보육 | → Incubation 테이블 생성 |
| PRG-F02 | 90일 액션플랜 | 보육 | 기한 도래 시 자동 리마인더 |
| PRG-F03 | 멘토링 기록지 | 보육 | 액션아이템 → Task 자동 등록 |
| PRG-F04 | 월간 KPI 점검표 | 보육 | 3개월 연속 하락 → 위기 알림 |
| OI-F01 | 파트너 수요정리표 | OI | → PartnerDemand 생성 |
| OI-F02 | PoC 제안서 | OI | → PoCProject 생성 |
| OI-F03 | PoC 진행관리표 | OI | 전환가능성 "높음" → 심사팀 알림 |

### 15-1. 양식별 필드 스키마 (구현 필수)

**[SRC-F01] 스타트업 초기등록표**
```json
[
  {"name": "company_name", "type": "text", "label": "기업명", "required": true},
  {"name": "ceo_name", "type": "text", "label": "대표자", "required": true},
  {"name": "founded_date", "type": "date", "label": "설립일"},
  {"name": "location", "type": "text", "label": "소재지"},
  {"name": "industry", "type": "select", "label": "산업분야", "options": ["반도체","모빌리티","AI","배터리","로보틱스","바이오","기타"], "required": true},
  {"name": "stage", "type": "select", "label": "단계", "options": ["예비창업","Pre-seed","Seed"]},
  {"name": "core_product", "type": "textarea", "label": "핵심 제품/기술", "required": true},
  {"name": "main_customer", "type": "text", "label": "주요 고객"},
  {"name": "current_traction", "type": "textarea", "label": "현재 성과"},
  {"name": "sourcing_channel", "type": "select", "label": "유입경로", "options": "SourcingChannel enum"},
  {"name": "referrer", "type": "text", "label": "추천인"},
  {"name": "assigned_manager", "type": "user_select", "label": "담당자", "required": true},
  {"name": "first_meeting_date", "type": "date", "label": "1차 미팅 예정일"},
  {"name": "notes", "type": "textarea", "label": "비고"}
]
// → 제출 시: Startup 레코드 자동생성 + DealFlow stage="inbound" 기록
```

**[SRC-F02] 1차 스크리닝 시트**
```json
[
  {"name": "startup_id", "type": "auto", "label": "기업명", "source": "startup"},
  {"name": "review_date", "type": "date", "label": "검토일", "default": "today"},
  {"name": "reviewer", "type": "auto", "label": "검토자", "source": "current_user"},
  {"name": "team_capability", "type": "rating_3", "label": "창업팀 역량", "options": ["상","중","하"], "memo": true},
  {"name": "problem_clarity", "type": "rating_3", "label": "문제정의 명확성", "memo": true},
  {"name": "tech_diff", "type": "rating_3", "label": "제품/기술 차별성", "memo": true},
  {"name": "market_potential", "type": "rating_3", "label": "시장성", "memo": true},
  {"name": "traction", "type": "rating_3", "label": "현재 진척도", "memo": true},
  {"name": "program_fit", "type": "rating_3", "label": "우리 프로그램 적합성", "memo": true},
  {"name": "investment_potential", "type": "rating_3", "label": "투자검토 가능성", "memo": true},
  {"name": "overall_opinion", "type": "textarea", "label": "종합의견", "required": true},
  {"name": "grade", "type": "select", "label": "추천등급", "options": ["A","B","C","D"], "required": true},
  {"name": "next_action", "type": "textarea", "label": "후속조치"},
  {"name": "handover_to_review", "type": "boolean", "label": "심사팀 인계 여부"}
]
// → 상/중/하를 5/3/1로 환산하여 Screening 테이블 저장
// → grade=A + handover=true → Handover 자동생성 + 심사팀 Notification
```

**[INV-F01] DD 자료 요청표** (10개 문서 수령 추적)
```json
[
  {"name": "biz_registration", "type": "file_status", "label": "사업자등록증"},
  {"name": "corporate_registry", "type": "file_status", "label": "법인등기부등본"},
  {"name": "shareholder_list", "type": "file_status", "label": "주주명부"},
  {"name": "articles", "type": "file_status", "label": "정관"},
  {"name": "financials", "type": "file_status", "label": "최근 재무자료"},
  {"name": "ip_list", "type": "file_status", "label": "지식재산권 목록"},
  {"name": "key_contracts", "type": "file_status", "label": "주요 계약서"},
  {"name": "gov_projects", "type": "file_status", "label": "정부과제 수행 현황"},
  {"name": "headcount_info", "type": "file_status", "label": "인력현황"},
  {"name": "ir_deck", "type": "file_status", "label": "제품소개서/IR deck"}
]
// file_status type = {status: "요청"|"수령"|"미비", file_id, note}
// 10개 모두 "수령" → Review.dd_checklist 자동 완료 + DealStage 자동 진행
```

**[INV-F02] 투자 메모** (9개 섹션 구조화)
```
섹션1. 기본정보: 기업명/대표자/설립연도/분야/단계 (Startup에서 auto-fill)
섹션2. 투자 개요: 요청투자금(int)/제안투자금(int)/제안구조(InvestmentVehicle)/가정기업가치(int)
섹션3. 팀 평가: 창업자이력(text)/핵심역량(text)/팀완성도(text)/리스크(text)
섹션4. 시장 평가: 타깃시장/시장규모/경쟁환경/진입장벽
섹션5. 기술/제품 평가: 핵심기술/차별성/현재검증수준/향후과제
섹션6. Traction: 고객/매출/PoC/사용자/기타지표
섹션7. 주요 리스크: 팀리스크/시장리스크/기술리스크/법무리스크/자금리스크 (5대 리스크)
섹션8. 투자 후 지원 포인트: 보육필요사항/OI가능성/후속투자방향
섹션9. 심사의견: 추천/조건부추천/보류/부결 + 사유
// → Review 데이터(서류5축, 인터뷰8축, DD) 자동 프리필
// → status: draft → submitted → ic_ready
```

**[INV-F03] IC 결과지**
```json
[
  {"name": "agenda_title", "type": "auto", "label": "안건명", "source": "startup+memo"},
  {"name": "meeting_datetime", "type": "datetime", "label": "일시"},
  {"name": "attendees", "type": "multi_user_select", "label": "참석자"},
  {"name": "decision", "type": "select", "label": "결정", "options": "ICDecisionType enum", "required": true},
  {"name": "conditions", "type": "textarea", "label": "조건부 승인 조건", "conditional": "decision=conditional"},
  {"name": "follow_up", "type": "textarea", "label": "후속 조치"},
  {"name": "contract_assignee", "type": "user_select", "label": "계약 협의 담당"},
  {"name": "program_assignee", "type": "user_select", "label": "보육 인계 담당"},
  {"name": "monitoring_points", "type": "textarea", "label": "사후 모니터링 포인트"},
  {"name": "notes", "type": "textarea", "label": "비고"}
]
// → 결정별 자동 분기 (§18 핵심 자동화 로직 #4 참조)
```

**[OPS-F01] 투자계약 체크리스트** (10개 항목)
```
각 항목 = {completed: boolean, confirmed_by: user_id, note: text}
1. IC 승인 확인
2. 텀시트 확정
3. 신주인수계약서
4. 주주간계약서
5. 정관 반영 여부
6. 법인서류 확보
7. 계좌정보 확인
8. 내부결재 완료
9. 납입증빙 확보
10. Cap Table 업데이트
// → 10개 전체 completed=true → Contract.status="completed" + CapTable 자동반영
// → IC승인 후 10일 초과 미완료 → NotificationType.CONTRACT_OVERDUE 알림
```

**[PRG-F01] 온보딩 시트**
```
기업명(auto), 대표자(auto), 투자일(auto: contract.closed_at), 담당PM(user_select),
주요제품(auto+editable), 현재단계(auto+editable), 최근핵심성과(textarea),
현재 가장 큰 병목(textarea, required), 요청지원(textarea),
초기 우선 KPI 3개(3x text, required)
// → Incubation 테이블 생성 + status="onboarding"
```

**[PRG-F02] 90일 액션플랜** (5영역 테이블)
```
| 영역 | 현재상태 | 목표상태 | 실행과제 | 책임자 | 기한 |
- 제품 / 고객 / 매출 / 투자유치 / 조직
+ 행 추가 가능
// → Incubation.action_plan JSON 저장 + 기한별 자동 리마인더
```

**[PRG-F03] 멘토링 기록지**
```
기업명(auto), 멘토명(text/user_select), 멘토유형(select: 5종),
일시(datetime), 주제(text), 주요 논의사항(textarea),
제안사항(textarea), 액션아이템(dynamic_list: [{task, owner, deadline}]),
다음 일정(date), PM 확인(boolean+user)
// → MentoringSession 저장 + 액션아이템 → Task 테이블 등록 → 이행률 자동 추적
```

**[PRG-F04] 월간 KPI 점검표**
```
기업명(auto), 점검월(month_select)
| KPI | 전월(auto) | 당월 | 목표 | 증감(auto) | 해석 |
- 매출/고객수/PoC수/투자자미팅수/runway(월) + 커스텀 KPI
// → KPIRecord 저장 + 증감·달성률 자동계산
// → 3개월 연속 하락 → NotificationType.KPI_WARNING
```

**[OI-F01] 파트너 수요정리표**
```
파트너사(text), 담당부서(text,현업필수), 담당자(text),
해결하려는 문제(textarea), 원하는 솔루션(textarea),
예상적용영역(text), 일정(text), 예산가능성(select: 있음/미정/없음),
보안/NDA 필요(boolean), 적합 스타트업 후보(multi_startup_select)
// → PartnerDemand 생성
```

**[OI-F02] PoC 제안서** (10개 섹션)
```
1.프로젝트명 2.참여기관 3.프로젝트목적 4.검증항목(list)
5.수행기간(date_range) 6.역할분담 7.제공자원(데이터/장비/인력)
8.성공기준 9.종료후 전환 시나리오 10.주요 리스크 및 대응
// → PoCProject 생성
```

**[OI-F03] PoC 진행관리표**
```
프로젝트명(auto), 시작일(auto), 종료예정일(auto),
현재단계(select: PoCStatus), 주간이슈(textarea),
필요지원(textarea), 파트너피드백(textarea),
스타트업피드백(textarea), 전환가능성(select: 높음/중간/낮음)
// → 전환가능성 "높음" → 심사팀 NotificationType.HANDOVER_REQUEST
```

**[OPS-F02] 보고 일정 캘린더**
```
| 보고명 | 제출처 | 담당부서 | 마감일 | 준비시작일 | 현재상태 | 비고 |
- 반복 보고 자동 재생성 (monthly/quarterly)
- 마감 7일전 + 3일전 + 당일 → NotificationType.REPORT_DEADLINE
```

---

## 16. KPI 대시보드 시스템

### 4계층 구조: Input → Process → Output → Outcome

#### Sourcing팀 (8개)
| 계층 | KPI | 기본목표 |
|------|-----|----------|
| Input | 신규 리드 수 | 80/월 |
| Input | 전략산업 리드 비율 | 60% |
| Process | 1차 미팅 완료율 | 50% |
| Process | CRM 입력 완결률 | 100% |
| Output | 심사 전환 수 | 20 |
| Output | 유효 딜 비율 | 60% |
| Outcome | 최종 선발 기여 수 | 6 |
| Outcome | 투자 전환 기여율 | 20% |

#### 심사팀 (8개)
| 계층 | KPI | 기본목표 |
|------|-----|----------|
| Input | 신규 심사 착수 건수 | 15 |
| Process | 평균 심사 소요일 | 21일 |
| Process | DD 자료 회수율 | 95% |
| Process | 투자메모 완결률 | 100% |
| Output | IC 상정 건수 | 8 |
| Output | 승인율 | 50% |
| Outcome | 클로징 성공률 | 90% |
| Outcome | 후속투자 준비 적합률 | 60% |

#### 보육팀 (8개)
| 계층 | KPI | 기본목표 |
|------|-----|----------|
| Input | 관리 포트폴리오 수 | 20 |
| Process | 온보딩 완료율 | 100% |
| Process | 멘토링 실행률 | 90% |
| Process | 액션아이템 이행률 | 75% |
| Output | KPI 개선 기업 비율 | 70% |
| Output | IR 자료 완성률 | 90% |
| Outcome | 후속 투자미팅 발생률 | 60% |
| Outcome | 만족도 | 4.5/5 |

#### 오픈이노베이션팀 (8개)
| 계층 | KPI | 기본목표 |
|------|-----|----------|
| Input | 신규 파트너 수 | 5 |
| Input | 수요과제 발굴 수 | 10 |
| Process | 매칭 제안 수 | 12 |
| Process | PoC 설계 완료율 | 80% |
| Output | PoC 착수 건수 | 4 |
| Output | PoC 완료율 | 80% |
| Outcome | 계약 전환율 | 30% |
| Outcome | 전략적 투자 검토건수 | 2 |

#### 백오피스팀 (7개)
| 계층 | KPI | 기본목표 |
|------|-----|----------|
| Process | 계약 처리 리드타임 | 10일 |
| Process | 투자집행 정시율 | 100% |
| Process | 보고서 정시 제출률 | 100% |
| Process | 문서 정합성 오류건수 | 0 |
| Outcome | 감사 지적 건수 | 0 |
| Outcome | 보안사고 건수 | 0 |
| Outcome | Cap Table 정확도 | 100% |

### 전사 경영 대시보드 (대표/파트너용)
8대 자동 집계 지표 + 상태 자동 판정: 양호(≥90%) / 보완필요(70-89%) / 개선필요(<70%)

---

## 17. 직무기술서(JD) 시스템 (10개)

| JD코드 | 직무명 | 소속 |
|--------|--------|------|
| JD-01 | Sourcing Manager | Sourcing팀 |
| JD-02 | Sourcing Lead | Sourcing팀 |
| JD-03 | Investment Associate | 심사팀 |
| JD-04 | Investment Manager | 심사팀 |
| JD-05 | Program Manager | 보육팀 |
| JD-06 | Head of Program | 보육팀 |
| JD-07 | Open Innovation Manager | OI팀 |
| JD-08 | Head of Open Innovation | OI팀 |
| JD-09 | Operations Manager | 백오피스팀 |
| JD-10 | Head of Operations | 백오피스팀 |

JD의 `authority_scope` → RBAC 허용 범위, `approval_required` → 결재 워크플로우 트리거와 자동 연동

---

## 18. 핵심 자동화 로직 (10개)

1. **SRC-F01 제출 → Startup + DealFlow "inbound" 자동 생성**
2. **SRC-F02 A등급 + 인계=Y → Handover 자동 생성 + 심사팀 알림**
3. **INV-F01 10개 전체 수령 → DD 완료 상태 자동 전환**
4. **INV-F03 승인 → OPS-F01 체크리스트 + PRG-F01 온보딩시트 동시 자동 생성**
5. **OPS-F01 10개 항목 전체 완료 → Contract "closed" + Cap Table 자동 업데이트**
6. **PRG-F03 액션아이템 → Task 자동 등록 + 기한 알림**
7. **PRG-F04 KPI 3개월 연속 하락 → 위기 알림 + 포트폴리오 등급 재검토 트리거**
8. **OI-F03 전환가능성 "높음" → 심사팀에 전략투자 검토 알림 (역인계)**
9. **OPS-F02 마감 7일전/3일전/당일 → 자동 리마인더**
10. **모든 양식 제출 → 기업 타임라인(ActivityLog)에 자동 기록**

---

## 19. KPI 자동 집계 수식 (Celery task: kpi_aggregation)

팀별 KPI는 아래 수식으로 DB에서 자동 집계한다. `kpi_aggregation_service`가 월말/격주 자동 실행.

### Sourcing팀 자동 집계
```python
신규_리드_수 = COUNT(Startup WHERE created_at IN 해당월)
전략산업_리드_비율 = COUNT(Startup WHERE industry IN thesis.focus_industries) / 신규_리드_수
미팅_완료율 = COUNT(DealFlow WHERE stage >= "first_screening") / 신규_리드_수
CRM_완결률 = COUNT(Startup WHERE all_required_fields_filled) / 신규_리드_수
심사_전환_수 = COUNT(Handover WHERE from_team="sourcing" AND created_at IN 해당월)
유효_딜_비율 = COUNT(Review WHERE overall_verdict="proceed") / 심사_전환_수
최종_선발 = COUNT(ICDecision WHERE decision="approved" AND startup sourced in 해당월)
투자_전환율 = COUNT(Contract WHERE status="completed") / 심사_전환_수
```

### 심사팀 자동 집계
```python
심사_착수 = COUNT(Review WHERE started_at IN 해당월)
평균_심사_소요일 = AVG(Review.completed_at - Review.started_at)
DD_회수율 = (SUM of INV-F01 items with status="수령") / (total items * total startups in review)
메모_완결률 = COUNT(InvestmentMemo WHERE all 9 sections filled) / COUNT(InvestmentMemo)
IC_상정 = COUNT(ICDecision WHERE decided_at IN 해당월)
승인율 = COUNT(ICDecision WHERE decision="approved") / IC_상정
클로징_성공률 = COUNT(Contract WHERE status="completed") / COUNT(ICDecision WHERE decision="approved")
후속투자_적합률 = COUNT(FollowOnInvestment WHERE status="ir_active" AND startup invested within 6mo) / portfolio_count
```

### 보육팀 자동 집계
```python
관리_포트폴리오 = COUNT(Incubation WHERE status="active")
온보딩_완료율 = COUNT(Incubation WHERE status != "onboarding") / COUNT(Incubation created this month)
멘토링_실행률 = COUNT(MentoringSession actual) / COUNT(MentoringSession planned)
액션아이템_이행률 = AVG(MentoringSession.action_completion_rate)
KPI_개선_비율 = COUNT(startups where any KPI improved MoM) / 관리_포트폴리오
IR_완성률 = COUNT(startups with IR readiness >= threshold) / 관리_포트폴리오
후속_미팅_발생률 = COUNT(startups where follow_on_meetings > 0) / 관리_포트폴리오
만족도 = AVG(survey scores) — 별도 설문 필요
```

### 오픈이노베이션팀 자동 집계
```python
신규_파트너 = COUNT(PartnerDemand WHERE created_at IN 해당월 AND DISTINCT partner_company)
수요과제 = COUNT(PartnerDemand WHERE created_at IN 해당월)
매칭_제안 = COUNT(PoCProject WHERE status >= "matching" AND created_at IN 해당월)
PoC_설계완료 = COUNT(PoCProject WHERE status >= "planning") / 매칭_제안
PoC_착수 = COUNT(PoCProject WHERE status >= "kickoff")
PoC_완료율 = COUNT(PoCProject WHERE status >= "completed") / PoC_착수
계약_전환율 = COUNT(PoCProject WHERE status="commercial_contract") / COUNT(PoCProject WHERE status >= "completed")
전략투자_검토 = COUNT(PoCProject WHERE status="strategic_investment")
```

### 백오피스팀 자동 집계
```python
계약_리드타임 = AVG(Contract.closed_at - ICDecision.decided_at) in days
집행_정시율 = COUNT(Contract closed within 10 days) / total
보고_정시율 = COUNT(Report WHERE status="제출완료" AND submitted <= deadline) / total
문서_오류 = COUNT(ActivityLog WHERE action_type="error_correction")
감사_지적 = manual input
보안사고 = manual input (목표: 0)
cap_table_정확도 = manual audit check
```

---

## 20. Docker Compose 서비스 구성

```yaml
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: accel_os
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"  # UTF-8 필수
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/accel_os
      REDIS_URL: redis://redis:6379/0
      JWT_SECRET: ${JWT_SECRET}
      TZ: Asia/Seoul
    ports: ["8000:8000"]
    depends_on: [db, redis]
    volumes: ["./backend:/app"]

  celery_worker:
    build: ./backend
    command: celery -A app.tasks worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/accel_os
      REDIS_URL: redis://redis:6379/0
      TZ: Asia/Seoul
    depends_on: [db, redis]

  celery_beat:
    build: ./backend
    command: celery -A app.tasks beat --loglevel=info
    environment:
      REDIS_URL: redis://redis:6379/0
      TZ: Asia/Seoul
    depends_on: [redis]

  frontend:
    build: ./frontend
    command: npm run dev
    ports: ["3000:3000"]
    depends_on: [backend]
    volumes: ["./frontend:/app", "/app/node_modules"]

volumes:
  pgdata:
```

### Celery Beat 스케줄 (주기적 작업)
```python
CELERY_BEAT_SCHEDULE = {
    "kpi-aggregation-monthly": {"task": "tasks.kpi_aggregation.aggregate_all", "schedule": crontab(day_of_month=1, hour=2)},
    "report-reminder-daily": {"task": "tasks.report_reminders.check_deadlines", "schedule": crontab(hour=9, minute=0)},
    "escalation-check-hourly": {"task": "tasks.escalation.check_unacknowledged", "schedule": crontab(minute=0)},
    "crisis-scan-daily": {"task": "tasks.crisis_scan.scan_all_portfolios", "schedule": crontab(hour=8, minute=0)},
}
```

---

## 21. 시드 데이터 전략

Phase 1 배포 시 `alembic/seed.py`에서 자동 로딩:

```python
# 1. 기본 사용자 (admin + 각 팀 테스트 계정)
seed_users = [
    {"email": "admin@winlsa.com", "name": "관리자", "role": "admin", "team": "backoffice"},
    {"email": "sourcing@winlsa.com", "name": "소싱담당", "role": "analyst", "team": "sourcing"},
    {"email": "review@winlsa.com", "name": "심사역", "role": "analyst", "team": "review"},
    {"email": "pm@winlsa.com", "name": "보육PM", "role": "pm", "team": "incubation"},
    {"email": "oi@winlsa.com", "name": "OI담당", "role": "oi_manager", "team": "oi"},
    {"email": "ops@winlsa.com", "name": "백오피스", "role": "backoffice", "team": "backoffice"},
    {"email": "partner@winlsa.com", "name": "파트너", "role": "partner", "team": "review"},
]

# 2. SOP 템플릿 6개 (§14의 정의 그대로)
# 3. 양식 템플릿 14개 (§15의 필드 스키마 그대로)
# 4. 팀별 KPI 정의 39개 (§16의 목표값 포함)
# 5. JD 10개 (§17의 직무 정의)
# 6. 투자 Thesis 설정값 (§1-4)

# 시드 데이터는 is_active=True 상태로 로딩
# 운영 중 admin 화면에서 수정 가능
```

---

## 22. 후속투자 IR 및 Demo Day 프로세스 (시스템 워크플로우)

원본 운영매뉴얼의 §8(IR준비와 Demo Day)을 시스템 화면으로 구체화:

### 22-1. IR 정비 체크리스트 (보육팀 → incubation/demo-day)
```
체크항목:
□ 1분 피치 완성
□ 5분 발표 완성
□ IR deck 10장 (투자자별 맞춤 포인트 포함)
□ 데이터룸 구성 완료
□ FAQ 문서 작성
□ 밸류에이션 논리 정리
□ Use of Funds 정리
□ Milestone Plan 정리
→ 각 항목 상태: 미착수/진행중/완료/검토필요
→ 전체 완성 시 "IR Ready" 뱃지 표시
```

### 22-2. Demo Day 운영 워크플로우
```
Step 1. 투자자 초청 리스트 작성 → 우선순위 투자자 분류 (A/B/C)
Step 2. 스타트업별 관심 투자자 매칭
Step 3. 발표 리허설 일정 + 피드백
Step 4. 데모/제품 시연 준비
Step 5. Demo Day 당일 → 현장 상담 운영 기록
Step 6. Demo Day 이후 4-8주 후속 추적:
        - 투자자 미팅 스케줄링 (follow_on_meetings 카운트)
        - 추가자료 송부 기록
        - Q&A 대응 기록
        - term sheet 협상 지원 → FollowOnInvestment 연동
        - 공동투자자 발굴 기록
        - 리드 투자자 확보 여부 추적
```

### 22-3. 데이터 모델 추가
```python
class DemoDay(Base):
    __tablename__ = "demo_days"
    id: Mapped[uuid.UUID]
    batch_name: Mapped[str]
    event_date: Mapped[date]
    invited_investors: Mapped[list]        # [{name, company, priority: A/B/C, matched_startups: []}]
    startup_readiness: Mapped[dict]        # {startup_id: {ir_ready: bool, rehearsal_done: bool}}
    status: Mapped[str]                    # planning / rehearsal / completed / follow_up
    follow_up_deadline: Mapped[date]       # Demo Day + 8주
    created_at: Mapped[datetime]

class InvestorMeeting(Base):
    __tablename__ = "investor_meetings"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    demo_day_id: Mapped[uuid.UUID | None]
    investor_name: Mapped[str]
    investor_company: Mapped[str]
    investor_type: Mapped[str]             # angel / seed_vc / pre_a_vc / cvc / strategic / overseas
    meeting_date: Mapped[date]
    meeting_type: Mapped[str]              # onsite_consult / follow_up / ir_meeting / termsheet
    outcome: Mapped[str | None]            # interested / passed / termsheet / invested
    materials_sent: Mapped[list | None]    # 송부 자료 목록
    next_step: Mapped[str | None]
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
```

---

## 23. 조직 설정 모델

```python
class OrganizationSettings(Base):
    __tablename__ = "organization_settings"
    id: Mapped[uuid.UUID]
    key: Mapped[str]                       # thesis.focus_industries, ops.batches_per_year 등
    value: Mapped[dict]                    # JSON 값
    category: Mapped[str]                  # thesis / ops_model / fund_structure / general
    updated_by: Mapped[uuid.UUID]
    updated_at: Mapped[datetime]
```
투자 thesis, 운영 모델, 자금 구조 설정값을 관리하며, 소싱 타깃 정의·심사 전략적합성 평가·KPI 목표 설정에 참조된다.

---

> **v4.0 업데이트 반영사항** (v3 대비 추가분):
> - §1-4 투자 전략(Thesis) + 자금구조 설계: 시스템 설정값으로 내장, 소싱/심사/KPI에 자동 연동
> - §15 양식 14개 필드 스키마 완전 복원: Claude Code가 폼 구현 시 참조할 수 있는 구체적 JSON/필드 정의
> - §19 KPI 자동 집계 수식: 5개 팀 × 각 KPI별 DB 쿼리 수식 명시
> - §20 Docker Compose 서비스 구성 + Celery Beat 스케줄 4종
> - §21 시드 데이터 전략: 사용자/SOP/양식/KPI/JD/Thesis 초기 로딩
> - §22 후속투자 IR + Demo Day 프로세스: 체크리스트 + 워크플로우 + DemoDay/InvestorMeeting 모델
> - §23 OrganizationSettings 모델: 투자 thesis/운영모델/자금구조 설정 관리

---

## 24. 조합(Fund) 관리 모듈 — 원본 매뉴얼 §12, §1-3 반영

원본 전체업무 문서의 "자금 구조 설계"와 백오피스 매뉴얼에서 조합 관리가 핵심 업무로 명시되어 있으나, v4까지 데이터 모델이 누락되었다. 백오피스팀 모듈에 조합/재원 관리가 화면으로 명시되어 있으므로 이를 뒷받침하는 모델이 필요하다.

### 24-1. 조합 데이터 모델
```python
class Fund(Base):
    """개인투자조합 / 벤처투자조합 관리"""
    __tablename__ = "funds"
    id: Mapped[uuid.UUID]
    fund_name: Mapped[str]
    fund_type: Mapped[str]               # individual_union / venture_fund / self_capital / gov_linked
    total_amount: Mapped[int]            # 조합 총 규모 (원)
    committed_amount: Mapped[int]        # 약정 금액
    deployed_amount: Mapped[int]         # 집행 금액
    remaining_amount: Mapped[int]        # 잔여 금액
    formation_date: Mapped[date]         # 결성일
    expiry_date: Mapped[date | None]     # 만기일
    gp_entity: Mapped[str]              # GP (운용사)
    status: Mapped[str]                  # forming / active / winding_down / dissolved
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class FundLP(Base):
    """출자자(LP) 관리"""
    __tablename__ = "fund_lps"
    id: Mapped[uuid.UUID]
    fund_id: Mapped[uuid.UUID]           # FK → funds
    lp_name: Mapped[str]
    lp_type: Mapped[str]                 # individual / corporate / institutional / government
    committed_amount: Mapped[int]
    paid_in_amount: Mapped[int]          # 실제 납입
    contact_name: Mapped[str | None]
    contact_email: Mapped[str | None]
    notes: Mapped[str | None]

class FundInvestment(Base):
    """조합별 투자 집행 내역"""
    __tablename__ = "fund_investments"
    id: Mapped[uuid.UUID]
    fund_id: Mapped[uuid.UUID]           # FK → funds
    startup_id: Mapped[uuid.UUID]        # FK → startups
    contract_id: Mapped[uuid.UUID | None]  # FK → investment_contracts
    amount: Mapped[int]
    invested_at: Mapped[date]
    notes: Mapped[str | None]
```

### 24-2. 조합 관련 API 추가
```
/api/v1/funds/                    # 조합 CRUD
/api/v1/funds/{id}/lps/           # 출자자 관리
/api/v1/funds/{id}/investments/   # 조합별 투자 내역
/api/v1/funds/{id}/report/        # LP 보고서 자동 생성
```

### 24-3. 백오피스 화면 보강
- 조합 현황 대시보드: 총 규모 / 집행률 / 잔여 금액 / 조합별 포트폴리오
- LP 보고서 자동 생성: 조합별 투자 실적 + 포트폴리오 현황 + 밸류에이션 변동
- 조합 만기 알림: 만기 6개월/3개월/1개월 전 자동 알림

---

## 25. 정부사업 연계 트래커 모델 — 원본 매뉴얼 §7-3, OI팀 반영

오픈이노베이션팀의 정부사업 연계 트래커가 화면으로 명시되어 있지만 (§4-4), 뒷받침 모델이 없었다.

```python
class GovernmentProgram(Base):
    """정부/공공사업 연계 추적"""
    __tablename__ = "government_programs"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]
    program_type: Mapped[str]            # tips / pre_tips / rnd / sandbox / pilot_support / overseas_voucher
    program_name: Mapped[str]
    managing_agency: Mapped[str]         # 주관기관
    applied_at: Mapped[date | None]      # 지원일
    status: Mapped[str]                  # planned / applied / selected / in_progress / completed / rejected
    amount: Mapped[int | None]           # 지원 금액
    period_start: Mapped[date | None]
    period_end: Mapped[date | None]
    our_role: Mapped[str | None]         # 추천인 / 공동수행 / 운영사 등
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### API 추가
```
/api/v1/government-programs/       # CRUD
/api/v1/government-programs/by-startup/{id}/  # 기업별 조회
```

---

## 26. 문서/파일 관리 시스템 — 원본 매뉴얼 "같은 데이터룸" 원칙

설계 원칙 2번 "같은 기업 ID + 같은 데이터룸"을 뒷받침하는 파일 관리 모델. DD 자료(INV-F01), 계약서, IR deck 등 모든 문서의 중앙 저장소.

```python
class Document(Base):
    """중앙 문서 관리 (데이터룸)"""
    __tablename__ = "documents"
    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID | None]
    fund_id: Mapped[uuid.UUID | None]
    category: Mapped[str]                # dd / contract / ir / mentoring / poc / report / legal / other
    file_name: Mapped[str]
    file_path: Mapped[str]               # 로컬 volume 경로 (→ 확장 시 S3 URL)
    file_size: Mapped[int | None]        # bytes
    mime_type: Mapped[str | None]
    uploaded_by: Mapped[uuid.UUID]
    version: Mapped[int]                 # 같은 문서의 버전 관리
    is_latest: Mapped[bool]              # 최신본 여부
    # 접근 권한 (팀 기반)
    access_teams: Mapped[list | None]    # null = 전체 접근, ["review","backoffice"] = 해당 팀만
    tags: Mapped[list | None]            # 검색용 태그
    created_at: Mapped[datetime]
    is_deleted: Mapped[bool] = False
```

### API 추가
```
/api/v1/documents/                 # 업로드/목록 조회
/api/v1/documents/{id}/download    # 다운로드
/api/v1/documents/by-startup/{id}/ # 기업별 데이터룸
/api/v1/documents/{id}/versions    # 버전 이력
```

### 프로젝트 구조 추가
```
backend/app/models/document.py
backend/app/models/fund.py
backend/app/models/government_program.py
backend/app/routers/documents.py
backend/app/routers/funds.py
backend/app/routers/government_programs.py
backend/app/services/document_service.py   # 파일 업로드/다운로드/버전관리
```

---

## 27. 딥테크 심화 심사 필드 — 원본 전체업무 §15, 심사팀 Review 모델 보강

원본 문서 §15 "딥테크 액셀러레이터에서는 무엇이 더 달라지는가"의 기술검증 항목이 Review 모델에 구체적 필드로 반영되지 않았다.

### Review 모델에 딥테크 전용 필드 추가
```python
# Review 클래스에 추가할 필드:
    # --- 딥테크 기술검증 심화 (§8-1) ---
    tech_type: Mapped[str | None]            # paper_tech / engineering / mixed (논문형 vs 엔지니어링)
    scalability_score: Mapped[int | None]    # 양산성/스케일업 가능성 (1-5)
    process_compatibility: Mapped[int | None] # 고객사 공정/시스템 적합성 (1-5)
    sample_test_status: Mapped[str | None]   # not_started / in_progress / passed / failed
    certification_stage: Mapped[str | None]  # 인증/신뢰성 테스트 단계
    purchase_lead_time_months: Mapped[int | None]  # 구매전환 리드타임 (월)
```

---

## 28. 기업 통합 프로필 탭 구조 확정 — 스타트업 상세 페이지

`/startup/[id]/` 페이지의 탭 구조를 최종 확정. 원본 매뉴얼의 "같은 기업 ID와 같은 데이터룸" 원칙과 "전체 히스토리 추적"을 구현.

```
/startup/[id]/
├── overview/       # 기본 정보 + 현재 단계 뱃지 + 담당자 + 등급
├── pipeline/       # 딜 단계 히스토리 (DealFlow 전체 이력)
├── screening/      # 1차 스크리닝 결과 (SRC-F02)
├── review/         # 심사 이력 (서류/인터뷰/DD) + 리스크 로그
├── investment/     # 투자 메모 + IC 결정 + 계약 + Cap Table
├── incubation/     # 온보딩 + 액션플랜 + 멘토링 로그 + KPI 추이
├── oi/             # PoC 프로젝트 + 파트너 매칭 이력
├── follow-on/      # 후속투자 현황 + 투자자 미팅 로그
├── exit/           # 회수 체크리스트 + 시나리오
├── government/     # 정부사업 연계 현황
├── documents/      # 데이터룸 (전체 문서, 카테고리별 필터)
├── timeline/       # 전체 ActivityLog 타임라인 (모든 양식 제출·인계·결정 이력)
└── handovers/      # 팀 간 인계 이력
```

---

## 29. .env 파일 템플릿

```env
# Database
DB_USER=accel_admin
DB_PASSWORD=change_me_in_production
DB_NAME=accel_os
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET=change_me_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Timezone
TZ=Asia/Seoul

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=50

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 30. Alembic 마이그레이션 초기 실행 순서

Phase 1에서 DB 셋업 시 반드시 아래 순서로 테이블을 생성해야 FK 의존성 충돌이 없다:

```
1. users (FK 없음)
2. organization_settings (FK 없음)
3. mentors (FK 없음) — §31
4. batches (FK 없음) — §32
5. startups (FK: assigned_manager_id → users, batch_id → batches)
6. deal_flows (FK: startup_id, moved_by)
7. screenings (FK: startup_id, screener_id)
8. reviews (FK: startup_id, reviewer_id)
9. investment_memos (FK: startup_id, author_id)
10. ic_decisions (FK: startup_id, memo_id)
11. investment_contracts (FK: startup_id, ic_decision_id)
12. cap_table_entries (FK: startup_id)
13. funds → fund_lps → fund_investments — §24
14. incubations (FK: startup_id, assigned_pm_id, batch_id)
15. mentoring_sessions (FK: startup_id, mentor_id → mentors)
16. kpi_records (FK: startup_id)
17. partner_demands
18. poc_projects (FK: startup_id, partner_demand_id)
19. follow_on_investments (FK: startup_id)
20. exit_records (FK: startup_id)
21. government_programs (FK: startup_id) — §25
22. documents (FK: startup_id, uploaded_by) — §26
23. handover_documents (FK: startup_id)
24. meetings
25. notifications (FK: user_id)
26. activity_logs (FK: user_id, startup_id)
27. reports
28. sop_templates → sop_executions
29. form_templates → form_submissions
30. team_kpis
31. job_descriptions
32. demo_days (FK: batch_id) → investor_meetings
```

---

> **v5.0 업데이트 반영사항** (v4 대비 추가분):
> - §24 조합(Fund) 관리 모듈: Fund/FundLP/FundInvestment 3개 모델 + LP 보고서 자동 생성 + 조합 만기 알림 — 원본 매뉴얼의 "개인투자조합, 벤처투자조합, 출자자 보고" 업무를 시스템화
> - §25 정부사업 연계 트래커: GovernmentProgram 모델 + TIPS/R&D/규제샌드박스/실증사업/해외바우처 추적 — 원본 매뉴얼 §7-3의 "정부사업 연계" + OI팀 화면의 "정부사업 연계 트래커"를 모델로 뒷받침
> - §26 문서/파일 관리 시스템: Document 모델 + 버전 관리 + 팀별 접근 권한 — 설계 원칙 "같은 데이터룸"과 DD 자료/계약서/IR deck 중앙 관리 구현
> - §27 딥테크 심화 심사 필드: Review 모델에 tech_type/scalability_score/process_compatibility/sample_test_status/certification_stage/purchase_lead_time_months 6개 필드 추가 — 원본 §15 "논문형 vs 엔지니어링, 양산성, 고객 적합성"
> - §28 기업 통합 프로필 탭 구조 13개 탭 확정: overview/pipeline/screening/review/investment/incubation/oi/follow-on/exit/government/documents/timeline/handovers
> - §29 .env 파일 템플릿: 환경변수 전체 목록
> - §30 Alembic 마이그레이션 순서: FK 의존성 기반 30개 테이블 생성 순서 명시
> - 프로젝트 구조 보강: routers에 demo_days/investor_meetings/settings 추가, models에 document/fund/government_program 추가

---

## 31. 멘토 풀 관리 — 원본 매뉴얼 §6-5, 업무양식 JD-06

원본 매뉴얼에서 멘토 유형(전담/기능별/산업/투자/고객개발)과 멘토단 구성이 Head of Program의 핵심 책임으로 명시되어 있으나, MentoringSession은 세션 단위로만 기록하고 멘토 자체의 프로필/전문성을 관리하는 모델이 없었다.

```python
class Mentor(Base):
    """멘토 풀 관리"""
    __tablename__ = "mentors"
    id: Mapped[uuid.UUID]
    name: Mapped[str]
    company: Mapped[str | None]
    title: Mapped[str | None]
    mentor_type: Mapped[str]              # dedicated / functional / industry / investment / customer_dev
    expertise_areas: Mapped[list]         # ["반도체", "fabless", "양산"] 등
    industry_tags: Mapped[list | None]    # ["반도체", "모빌리티"] 등
    # 기능별 멘토 세부: 기술/제품/영업/재무/특허/생산
    functional_area: Mapped[str | None]   # tech / product / sales / finance / patent / production
    contact_email: Mapped[str | None]
    contact_phone: Mapped[str | None]
    availability: Mapped[str | None]      # "주 1-2시간", "월 2회" 등
    engagement_count: Mapped[int]         # 누적 세션 수 (자동 집계)
    avg_satisfaction: Mapped[float | None]  # 평균 만족도
    is_active: Mapped[bool]
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
```

### MentoringSession.mentor_id 연동
- `mentor_id` → Mentor 테이블 FK (기존 nullable 유지, 외부 비등록 멘토도 지원)
- 멘토 배정 시 Mentor.expertise_areas와 스타트업 산업/성장병목 매칭 추천

### 멘토단 평가 (보육팀 월간 업무)
- 멘토별 누적 세션 수, 액션아이템 이행률, 참여기업 만족도 자동 집계
- Head of Program이 월간 멘토단 품질 리뷰에 사용

---

## 32. 배치(Batch) 관리 — 원본 매뉴얼 "배치 운영" 체계

원본 전체업무 문서에서 "연간 몇 개 배치를 운영할지", "배치당 선발 팀 수"가 운영모델의 핵심이고, 보육팀이 "배치별 필터"로 포트폴리오를 관리한다고 명시. 현재 Startup.program_batch는 문자열이고, Incubation.batch_name도 문자열이라 배치 자체를 독립적으로 관리할 수 없다.

```python
class Batch(Base):
    """배치 프로그램 관리"""
    __tablename__ = "batches"
    id: Mapped[uuid.UUID]
    batch_name: Mapped[str]               # "2026-1기", "2026-H2" 등
    year: Mapped[int]
    sequence: Mapped[int]                 # 해당 연도 몇 번째 배치
    recruitment_start: Mapped[date]       # 모집 시작
    recruitment_end: Mapped[date]         # 모집 마감
    program_start: Mapped[date]           # 프로그램 시작
    program_end: Mapped[date]             # 프로그램 종료
    target_count: Mapped[int]             # 선발 목표 팀 수
    selected_count: Mapped[int]           # 실제 선발 수 (자동 집계)
    demo_day_id: Mapped[uuid.UUID | None]  # FK → demo_days
    status: Mapped[str]                   # recruiting / screening / active / demo_day / graduated / closed
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
```

### 기존 모델 연동
- `Startup.program_batch` → `Startup.batch_id: Mapped[uuid.UUID | None]` (FK → batches)
- `Incubation.batch_name` → `Incubation.batch_id: Mapped[uuid.UUID | None]` (FK → batches)
- `DemoDay.batch_name` → `DemoDay.batch_id: Mapped[uuid.UUID]` (FK → batches)
- 소싱팀이 "이번 배치 타깃"을 설정하면 Batch 레코드에서 자동 참조

---

## 33. 포트폴리오 등급 자동 산정 로직 — 원본 매뉴얼 §10-2

원본에서 "A/B/C/D 등급화"가 명시되어 있고, v5 §13에서 "등급에 따라 지원 리소스 자동 분배"라고 했지만, 등급을 어떤 기준으로 자동 산정/제안하는지 로직이 없었다.

```python
# crisis_detection_service.py에 추가
def suggest_portfolio_grade(startup_id: uuid.UUID) -> PortfolioGrade:
    """최근 KPI, 후속투자 현황, 위기 신호를 종합하여 등급 제안"""
    
    kpi = get_latest_kpi(startup_id)
    follow_on = get_follow_on_status(startup_id)
    crisis = get_crisis_flags(startup_id)
    
    # A등급 조건: 후속투자 활발 + KPI 상승 + 위기 없음
    if follow_on.status in ["ir_active", "termsheet"] and kpi_improving and no_crisis:
        return PortfolioGrade.A
    
    # B등급 조건: 시장검증 진행 중 + PoC/고객 활동 있음
    if has_active_poc or kpi.poc_count > 0 or kpi.customer_count_growing:
        return PortfolioGrade.B
    
    # C등급 조건: KPI 정체/하락 + 전략 전환 필요 신호
    if kpi_declining_2months or no_traction:
        return PortfolioGrade.C
    
    # D등급 조건: 위기 플래그 + runway 위험 + 장기 정체
    if crisis.cash_critical or kpi_declining_3months:
        return PortfolioGrade.D
    
    return PortfolioGrade.B  # 기본값
```

### 등급 변경 워크플로우
- crisis_scan Celery task에서 월 1회 전체 포트폴리오 등급 자동 제안
- 제안값 ≠ 현재 등급 → 보육팀 PM에게 Notification (등급 변경 검토 요청)
- 실제 변경은 PM 또는 Partner만 가능 (RBAC: 포트폴리오 등급 변경 권한)
- 변경 시 ActivityLog에 변경 사유 기록 필수

---

## 34. JD 시드 데이터 핵심 필드 — 업무양식 파일에서 추출

Claude Code가 시드 데이터 생성 시 참조할 JD 핵심 내용:

### JD-01 Sourcing Manager
```json
{
  "purpose": "액셀러레이터의 투자전략 및 프로그램 방향에 부합하는 유망 초기기업을 발굴하고, 고품질 딜플로우를 안정적으로 확보한다.",
  "core_responsibilities": ["유망 스타트업 발굴 채널 확보 및 운영","상시/배치 모집 기획 및 실행","산학연/VC/CVC/창업생태계 네트워크 구축","1차 적합성 검토 및 CRM 등록","초기 미팅 주관 및 기업정보 정리","심사팀 인계용 스크리닝 메모 작성","채널별 유입 성과 분석","행사/포럼/데모데이 기반 소싱 확대"],
  "authority_scope": ["1차 미팅 진행","1차 스크리닝 등급 부여","심사팀 검토 요청","외부 소싱 제휴 제안"],
  "approval_required": ["최종 투자조건 결정","법무 판단","프로그램 우선순위 단독 확정"]
}
```

### JD-03 Investment Associate
```json
{
  "purpose": "소싱된 스타트업을 대상으로 팀, 시장, 기술, 사업성, 투자적합성을 검토하여 투자 또는 보육 의사결정이 가능하도록 심사자료를 구조화한다.",
  "core_responsibilities": ["서류 검토","인터뷰 심사","기본 DD 진행","시장/경쟁사 조사","투자 메모 작성","IC 상정자료 작성","리스크 로그 작성","투자 후 핵심 모니터링 포인트 도출"],
  "authority_scope": ["DD 자료 요청","투자검토 의견 제시","IC 안건 초안 작성"],
  "approval_required": ["프로그램 운영 세부 확정","계약서 최종 보관/관리","파트너사 커뮤니케이션 전담"]
}
```

### JD-05 Program Manager
```json
{
  "purpose": "포트폴리오 스타트업의 성장 병목을 진단하고, 맞춤형 액셀러레이팅 프로그램과 멘토링, KPI 관리를 통해 기업의 성장속도와 후속투자 가능성을 높인다.",
  "core_responsibilities": ["온보딩 운영","성장진단","액션플랜 수립 지원","멘토링 기획·운영","공통 프로그램 운영","KPI 관리","IR 준비 지원","데모데이 운영","포트폴리오 후속관리"],
  "authority_scope": ["멘토링 계획 수립","프로그램 일정 운영","기업별 지원 우선순위 제안","내부 협업 요청"],
  "approval_required": ["투자 약속","밸류에이션 협상","계약 수정 승인"]
}
```

### JD-07 Open Innovation Manager
```json
{
  "purpose": "스타트업과 대·중견기업, 공공기관, 전략적 투자자 간 협업 기회를 발굴하고, 이를 PoC, 공동개발, 공급계약, 전략적 투자로 전환시킨다.",
  "core_responsibilities": ["기업 파트너 발굴","기술수요 확인","스타트업-파트너 매칭","PoC 기획","실증 진행 관리","후속 상용화 협의","전략적 투자자 연결","파트너십 DB 관리"],
  "authority_scope": ["파트너 미팅 주관","스타트업 추천","PoC 구조 제안","내부 자원 협업 요청"],
  "approval_required": ["법적 구속력 있는 거래 약속","투자조건 확약","보안/법무 검토 없는 PoC 실행"]
}
```

### JD-09 Operations Manager
```json
{
  "purpose": "투자, 계약, 보고, 재무, 컴플라이언스, 문서관리 등 액셀러레이터 운영의 실무 통제 기능을 담당하여 조직의 안정성과 법적 정합성을 유지한다.",
  "core_responsibilities": ["계약서 관리","투자집행 관리","cap table 관리","조합/재원 관리","회계·세무 지원","정부/LP 보고","문서 보안 및 보존","컴플라이언스 점검"],
  "authority_scope": ["계약 문서 검토 요청","보고자료 제출 요청","프로세스 준수 시정 요청"],
  "approval_required": ["투자판단","스타트업 성장전략 수립","고객매칭 우선순위 결정"]
}
```

---

## 35. Phase 1 퀵스타트 체크리스트

Claude Code에서 `Phase 1: 기반 인프라` 시작 시 정확한 실행 순서:

```
□ 1. 프로젝트 루트 생성: C:\Users\jghyu\elsa\
□ 2. 이 파일을 CLAUDE.md로 복사
□ 3. .env 파일 생성 (§29 템플릿)
□ 4. docker-compose.yml 생성 (§20)
□ 5. backend/ 디렉토리 구조 생성 (§10)
□ 6. backend/requirements.txt 작성:
     fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic
     pydantic[email] python-jose[cryptography] passlib[bcrypt]
     celery redis python-multipart
□ 7. backend/Dockerfile 작성
□ 8. frontend/ Next.js 14 프로젝트 초기화 (App Router)
□ 9. frontend/Dockerfile 작성
□ 10. docker-compose up --build 실행
□ 11. alembic init + alembic.ini 설정 (DATABASE_URL 연동)
□ 12. enums.py 작성 (§3-2 전체 Enum)
□ 13. models/ 작성 — users.py 먼저, 이후 §30 순서대로
□ 14. alembic revision --autogenerate → alembic upgrade head
□ 15. seed.py 실행 (§21 시드 데이터)
□ 16. auth.py (JWT 발급/검증) + rbac.py (권한 미들웨어)
□ 17. /api/v1/auth/ 라우터 (login, me)
□ 18. /api/v1/startups/ CRUD 라우터
□ 19. frontend layout.tsx + 로그인 페이지 + 메인 대시보드 스켈레톤
□ 20. startup/[id]/ 통합 프로필 페이지 (overview 탭만)
□ 21. Cloudflare Tunnel 설정 확인
→ Phase 1 완료 기준: 로그인 → 스타트업 등록/조회 → 프로필 확인 가능
```

---

> **v5.1 업데이트 반영사항** (v5 대비 추가분):
> - §31 멘토 풀 관리, §32 배치 관리, §33 등급 자동 산정, §34 JD 시드 데이터, §35 Phase 1 퀵스타트

---

## 36. 클로징 전 실사 체크리스트 — 원본 전체업무 §5-3

원본 문서에 "실무에서 자주 빠뜨리는" 클로징 전 체크항목 7개가 별도 명시되어 있다. OPS-F01의 계약 행정 체크리스트(10개)와는 다른 레이어로, 심사팀→백오피스 인계 시 법무/사업 리스크를 사전 확인하는 항목이다.

```python
# InvestmentContract 모델에 추가 필드:
    pre_closing_checklist: Mapped[dict | None]  # JSON
    # {
    #   "ip_transfer_clear": bool,          # 지식재산권 양도/귀속 정리
    #   "unregistered_options_resolved": bool,  # 미등기 주식옵션 이슈
    #   "cofounder_exit_risk_checked": bool,    # 공동창업자 퇴사 리스크
    #   "tax_delinquency_checked": bool,        # 세금 체납 여부
    #   "gov_project_restriction_checked": bool, # 정부과제 참여 제한
    #   "key_contracts_complete": bool,          # 핵심 계약서 누락 여부
    #   "use_of_funds_confirmed": bool           # 투자금 사용계획 확정
    # }
```

### 자동화 트리거
- IC 승인 → OPS-F01 생성 시 `pre_closing_checklist`도 함께 초기화 (7개 항목 모두 false)
- 7개 전체 true + OPS-F01 10개 전체 complete → 비로소 Contract "completed" 전환 허용
- 즉, **계약 클로징 = pre_closing 7개 + 행정 10개 = 총 17개 체크 완료** 조건

---

## 37. 원본 매뉴얼의 "프로그램 운영 회의" 반영 — 회의체 보강

원본 운영매뉴얼 §12-2에 "프로그램 운영 회의"가 별도로 명시되어 있었으나, v5.1의 회의 테이블(§6)에는 5종만 있었다. 원본의 6종 회의를 완전 매핑:

| 원본 매뉴얼 회의명 | v6 MeetingType | 비고 |
|---|---|---|
| 주간 딜소싱 회의 | WEEKLY_DEAL | ✅ 반영됨 |
| 투자심사 회의 | IC | ✅ (IC로 통합) |
| 포트폴리오 리뷰 회의 | WEEKLY_PORTFOLIO | ✅ 반영됨 |
| 파트너십 회의 | PARTNER_REVIEW | ✅ 반영됨 |
| 프로그램 운영 회의 | **PROGRAM_OPS** | ❌ 누락 → 추가 |
| 리스크 점검 회의 | RISK_REVIEW | ✅ 반영됨 |

### MeetingType Enum 추가
```python
    PROGRAM_OPS = "program_ops"           # 프로그램 운영 회의
```

### 회의체 테이블 보강
| 회의 | 주기 | 참석 | 핵심 안건 |
|------|------|------|-----------|
| 프로그램 운영 회의 | 격주 | 보육팀 + 대표 | 배치 진행, 교육 일정, 멘토 배정, 데모데이 준비, 프로그램 품질 개선 |

---

## 38. Startup 모델에 누락된 원본 필드 보강

원본 전체업무 문서에서 딜소싱 시 수집하는 핵심 정보 중, Startup 모델에 아직 반영되지 않은 항목:

```python
# Startup 모델에 추가:
    founded_date: Mapped[date | None]         # 설립일 (SRC-F01의 설립일 필드)
    location: Mapped[str | None]              # 소재지 (SRC-F01)
    main_customer: Mapped[str | None]         # 주요 고객 (SRC-F01)
    current_traction: Mapped[str | None]      # 현재 성과 (SRC-F01)
    current_revenue: Mapped[int | None]       # 현재 매출 (원본 §10-1 월간 리포트 항목)
    current_employees: Mapped[int | None]     # 현재 인원
    first_meeting_date: Mapped[date | None]   # 1차 미팅 예정일/완료일
    batch_id: Mapped[uuid.UUID | None]        # FK → batches (§32에서 제안한 FK 전환)
```

SRC-F01 양식의 14개 필드가 Startup 테이블에 모두 매핑되어야 "양식 제출 → 자동 생성"이 누락 없이 작동한다.

---

## 39. 프론트엔드 전체 화면 목록 — 최종 정리

Claude Code가 프론트엔드 구현 시 참조할 전체 화면 인벤토리:

```
총 화면 수: 약 45개

[공통]
1. 로그인 페이지
2. 메인 대시보드 (전사 8대 KPI + 긴급 알림)
3. 알림 센터 (notifications)

[Sourcing팀] — /sourcing/
4. 딜플로우 칸반보드 (pipeline)
5. 1차 스크리닝 폼 (screening/new)
6. 소싱 분석 리포트 (reports)

[심사팀] — /review/
7. 심사 파이프라인 (pipeline)
8. 서류심사 5축 폼 (document-review)
9. 구조화 인터뷰 폼 (interview)
10. DD 체크리스트 (dd)
11. 투자메모 작성기 (memo)
12. IC 안건 관리 (ic)

[보육팀] — /incubation/
13. 포트폴리오 대시보드 (portfolio)
14. 온보딩 워크플로우 (onboarding)
15. 90일 액션플랜 (action-plan)
16. 멘토링 관리 (mentoring)
17. KPI 트래커 (kpi)
18. IR/Demo Day 준비 (demo-day)

[오픈이노베이션팀] — /oi/
19. 파트너 수요맵 (partners)
20. 매칭 엔진 (matching)
21. PoC 프로젝트 관리 (poc)
22. 전환결과 추적 (conversion)
23. 정부사업 연계 (government)

[백오피스팀] — /backoffice/
24. 계약 관리 센터 (contracts)
25. 투자 집행 관리 (execution)
26. Cap Table (cap-table)
27. 조합 관리 (funds)
28. 보고 센터 (reports)
29. 컴플라이언스 (compliance)

[스타트업 통합 프로필] — /startup/[id]/
30~42. 13개 탭 (§28)

[관리] — /admin/
43. SOP 관리
44. 양식 템플릿 관리
45. KPI 목표 설정
46. JD 관리
47. 조직/배치/투자Thesis 설정
48. 멘토 풀 관리

[크로스팀]
49. 인계 관리 (handovers)
50. 회의 관리 (meetings)

[KPI 대시보드]
51. 팀별 4계층 KPI (kpi/team/[team])
52. 전사 경영 대시보드 (kpi/executive)
53. 기업별 KPI 추이 (kpi/startup/[id])
```

---

## 40. 최종 테이블 카운트 및 통합 모델 목록

Claude Code가 `models/__init__.py`에서 import할 전체 모델:

```python
# models/__init__.py — 총 35개 모델
from .user import User                          # 1
from .startup import Startup                    # 2
from .deal_flow import DealFlow                 # 3
from .screening import Screening                # 4
from .review import Review                      # 5
from .investment_memo import InvestmentMemo      # 6
from .ic_decision import ICDecision             # 7
from .contract import InvestmentContract        # 8
from .cap_table import CapTableEntry            # 9
from .incubation import Incubation              # 10
from .mentoring import MentoringSession         # 11
from .kpi import KPIRecord                      # 12
from .partner import PartnerDemand              # 13
from .poc import PoCProject                     # 14
from .follow_on import FollowOnInvestment       # 15
from .exit_record import ExitRecord             # 16
from .handover import HandoverDocument          # 17
from .meeting import Meeting                    # 18
from .notification import Notification          # 19
from .activity_log import ActivityLog           # 20
from .report import Report                      # 21
from .sop import SOPTemplate, SOPExecution      # 22, 23
from .form import FormTemplate, FormSubmission  # 24, 25
from .team_kpi import TeamKPI                   # 26
from .job_description import JobDescription     # 27
from .demo_day import DemoDay                   # 28
from .investor_meeting import InvestorMeeting   # 29
from .organization_settings import OrganizationSettings  # 30
from .fund import Fund, FundLP, FundInvestment  # 31, 32, 33
from .government_program import GovernmentProgram  # 34
from .document import Document                  # 35
from .mentor import Mentor                      # 36
from .batch import Batch                        # 37
```

---

> **v6.0 FINAL 업데이트 반영사항** (v5.1 대비 추가분):
> - §36 클로징 전 실사 체크리스트 7개항: 원본 §5-3의 "실무에서 자주 빠뜨리는" IP양도/미등기옵션/공동창업자퇴사/세금체납/정부과제제한/핵심계약누락/투자금사용계획 → `pre_closing_checklist` 필드 추가. 계약 클로징 = pre_closing 7개 + 행정 10개 = **총 17개 체크 완료** 조건
> - §37 MeetingType에 `PROGRAM_OPS` 추가: 원본 매뉴얼 6종 회의 중 "프로그램 운영 회의" 누락 보완
> - §38 Startup 모델 필드 보강: SRC-F01 양식의 14개 필드 → Startup 테이블 완전 매핑 (founded_date/location/main_customer/current_traction/current_revenue/current_employees/first_meeting_date/batch_id)
> - §39 프론트엔드 전체 화면 목록 53개: Claude Code가 UI 구현 시 참조할 최종 화면 인벤토리
> - §40 통합 모델 목록 37개: `models/__init__.py` import 문 완성본
> - 프로젝트 구조 보강: models에 fund/government_program/document/mentor/batch 5개 파일 추가, routers에 funds/government_programs/documents/mentors/batches 5개 추가, services에 document_service/portfolio_grade_service 추가
> - Alembic 마이그레이션 순서 §32개로 업데이트: mentors/batches 테이블 추가 + FK 의존성 재정렬

---

## 41. Backend Dockerfile + Frontend Dockerfile — 즉시 사용 가능한 버전

### backend/Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 (asyncpg 빌드용)
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### frontend/Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### frontend 초기 패키지 (package.json dependencies)
```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "@hello-pangea/dnd": "^16",
    "recharts": "^2.12",
    "lucide-react": "^0.400",
    "axios": "^1.7",
    "zustand": "^4.5",
    "date-fns": "^3.6",
    "class-variance-authority": "^0.7",
    "clsx": "^2.1",
    "tailwind-merge": "^2.3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

---

## 42. API 응답 표준 + 에러 처리 컨벤션

Claude Code가 모든 라우터에서 일관된 응답 형식을 사용하도록:

### 성공 응답
```python
# 단일 객체
{"data": {...}, "message": "스타트업이 등록되었습니다."}

# 목록 (페이지네이션)
{"data": [...], "total": 42, "page": 1, "page_size": 20, "message": null}
```

### 에러 응답
```python
# HTTPException 통일 형식
{"detail": "해당 스타트업을 찾을 수 없습니다.", "error_code": "STARTUP_NOT_FOUND"}

# 422 Validation Error는 FastAPI 기본 형식 유지
```

### 표준 에러 코드 (한글 메시지)
```python
class ErrorCode:
    # 인증
    INVALID_CREDENTIALS = ("인증 정보가 올바르지 않습니다.", 401)
    TOKEN_EXPIRED = ("토큰이 만료되었습니다.", 401)
    PERMISSION_DENIED = ("해당 작업에 대한 권한이 없습니다.", 403)
    
    # CRUD
    NOT_FOUND = ("{entity}을(를) 찾을 수 없습니다.", 404)
    ALREADY_EXISTS = ("이미 존재하는 {entity}입니다.", 409)
    
    # 비즈니스 로직
    INVALID_STAGE_TRANSITION = ("'{from_stage}'에서 '{to_stage}'로 이동할 수 없습니다.", 400)
    HANDOVER_NOT_ACKNOWLEDGED = ("인계가 아직 확인되지 않았습니다.", 400)
    CLOSING_CHECKLIST_INCOMPLETE = ("클로징 체크리스트가 완료되지 않았습니다. ({completed}/17)", 400)
    IC_DECISION_REQUIRED = ("투자위원회 결정이 필요합니다.", 400)
    FORM_REQUIRED_FIELDS_MISSING = ("필수 항목이 누락되었습니다: {fields}", 400)
```

---

## 43. RBAC 미들웨어 구현 패턴

```python
# middleware/rbac.py
from functools import wraps

# §7의 권한 매트릭스를 코드로 정의
PERMISSIONS = {
    "deal_flow": {"partner": "full", "sourcing": "full", "review": "read", "incubation": "read", "oi": "read", "backoffice": "read"},
    "screening": {"partner": "read", "sourcing": "full", "review": "read"},
    "review_dd_memo": {"partner": "full", "review": "full", "incubation": "read", "backoffice": "read"},
    "ic_decision": {"partner": "full", "review": "write", "backoffice": "read"},
    "contract": {"partner": "approve", "backoffice": "full"},
    "valuation": {"partner": "full", "review": "full"},
    "incubation_mentoring": {"partner": "read", "review": "read", "incubation": "full", "oi": "read"},
    "kpi": {"partner": "full", "review": "read", "incubation": "full", "oi": "read", "backoffice": "read"},
    "portfolio_grade": {"partner": "full", "incubation": "full"},
    "poc_matching": {"partner": "read", "incubation": "read", "oi": "full"},
    "cap_table": {"partner": "read", "review": "read", "backoffice": "full"},
    "compliance": {"partner": "full", "backoffice": "full"},
    "legal_commitment": {"partner": "full"},
}

def require_permission(resource: str, level: str = "read"):
    """데코레이터: 해당 리소스에 대해 최소 level 이상의 권한 필요"""
    LEVEL_ORDER = {"read": 1, "write": 2, "full": 3, "approve": 4}
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user=None, **kwargs):
            user_team = current_user.team
            allowed = PERMISSIONS.get(resource, {}).get(user_team)
            if not allowed or LEVEL_ORDER.get(allowed, 0) < LEVEL_ORDER.get(level, 0):
                raise HTTPException(403, detail=ErrorCode.PERMISSION_DENIED[0])
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# 사용 예시
@router.post("/ic-decisions/")
@require_permission("ic_decision", "write")
async def create_ic_decision(data: ICDecisionCreate, current_user: User = Depends(get_current_user)):
    ...
```

---

## 44. DealStage 전이 규칙 — 유효한 단계 이동만 허용

원본 매뉴얼의 파이프라인 흐름을 시스템에서 강제:

```python
# services/pipeline_service.py
VALID_TRANSITIONS = {
    "inbound": ["first_screening", "rejected"],
    "first_screening": ["deep_review", "rejected"],
    "deep_review": ["interview", "rejected"],
    "interview": ["due_diligence", "rejected"],
    "due_diligence": ["ic_pending", "rejected"],
    "ic_pending": ["ic_review"],
    "ic_review": ["approved", "conditional", "on_hold", "incubation_first", "rejected"],
    "approved": ["contract"],
    "conditional": ["contract", "on_hold", "rejected"],
    "on_hold": ["ic_review", "rejected"],  # 재심
    "incubation_first": ["ic_review"],     # 보육 후 재심
    "contract": ["closed"],
    "closed": ["portfolio"],
    "rejected": [],  # 종착점 (단, admin은 복구 가능)
    "portfolio": [],  # 종착점
}

def validate_stage_transition(current: str, target: str, user_role: str) -> bool:
    if target not in VALID_TRANSITIONS.get(current, []):
        # admin/partner만 예외적 역방향 이동 허용
        if user_role not in ["admin", "partner"]:
            raise HTTPException(400, detail=f"'{current}'에서 '{target}'로 이동할 수 없습니다.")
    return True
```

### 단계 이동 시 자동 트리거 매핑
```python
STAGE_TRIGGERS = {
    ("first_screening", "deep_review"): "create_handover_sourcing_to_review",
    ("ic_review", "approved"): "create_handover_review_to_backoffice_and_incubation",
    ("ic_review", "conditional"): "create_condition_tracking_task",
    ("ic_review", "on_hold"): "schedule_re_review",
    ("ic_review", "incubation_first"): "assign_to_incubation_priority",
    ("contract", "closed"): "update_cap_table_and_create_incubation",
    ("closed", "portfolio"): "activate_exit_checklist",
}
```

---

## 45. 크로스 참조 정합성 검증표

이 문서 내의 모든 엔티티/양식/SOP/KPI/화면이 서로 정합하는지 최종 검증:

| 검증 항목 | 상태 | 비고 |
|-----------|------|------|
| 37개 모델(§40) ↔ 37개 테이블 마이그레이션(§30) | ✅ | mentors, batches 포함 |
| 14개 양식(§15) ↔ 6개 SOP(§14) 관련양식 | ✅ | 전체 매핑 완료 |
| 10개 자동화 로직(§18) ↔ 양식 트리거 | ✅ | 1:1 대응 |
| 39개 팀KPI(§16) ↔ 자동집계 수식(§19) | ✅ | 5개팀 × 7~8개 |
| 53개 화면(§39) ↔ API 라우터(§9) | ✅ | 전체 대응 |
| RBAC 매트릭스(§7) ↔ JD 권한(§34) | ✅ | authority_scope/approval_required 연동 |
| SRC-F01 14필드 ↔ Startup 모델(§38) | ✅ | founded_date~batch_id 추가로 완전 매핑 |
| OPS-F01 10항목 + pre_closing 7항목(§36) ↔ Contract.closing_checklist | ✅ | 총 17개 체크 |
| 회의 6종(§37) ↔ MeetingType Enum | ✅ | PROGRAM_OPS 추가 완료 |
| 원본 11단계 ↔ DealStage 15값 | ✅ | 11단계 + 분기(conditional/on_hold/incubation_first/contract) |
| 딥테크 심화 필드(§27) ↔ Review 모델 | ✅ | tech_type~purchase_lead_time_months 6필드 |
| 산업별 KPI 템플릿(§8-4) 5종 ↔ Incubation.action_plan | ✅ | 딥테크 맞춤 분기 지원 |

**결론: 원본 3개 파일(전체업무, 운영매뉴얼, 업무양식)의 모든 도메인 지식이 시스템 설계에 반영 완료.**

---

> **v6.1 FINAL 업데이트 반영사항** (v6.0 대비 추가분):
> - §41 Dockerfile 2종 + frontend package.json: 즉시 `docker-compose up --build` 가능한 빌드 파일
> - §42 API 응답 표준 + 에러 처리: 성공/에러 응답 형식 통일 + 비즈니스 로직 에러 코드 한글 메시지
> - §43 RBAC 미들웨어 구현 패턴: §7 권한 매트릭스를 Python 코드로 변환 + `@require_permission` 데코레이터
> - §44 DealStage 전이 규칙: 유효한 단계 이동만 허용하는 상태 머신 + 단계별 자동 트리거 매핑
> - §45 크로스 참조 정합성 검증표: 12개 검증 항목 전체 ✅ — 원본 3개 파일의 모든 도메인 지식 반영 완료 확인

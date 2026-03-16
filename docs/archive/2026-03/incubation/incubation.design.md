# Design: 보육팀 모듈 (Phase 5)

> **Feature**: incubation
> **Plan Reference**: `docs/01-plan/features/incubation.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 Incubation 모델 (`models/incubation.py`)

마스터 §3-3 Incubation 스펙 기반. PRG-F01 온보딩 + PRG-F02 액션플랜 데이터.

```python
class Incubation(Base):
    __tablename__ = "incubations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"))
    batch_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("batches.id"), nullable=True)
    assigned_pm_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    # 프로그램 기간
    program_start: Mapped[date] = mapped_column(Date)
    program_end: Mapped[date] = mapped_column(Date)

    # PRG-F01 온보딩 진단 7개 항목
    diagnosis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # → {"customer": 1-5, "product": 1-5, "tech": 1-5, "org": 1-5,
    #    "sales": 1-5, "finance": 1-5, "investment_readiness": 1-5}

    # PRG-F02 90일 액션플랜
    action_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # → {"goals": [...], "items": [
    #      {"area": "product|customer|revenue|investment|org",
    #       "current_state": "...", "target_state": "...",
    #       "tasks": "...", "owner": "...", "deadline": "YYYY-MM-DD"}
    #   ]}

    growth_bottleneck: Mapped[str | None] = mapped_column(Text, nullable=True)
    portfolio_grade: Mapped[PortfolioGrade] = mapped_column(default=PortfolioGrade.B)
    status: Mapped[str] = mapped_column(String(50), default="onboarding")
    # status: onboarding / active / graduated / paused

    # 위기 신호 플래그
    crisis_flags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # → {"cash_critical": false, "key_person_left": false,
    #    "customer_churn": false, "dev_delay": false, "lawsuit": false}

    # 온보딩 체크리스트 (PRG-F01)
    onboarding_checklist: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # → {"items": [{"label": "...", "completed": bool}], "completed_at": null}

    # IR 준비 상태
    ir_readiness: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # → {"pitch_1min": false, "pitch_5min": false, "ir_deck": false,
    #    "data_room": false, "faq": false, "valuation_logic": false,
    #    "use_of_funds": false, "milestone_plan": false}

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

**diagnosis JSON 구조** (온보딩 진단 7개 항목):
```json
{
  "customer": 3,
  "product": 4,
  "tech": 5,
  "org": 2,
  "sales": 3,
  "finance": 2,
  "investment_readiness": 3
}
```

**status 상태 머신**:
```
onboarding → active → graduated
                    → paused → active (재개)
```

### 1.2 MentoringSession 모델 (`models/mentoring_session.py`)

PRG-F03 멘토링 기록지. 이벤트가 아닌 실행관리 중심.

```python
class MentoringSession(Base):
    __tablename__ = "mentoring_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"))
    mentor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mentors.id"), nullable=True)
    mentor_name: Mapped[str] = mapped_column(String(100))  # 외부 비등록 멘토도 지원
    mentor_type: Mapped[str] = mapped_column(String(50))
    # mentor_type: dedicated / functional / industry / investment / customer_dev

    session_date: Mapped[datetime] = mapped_column()

    # 실행관리 구조
    pre_agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    discussion_summary: Mapped[str] = mapped_column(Text)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 액션아이템 (JSON 배열)
    action_items: Mapped[list] = mapped_column(JSON, default=list)
    # → [{"task": "...", "owner": "...", "deadline": "YYYY-MM-DD",
    #     "status": "pending|in_progress|completed"}]

    next_session_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    action_completion_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    # 자동 계산: completed / total * 100

    improvement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pm_confirmed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

**action_items JSON 구조**:
```json
[
  {
    "task": "프로토타입 v2 완성",
    "owner": "CTO 김OO",
    "deadline": "2026-04-15",
    "status": "in_progress"
  },
  {
    "task": "고객 5명 인터뷰",
    "owner": "CEO 박OO",
    "deadline": "2026-04-10",
    "status": "completed"
  }
]
```

### 1.3 KPIRecord 모델 (`models/kpi_record.py`)

PRG-F04 월간 KPI 점검표. 12개 핵심 지표.

```python
class KPIRecord(Base):
    __tablename__ = "kpi_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"))
    period: Mapped[str] = mapped_column(String(7))       # "2026-03" (YYYY-MM)
    period_type: Mapped[str] = mapped_column(String(20), default="monthly")
    # period_type: monthly / biweekly / quarterly

    # 12개 핵심 KPI (모두 nullable — 입력 부담 경감)
    revenue: Mapped[int | None] = mapped_column(Integer, nullable=True)           # 매출 (원)
    customer_count: Mapped[int | None] = mapped_column(Integer, nullable=True)    # 고객 수
    active_users: Mapped[int | None] = mapped_column(Integer, nullable=True)      # 활성 사용자
    poc_count: Mapped[int | None] = mapped_column(Integer, nullable=True)         # PoC 건수
    repurchase_rate: Mapped[float | None] = mapped_column(Float, nullable=True)   # 재구매율 (%)
    release_velocity: Mapped[str | None] = mapped_column(String(100), nullable=True) # 릴리즈 속도
    cac: Mapped[int | None] = mapped_column(Integer, nullable=True)               # 고객 획득 비용
    ltv: Mapped[int | None] = mapped_column(Integer, nullable=True)               # 고객 생애 가치
    pilot_conversion_rate: Mapped[float | None] = mapped_column(Float, nullable=True) # 파일럿 전환율 (%)
    mou_to_contract_rate: Mapped[float | None] = mapped_column(Float, nullable=True)  # MOU→계약 전환율 (%)
    headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)         # 인원 수
    runway_months: Mapped[float | None] = mapped_column(Float, nullable=True)     # 잔여 운영 개월
    follow_on_meetings: Mapped[int | None] = mapped_column(Integer, nullable=True) # 후속투자 미팅 수

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

**UniqueConstraint**: `(startup_id, period)` — 한 기업 한 기간에 1개 레코드만.

### 1.4 DemoDay 모델 (`models/demo_day.py`)

Demo Day 관리 + IR 체크리스트 + 후속추적.

```python
class DemoDay(Base):
    __tablename__ = "demo_days"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("batches.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    event_date: Mapped[date] = mapped_column(Date)

    # 초청 투자자 목록
    invited_investors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # → [{"name": "...", "company": "...", "priority": "A|B|C",
    #     "matched_startups": ["startup_id_1", ...]}]

    # 스타트업별 준비 상태
    startup_readiness: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # → {"startup_id": {"ir_ready": true, "rehearsal_done": false, ...}}

    status: Mapped[str] = mapped_column(String(50), default="planning")
    # status: planning / rehearsal / completed / follow_up
    follow_up_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)  # event_date + 8주

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

### 1.5 InvestorMeeting 모델 (`models/investor_meeting.py`)

데모데이 후속 투자자 미팅 기록.

```python
class InvestorMeeting(Base):
    __tablename__ = "investor_meetings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"))
    demo_day_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("demo_days.id"), nullable=True)

    investor_name: Mapped[str] = mapped_column(String(100))
    investor_company: Mapped[str] = mapped_column(String(200))
    investor_type: Mapped[str] = mapped_column(String(50))
    # investor_type: angel / seed_vc / pre_a_vc / cvc / strategic / overseas

    meeting_date: Mapped[date] = mapped_column(Date)
    meeting_type: Mapped[str] = mapped_column(String(50))
    # meeting_type: onsite_consult / follow_up / ir_meeting / termsheet

    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # outcome: interested / passed / termsheet / invested

    materials_sent: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # → ["IR deck", "기술소개서", "재무제표"]
    next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

### 1.6 마이그레이션 순서

```
incubations (FK: startup_id → startups, assigned_pm_id → users, batch_id → batches)
  ↓
mentoring_sessions (FK: startup_id → startups, mentor_id → mentors, pm_confirmed_by → users)
  ↓
kpi_records (FK: startup_id → startups) + UniqueConstraint(startup_id, period)
  ↓
demo_days (FK: batch_id → batches)
  ↓
investor_meetings (FK: startup_id → startups, demo_day_id → demo_days)
```
단일 Alembic 리비전으로 5개 테이블 동시 생성. Batch.demo_day_id FK는 별도 리비전으로 추가.

---

## 2. API 설계

### 2.1 Incubation API (`routers/incubations.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/incubations/` | 포트폴리오 목록 | `?grade=&status=&search=` | `IncubationListResponse` |
| GET | `/api/v1/incubations/{id}` | 포트폴리오 상세 | - | `IncubationDetailResponse` |
| POST | `/api/v1/incubations/` | 온보딩 생성 (PRG-F01) | `IncubationCreate` | `IncubationResponse` |
| PUT | `/api/v1/incubations/{id}` | 온보딩 정보 수정 | `IncubationUpdate` | `IncubationResponse` |
| PATCH | `/api/v1/incubations/{id}/grade` | 등급 변경 | `GradeChangeRequest` | `IncubationResponse` |
| PATCH | `/api/v1/incubations/{id}/action-plan` | 액션플랜 저장 (PRG-F02) | `ActionPlanUpdate` | `IncubationResponse` |

**IncubationCreate** (PRG-F01):
```python
class IncubationCreate(BaseModel):
    startup_id: uuid.UUID
    assigned_pm_id: uuid.UUID
    program_start: date
    program_end: date
    batch_id: uuid.UUID | None = None
    growth_bottleneck: str | None = None
    diagnosis: dict | None = None      # 7개 항목
    initial_kpi_goals: list[str] | None = None  # 초기 우선 KPI 3개
```

**GradeChangeRequest**:
```python
class GradeChangeRequest(BaseModel):
    grade: PortfolioGrade   # A/B/C/D
    reason: str             # 변경 사유 (필수 — ActivityLog 기록용)
```

**ActionPlanUpdate** (PRG-F02):
```python
class ActionPlanUpdate(BaseModel):
    items: list[ActionPlanItem]

class ActionPlanItem(BaseModel):
    area: str          # product / customer / revenue / investment / org
    current_state: str
    target_state: str
    tasks: str
    owner: str
    deadline: date
```

**IncubationDetailResponse** (목록과 다른 상세 응답):
```python
class IncubationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    # 기본 필드 + 아래 관계 데이터
    recent_kpi: KPIRecordResponse | None       # 최신 KPI
    recent_mentoring: list[MentoringSessionResponse]  # 최근 3건
    kpi_trend: list[KPITrendItem]              # 최근 6개월 스파크라인 데이터
    has_crisis: bool                           # 위기 플래그 any True
```

**비즈니스 로직**: `incubation_service.create()`
1. Incubation 레코드 생성 (status=onboarding)
2. 기본 onboarding_checklist 초기화 (14개 체크항목)
3. crisis_flags 초기화 (모두 false)
4. ir_readiness 초기화 (모두 false)
5. ActivityLog 기록

### 2.2 MentoringSession API (`routers/mentoring_sessions.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/mentoring-sessions/` | 세션 목록 | `?startup_id=&mentor_id=` | `MentoringSessionListResponse` |
| GET | `/api/v1/mentoring-sessions/{id}` | 세션 상세 | - | `MentoringSessionResponse` |
| POST | `/api/v1/mentoring-sessions/` | 기록 생성 (PRG-F03) | `MentoringSessionCreate` | `MentoringSessionResponse` |
| PUT | `/api/v1/mentoring-sessions/{id}` | 기록 수정 | `MentoringSessionUpdate` | `MentoringSessionResponse` |
| PATCH | `/api/v1/mentoring-sessions/{id}/action-items` | 액션아이템 상태 변경 | `ActionItemStatusUpdate` | `MentoringSessionResponse` |

**MentoringSessionCreate** (PRG-F03):
```python
class MentoringSessionCreate(BaseModel):
    startup_id: uuid.UUID
    mentor_id: uuid.UUID | None = None
    mentor_name: str
    mentor_type: str         # dedicated/functional/industry/investment/customer_dev
    session_date: datetime
    pre_agenda: str | None = None
    discussion_summary: str
    feedback: str | None = None
    action_items: list[ActionItem] = []
    next_session_date: date | None = None

class ActionItem(BaseModel):
    task: str
    owner: str
    deadline: date
    status: str = "pending"  # pending / in_progress / completed
```

**ActionItemStatusUpdate**:
```python
class ActionItemStatusUpdate(BaseModel):
    items: list[ActionItemUpdate]

class ActionItemUpdate(BaseModel):
    index: int          # action_items 배열 인덱스
    status: str         # pending / in_progress / completed
```

**비즈니스 로직**: `mentoring_service.create()`
1. MentoringSession 저장
2. **자동화 #6**: action_items 각각에 대해 Notification 생성 (기한 포함)
3. action_completion_rate 계산 (completed / total * 100)
4. Mentor.engagement_count += 1 (mentor_id가 있으면)
5. ActivityLog 기록

### 2.3 KPIRecord API (`routers/kpi_records.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/kpi-records/` | KPI 목록 | `?startup_id=&period=` | `KPIRecordListResponse` |
| GET | `/api/v1/kpi-records/{startup_id}/trend` | 트렌드 | `?months=6` | `KPITrendResponse` |
| POST | `/api/v1/kpi-records/` | KPI 입력 (PRG-F04) | `KPIRecordCreate` | `KPIRecordResponse` |
| PUT | `/api/v1/kpi-records/{id}` | KPI 수정 | `KPIRecordUpdate` | `KPIRecordResponse` |

**KPIRecordCreate** (PRG-F04):
```python
class KPIRecordCreate(BaseModel):
    startup_id: uuid.UUID
    period: str                         # "2026-03"
    # 필수 5개
    revenue: int | None = None
    customer_count: int | None = None
    runway_months: float | None = None
    poc_count: int | None = None
    follow_on_meetings: int | None = None
    # 선택 8개
    active_users: int | None = None
    repurchase_rate: float | None = None
    release_velocity: str | None = None
    cac: int | None = None
    ltv: int | None = None
    pilot_conversion_rate: float | None = None
    mou_to_contract_rate: float | None = None
    headcount: int | None = None
    notes: str | None = None
```

**KPITrendResponse**:
```python
class KPITrendResponse(BaseModel):
    startup_id: uuid.UUID
    periods: list[str]               # ["2026-01", "2026-02", "2026-03"]
    revenue: list[int | None]
    customer_count: list[int | None]
    runway_months: list[float | None]
    # ... 기타 지표
    warnings: list[KPIWarning]       # 3개월 연속 하락 경보

class KPIWarning(BaseModel):
    metric: str          # "revenue", "customer_count", "runway_months"
    message: str         # "매출이 3개월 연속 하락했습니다"
    severity: str        # "warning" / "critical"
```

**비즈니스 로직**: `kpi_service.create()`
1. 동일 (startup_id, period) 중복 체크 → 있으면 409 에러
2. KPIRecord 저장
3. **자동화 #7**: 최근 3개월 트렌드 검사
   - revenue, customer_count, runway_months 중 1개라도 3개월 연속 하락 시:
   - KPI_WARNING Notification 생성 (보육팀 PM + Partner)
   - Incubation.crisis_flags 해당 항목 업데이트
4. 전월 대비 증감 데이터 응답에 포함
5. ActivityLog 기록

**3개월 연속 하락 판정 로직**:
```python
async def check_kpi_decline(db, startup_id, new_record):
    """revenue, customer_count, runway_months 각각 3개월 연속 하락 체크"""
    records = await get_recent_records(db, startup_id, months=3)
    if len(records) < 3:
        return []  # 데이터 부족

    warnings = []
    for metric in ["revenue", "customer_count", "runway_months"]:
        values = [getattr(r, metric) for r in records]
        if all(v is not None for v in values):
            if values[0] > values[1] > values[2]:  # 3개월 연속 하락
                warnings.append(KPIWarning(
                    metric=metric,
                    message=f"{METRIC_LABELS[metric]}이(가) 3개월 연속 하락했습니다",
                    severity="critical" if metric == "runway_months" else "warning",
                ))
    return warnings
```

### 2.4 DemoDay API (`routers/demo_days.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/demo-days/` | 목록 | `?status=` | `DemoDayListResponse` |
| GET | `/api/v1/demo-days/{id}` | 상세 | - | `DemoDayResponse` |
| POST | `/api/v1/demo-days/` | 생성 | `DemoDayCreate` | `DemoDayResponse` |
| PUT | `/api/v1/demo-days/{id}` | 수정 | `DemoDayUpdate` | `DemoDayResponse` |

**DemoDayCreate**:
```python
class DemoDayCreate(BaseModel):
    title: str
    event_date: date
    batch_id: uuid.UUID | None = None
    follow_up_weeks: int = 8  # follow_up_deadline = event_date + N주
```

### 2.5 InvestorMeeting API (`routers/investor_meetings.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/investor-meetings/` | 목록 | `?startup_id=&demo_day_id=&outcome=` | `InvestorMeetingListResponse` |
| GET | `/api/v1/investor-meetings/{id}` | 상세 | - | `InvestorMeetingResponse` |
| POST | `/api/v1/investor-meetings/` | 생성 | `InvestorMeetingCreate` | `InvestorMeetingResponse` |
| PUT | `/api/v1/investor-meetings/{id}` | 수정 | `InvestorMeetingUpdate` | `InvestorMeetingResponse` |

**InvestorMeetingCreate**:
```python
class InvestorMeetingCreate(BaseModel):
    startup_id: uuid.UUID
    demo_day_id: uuid.UUID | None = None
    investor_name: str
    investor_company: str
    investor_type: str       # angel/seed_vc/pre_a_vc/cvc/strategic/overseas
    meeting_date: date
    meeting_type: str        # onsite_consult/follow_up/ir_meeting/termsheet
    outcome: str | None = None
    materials_sent: list[str] | None = None
    next_step: str | None = None
    notes: str | None = None
```

### 2.6 Mentor API (기존 모델 활용, 라우터만 추가)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/mentors/` | 목록 | `?is_active=&mentor_type=&expertise=` | `MentorListResponse` |
| GET | `/api/v1/mentors/{id}` | 상세 | - | `MentorResponse` |
| POST | `/api/v1/mentors/` | 생성 | `MentorCreate` | `MentorResponse` |
| PUT | `/api/v1/mentors/{id}` | 수정 | `MentorUpdate` | `MentorResponse` |

---

## 3. 서비스 설계

### 3.1 incubation_service.py

```python
async def get_list(db, page, page_size, grade, status, search) -> tuple[list, int]
    # 필터: grade, status, search(기업명)
    # JOIN: Startup (기업명, 산업 등)

async def get_by_id(db, incubation_id) -> Incubation | None

async def get_detail(db, incubation_id) -> dict
    # Incubation + 최신 KPI + 최근 멘토링 3건 + KPI 트렌드 6개월 + has_crisis

async def create(db, data, user) -> Incubation
    # 1. Incubation 생성 (status=onboarding)
    # 2. onboarding_checklist 초기화
    # 3. crisis_flags 초기화
    # 4. ir_readiness 초기화
    # 5. ActivityLog

async def update(db, incubation, data, user) -> Incubation

async def change_grade(db, incubation, grade, reason, user) -> Incubation
    # 1. grade 변경
    # 2. ActivityLog (reason 포함 필수)
    # RBAC: pm/partner만

async def update_action_plan(db, incubation, data, user) -> Incubation
    # 1. action_plan JSON 저장
    # 2. 기한별 Notification 등록
    # 3. ActivityLog

async def update_crisis_flags(db, incubation, flags, user) -> Incubation
```

### 3.2 mentoring_service.py

```python
async def get_list(db, startup_id, mentor_id, page, page_size) -> tuple[list, int]

async def get_by_id(db, session_id) -> MentoringSession | None

async def create(db, data, user) -> MentoringSession
    # 1. MentoringSession 저장
    # 2. action_completion_rate 계산
    # 3. 자동화 #6: action_items → Notification 생성
    # 4. mentor_id 있으면 Mentor.engagement_count += 1
    # 5. ActivityLog

async def update(db, session, data, user) -> MentoringSession

async def update_action_items(db, session, items, user) -> MentoringSession
    # 1. action_items 상태 변경
    # 2. action_completion_rate 재계산
    # 3. ActivityLog

def calculate_completion_rate(action_items: list) -> float
    # completed / total * 100 (total=0이면 0.0)
```

### 3.3 kpi_service.py

```python
async def get_list(db, startup_id, period, page, page_size) -> tuple[list, int]

async def get_trend(db, startup_id, months=6) -> dict
    # 최근 N개월 KPI + 3개월 하락 경보

async def create(db, data, user) -> KPIRecord
    # 1. 중복 체크 (startup_id + period)
    # 2. KPIRecord 저장
    # 3. 자동화 #7: check_kpi_decline()
    # 4. 경보 발생 시 → Notification + crisis_flags 업데이트
    # 5. ActivityLog

async def update(db, record, data, user) -> KPIRecord

async def check_kpi_decline(db, startup_id, new_record) -> list[KPIWarning]
    # 3개월 연속 하락 판정 (revenue, customer_count, runway_months)

async def get_previous_period(db, startup_id, period) -> KPIRecord | None
    # 전월 데이터 (증감 계산용)
```

### 3.4 demo_day_service.py

```python
async def get_list(db, status, page, page_size) -> tuple[list, int]
async def get_by_id(db, demo_day_id) -> DemoDay | None
async def create(db, data, user) -> DemoDay
    # follow_up_deadline = event_date + N주
async def update(db, demo_day, data, user) -> DemoDay
```

### 3.5 investor_meeting_service.py

```python
async def get_list(db, startup_id, demo_day_id, outcome, page, page_size) -> tuple[list, int]
async def get_by_id(db, meeting_id) -> InvestorMeeting | None
async def create(db, data, user) -> InvestorMeeting
async def update(db, meeting, data, user) -> InvestorMeeting
```

### 3.6 mentor_service.py

```python
async def get_list(db, is_active, mentor_type, expertise, page, page_size) -> tuple[list, int]
async def get_by_id(db, mentor_id) -> Mentor | None
async def create(db, data, user) -> Mentor
async def update(db, mentor, data, user) -> Mentor
```

---

## 4. Frontend 컴포넌트 설계

### 4.1 포트폴리오 대시보드 (`/incubation`)

```
┌─────────────────────────────────────────────────────────────────┐
│  포트폴리오 대시보드                        [+ 온보딩]  [필터 ▼]  │
│                                                                 │
│  ┌─ 전체: 20 ─ A: 5 ─ B: 8 ─ C: 5 ─ D: 2 ─ 위기: 3 ──────┐   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ A  QuantumAI  │  │ B  바이오텍X  │  │ ⚠ D  로보틱  │          │
│  │              │  │              │  │              │          │
│  │ 산업: AI/SaaS │  │ 산업: 바이오  │  │ 산업: 모빌리티│          │
│  │ PM: 김보육    │  │ PM: 이육성   │  │ PM: 박멘토    │          │
│  │ ▁▃▅▆█ 매출↑ │  │ ▅▃▃▂▁ 매출↓ │  │ ▃▂▁▁_ 위기  │          │
│  │              │  │              │  │              │          │
│  │ KPI: 5/12    │  │ KPI: 3/12    │  │ runway: 2개월 │          │
│  │ 멘토링: 4회   │  │ 멘토링: 2회   │  │ ⚠ 현금위기   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**PortfolioCard 컴포넌트**:
- 등급 배지 (A=초록, B=파랑, C=노랑, D=빨강)
- KPI 스파크라인 (최근 6개월 — recharts Sparkline)
- 위기 플래그 표시 (crisis_flags에 true 있으면 ⚠ 아이콘)
- 클릭 → `/incubation/{id}` 이동

**필터**:
- 등급: A/B/C/D (다중 선택)
- 상태: onboarding/active/graduated/paused
- 검색: 기업명

### 4.2 온보딩 폼 (`/incubation/onboarding/new`) — PRG-F01

```
┌───────────────────────────────────────────┐
│  온보딩 시트 — {기업명}                      │
│                                           │
│  기업명: QuantumAI (자동)                   │
│  대표자: 김대표 (자동)                       │
│  투자일: 2026-03-01 (자동)                  │
│  담당PM: [드롭다운 — 보육팀 사용자]           │
│  프로그램 시작일: [날짜선택]                  │
│  프로그램 종료일: [날짜선택]                  │
│                                           │
│  ── 성장 진단 (7개 항목, 1-5점) ──          │
│  고객    ●●●○○  3/5                        │
│  제품    ●●●●○  4/5                        │
│  기술    ●●●●●  5/5                        │
│  조직    ●●○○○  2/5                        │
│  영업    ●●●○○  3/5                        │
│  재무    ●●○○○  2/5                        │
│  투자준비 ●●●○○  3/5                        │
│                                           │
│  현재 가장 큰 병목: [텍스트 입력] *           │
│  요청 지원: [텍스트 입력]                    │
│  초기 우선 KPI 3개: [태그 입력]              │
│                                           │
│  [저장]  [취소]                             │
└───────────────────────────────────────────┘
```

### 4.3 90일 액션플랜 (`/incubation/[id]/action-plan`) — PRG-F02

```
┌───────────────────────────────────────────────────────────────┐
│  90일 액션플랜 — QuantumAI                       [저장] [편집]  │
│                                                               │
│  ┌──────┬──────────┬──────────┬──────────┬──────┬──────┐     │
│  │ 영역 │ 현재 상태 │ 목표 상태 │ 실행 과제 │ 책임자│ 기한  │     │
│  ├──────┼──────────┼──────────┼──────────┼──────┼──────┤     │
│  │ 제품 │ MVP 완성  │ v2 출시  │ UI 개선  │ CTO  │04-15 │     │
│  │ 고객 │ 5명 파일럿│ 20명 확보│ 세미나3회 │ CEO  │04-30 │     │
│  │ 매출 │ 0원      │ 2000만원 │ B2B 3건  │ 영업  │05-15 │     │
│  │ 투자 │ 시드 완료 │ Pre-A IR│ IR deck │ CEO  │05-30 │     │
│  │ 조직 │ 3명      │ 5명     │ 채용 2명 │ HR   │04-20 │     │
│  └──────┴──────────┴──────────┴──────────┴──────┴──────┘     │
│  [+ 행 추가]                                                  │
│                                                               │
│  ── 간트 차트 (타임라인) ──                                     │
│  제품 ████████░░░░░░░░                                        │
│  고객 ░░░████████░░░░░                                        │
│  매출 ░░░░░░████████░░                                        │
│  투자 ░░░░░░░░░████████                                       │
│  조직 ░░████████░░░░░░                                        │
│       3월      4월      5월      6월                           │
└───────────────────────────────────────────────────────────────┘
```

### 4.4 멘토링 관리 (`/incubation/[id]/mentoring`) — PRG-F03

```
┌───────────────────────────────────────────────────────────────┐
│  멘토링 관리 — QuantumAI                         [+ 세션 추가]  │
│                                                               │
│  ── 이행률 요약 ──                                             │
│  전체 이행률: 68%  ████████████████░░░░░░░░                    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 2026-03-15 | 기술 멘토링 | 멘토: 이기술 (전담)        │     │
│  │ 주제: 반도체 양산 전략                                │     │
│  │ 액션아이템: 3개 (✅2 / 🔄1 / ⏳0)    이행률: 67%      │     │
│  │ [상세보기]                                           │     │
│  └──────────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 2026-03-10 | 사업 멘토링 | 멘토: 박사업 (기능별)      │     │
│  │ 주제: B2B 영업 전략                                  │     │
│  │ 액션아이템: 2개 (✅1 / 🔄1 / ⏳0)    이행률: 50%      │     │
│  │ [상세보기]                                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ── 세션 기록 폼 (펼쳐짐) ──                                    │
│  멘토명: [텍스트/드롭다운]  유형: [5종 선택]                      │
│  일시: [날짜시간]                                              │
│  사전 아젠다: [텍스트]                                         │
│  주요 논의: [텍스트] *                                         │
│  피드백: [텍스트]                                              │
│  액션아이템:                                                   │
│    [과제]   [담당자]   [기한]    [+ 추가]                       │
│  다음 일정: [날짜]                                             │
│  [저장]                                                       │
└───────────────────────────────────────────────────────────────┘
```

### 4.5 KPI 트래커 (`/incubation/[id]/kpi`) — PRG-F04

```
┌───────────────────────────────────────────────────────────────┐
│  KPI 트래커 — QuantumAI                    [입력: 2026-03 ▼]   │
│                                                               │
│  ── 트렌드 차트 ──                                             │
│  (recharts LineChart — 매출, 고객수, runway 6개월 추이)          │
│  █                                                            │
│  █   매출  ─── 고객수 --- runway ···                            │
│  █  /                                                         │
│  █ /    ___---                                                │
│  █/___--                                                      │
│  └──────────────────────────────                              │
│   10월  11월  12월  1월  2월  3월                               │
│                                                               │
│  ⚠ 경고: 매출이 3개월 연속 하락했습니다                           │
│                                                               │
│  ── 월간 입력 (2026-03) ──                                     │
│  ┌──────────────┬──────┬──────┬──────┬───────┬──────┐        │
│  │ KPI          │ 전월 │ 당월 │ 목표 │ 증감  │ 해석 │        │
│  ├──────────────┼──────┼──────┼──────┼───────┼──────┤        │
│  │ 매출(만원)*   │ 1500 │[    ]│ 2000 │       │[   ] │        │
│  │ 고객수*       │  15  │[    ]│  20  │       │[   ] │        │
│  │ PoC 건수*    │   3  │[    ]│   5  │       │[   ] │        │
│  │ 투자미팅*     │   2  │[    ]│   3  │       │[   ] │        │
│  │ runway(월)*  │  8.5 │[    ]│  12  │       │[   ] │        │
│  │ 활성사용자    │  200 │[    ]│  500 │       │[   ] │        │
│  │ ...          │  ... │[    ]│  ... │       │[   ] │        │
│  └──────────────┴──────┴──────┴──────┴───────┴──────┘        │
│  * 필수 입력                                                   │
│  증감 = 자동 계산 (당월 - 전월, ▲▼ 표시)                        │
│                                                               │
│  [저장]  [취소]                                                │
└───────────────────────────────────────────────────────────────┘
```

### 4.6 DemoDay 관리 (`/incubation/demo-days`)

```
┌───────────────────────────────────────────────────────────────┐
│  Demo Day 관리                                    [+ 생성]     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 2026-H1 Demo Day | 2026-06-15 | 상태: 리허설 진행 중    │     │
│  │ 참여 기업: 8개  |  IR Ready: 5/8  |  투자자: 15명 초청  │     │
│  │ 후속추적 마감: 2026-08-10                               │     │
│  │                                                       │     │
│  │ IR 준비 현황:                                          │     │
│  │ QuantumAI ████████████████████ 100% ✅                 │     │
│  │ 바이오텍X  ████████████░░░░░░░  62% 🔄                 │     │
│  │ 로보틱    ████░░░░░░░░░░░░░░░  25% ⏳                 │     │
│  │ [상세보기]                                             │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### 4.7 투자자 미팅 (`/incubation/[id]/investor-meetings`)

| 투자자 | 소속 | 유형 | 미팅일 | 유형 | 결과 | 다음 단계 |
|--------|------|------|--------|------|------|-----------|
| 김투자 | ABC VC | Seed VC | 2026-03-20 | IR 미팅 | 관심 | 추가자료 요청 |
| 이앤젤 | - | Angel | 2026-03-25 | 후속미팅 | 투자의향서 | Term Sheet |

---

## 5. 구현 순서 (11 Steps)

```
Step 1:  models/ — incubation, mentoring_session, kpi_record, demo_day, investor_meeting
Step 2:  Alembic — 5개 테이블 생성 + UniqueConstraint
Step 3:  schemas/ — 5개 모델 × Create/Update/Response + List
Step 4:  services/ — incubation_service (자동화 #4 포함)
Step 5:  services/ — mentoring_service (자동화 #6) + kpi_service (자동화 #7)
Step 6:  services/ — demo_day_service + investor_meeting_service + mentor_service
Step 7:  routers/ — 6개 라우터 + main.py 등록 + errors.py
Step 8:  Backend API 통합 테스트 (21개 엔드포인트)
Step 9:  Frontend — 포트폴리오 대시보드 + 온보딩(PRG-F01) + 액션플랜(PRG-F02)
Step 10: Frontend — 멘토링(PRG-F03) + KPI 트래커(PRG-F04) + recharts
Step 11: Frontend — DemoDay + 투자자미팅 + 멘토풀 + 사이드바 메뉴 + 통합 테스트
```

---

## 6. RBAC 매핑

| 엔드포인트 | 리소스 | 레벨 | incubation | review | sourcing | partner/admin |
|-----------|--------|------|:----------:|:------:|:--------:|:------------:|
| GET incubations | incubation | read | ✅ | ✅ | ❌ | ✅ |
| POST incubations | incubation | full | ✅ | ❌ | ❌ | ✅ |
| PATCH grade | incubation | full | ✅ (PM) | ❌ | ❌ | ✅ |
| GET mentoring | mentoring | read | ✅ | ✅ | ❌ | ✅ |
| POST mentoring | mentoring | full | ✅ | ❌ | ❌ | ✅ |
| PATCH action-items | mentoring | full | ✅ | ❌ | ❌ | ✅ |
| GET kpi | kpi | read | ✅ | ✅ | ❌ | ✅ |
| POST kpi | kpi | full | ✅ | ❌ | ❌ | ✅ |
| GET demo-days | incubation | read | ✅ | ✅ | ❌ | ✅ |
| POST demo-days | incubation | full | ✅ | ❌ | ❌ | ✅ |
| GET investor-meetings | incubation | read | ✅ | ✅ | ❌ | ✅ |
| POST investor-meetings | incubation | full | ✅ | ❌ | ❌ | ✅ |
| GET/POST mentors | incubation | full | ✅ | ❌ | ❌ | ✅ |

**RBAC PERMISSIONS 추가** (`middleware/rbac.py`):
```python
PERMISSIONS = {
    # 기존...
    "incubation": {
        "incubation": "full",
        "review": "read",
        "sourcing": "read",  # 딜 이력 참조 가능
        "oi": "read",
        "backoffice": "read",
    },
    "mentoring": {
        "incubation": "full",
        "review": "read",
        "backoffice": "read",
    },
    "kpi": {
        "incubation": "full",
        "review": "read",
        "backoffice": "read",
    },
}
```

---

## 7. 에러 코드 추가

```python
# errors.py에 추가

def incubation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 포트폴리오 기업을 찾을 수 없습니다.",
    )

def mentoring_session_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 멘토링 세션을 찾을 수 없습니다.",
    )

def kpi_record_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 KPI 기록을 찾을 수 없습니다.",
    )

def kpi_period_duplicate() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="해당 기간의 KPI 기록이 이미 존재합니다.",
    )

def demo_day_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 데모데이를 찾을 수 없습니다.",
    )

def investor_meeting_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 투자자 미팅 기록을 찾을 수 없습니다.",
    )

def mentor_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 멘토를 찾을 수 없습니다.",
    )

def grade_change_not_authorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="포트폴리오 등급 변경은 PM 또는 Partner만 가능합니다.",
    )
```

---

## 8. Frontend 타입 추가 (`lib/types.ts`)

```typescript
// 포트폴리오 등급
export type PortfolioGrade = "A" | "B" | "C" | "D";

// 보육 상태
export type IncubationStatus = "onboarding" | "active" | "graduated" | "paused";

// 멘토 유형
export type MentorType = "dedicated" | "functional" | "industry" | "investment" | "customer_dev";

// 투자자 유형
export type InvestorType = "angel" | "seed_vc" | "pre_a_vc" | "cvc" | "strategic" | "overseas";

// 미팅 유형
export type MeetingType = "onsite_consult" | "follow_up" | "ir_meeting" | "termsheet";

// 미팅 결과
export type MeetingOutcome = "interested" | "passed" | "termsheet" | "invested";

// 액션아이템 상태
export type ActionItemStatus = "pending" | "in_progress" | "completed";

// 데모데이 상태
export type DemoDayStatus = "planning" | "rehearsal" | "completed" | "follow_up";

// 위기 플래그
export interface CrisisFlags {
  cash_critical: boolean;
  key_person_left: boolean;
  customer_churn: boolean;
  dev_delay: boolean;
  lawsuit: boolean;
}

// IR 체크리스트
export interface IRReadiness {
  pitch_1min: boolean;
  pitch_5min: boolean;
  ir_deck: boolean;
  data_room: boolean;
  faq: boolean;
  valuation_logic: boolean;
  use_of_funds: boolean;
  milestone_plan: boolean;
}

// 진단 7개 항목
export interface Diagnosis {
  customer: number;     // 1-5
  product: number;
  tech: number;
  org: number;
  sales: number;
  finance: number;
  investment_readiness: number;
}

// Incubation
export interface IncubationItem {
  id: string;
  startup_id: string;
  batch_id: string | null;
  assigned_pm_id: string;
  program_start: string;
  program_end: string;
  diagnosis: Diagnosis | null;
  action_plan: ActionPlanData | null;
  growth_bottleneck: string | null;
  portfolio_grade: PortfolioGrade;
  status: IncubationStatus;
  crisis_flags: CrisisFlags | null;
  ir_readiness: IRReadiness | null;
  created_at: string;
  updated_at: string;
}

// 액션플랜
export interface ActionPlanItem {
  area: "product" | "customer" | "revenue" | "investment" | "org";
  current_state: string;
  target_state: string;
  tasks: string;
  owner: string;
  deadline: string;
}

export interface ActionPlanData {
  items: ActionPlanItem[];
}

// 멘토링 세션
export interface MentoringSessionItem {
  id: string;
  startup_id: string;
  mentor_id: string | null;
  mentor_name: string;
  mentor_type: MentorType;
  session_date: string;
  pre_agenda: string | null;
  discussion_summary: string;
  feedback: string | null;
  action_items: ActionItemData[];
  next_session_date: string | null;
  action_completion_rate: number | null;
  created_at: string;
}

export interface ActionItemData {
  task: string;
  owner: string;
  deadline: string;
  status: ActionItemStatus;
}

// KPI 기록
export interface KPIRecordItem {
  id: string;
  startup_id: string;
  period: string;
  revenue: number | null;
  customer_count: number | null;
  active_users: number | null;
  poc_count: number | null;
  repurchase_rate: number | null;
  release_velocity: string | null;
  cac: number | null;
  ltv: number | null;
  pilot_conversion_rate: number | null;
  mou_to_contract_rate: number | null;
  headcount: number | null;
  runway_months: number | null;
  follow_on_meetings: number | null;
  notes: string | null;
  created_at: string;
}

// KPI 트렌드
export interface KPITrendData {
  startup_id: string;
  periods: string[];
  revenue: (number | null)[];
  customer_count: (number | null)[];
  runway_months: (number | null)[];
  warnings: KPIWarning[];
}

export interface KPIWarning {
  metric: string;
  message: string;
  severity: "warning" | "critical";
}

// 데모데이
export interface DemoDayItem {
  id: string;
  title: string;
  event_date: string;
  batch_id: string | null;
  status: DemoDayStatus;
  follow_up_deadline: string | null;
  invited_investors: InvitedInvestor[] | null;
  startup_readiness: Record<string, StartupReadiness> | null;
  created_at: string;
}

export interface InvitedInvestor {
  name: string;
  company: string;
  priority: "A" | "B" | "C";
  matched_startups: string[];
}

export interface StartupReadiness {
  ir_ready: boolean;
  rehearsal_done: boolean;
}

// 투자자 미팅
export interface InvestorMeetingItem {
  id: string;
  startup_id: string;
  demo_day_id: string | null;
  investor_name: string;
  investor_company: string;
  investor_type: InvestorType;
  meeting_date: string;
  meeting_type: MeetingType;
  outcome: MeetingOutcome | null;
  materials_sent: string[] | null;
  next_step: string | null;
  notes: string | null;
  created_at: string;
}

// 멘토
export interface MentorItem {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  mentor_type: MentorType;
  expertise_areas: string[];
  industry_tags: string[] | null;
  functional_area: string | null;
  is_active: boolean;
  engagement_count: number;
  avg_satisfaction: number | null;
}
```

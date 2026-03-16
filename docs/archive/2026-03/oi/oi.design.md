# Design: 오픈이노베이션팀 모듈 (Phase 6)

> **Feature**: oi
> **Plan Reference**: `docs/01-plan/features/oi.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 PartnerDemand 모델 (`models/partner_demand.py`)

OI-F01 파트너 수요정리표. 수요기업 현업부서 매핑.

```python
class PartnerDemand(Base):
    __tablename__ = "partner_demands"

    id: Mapped[uuid.UUID]
    partner_company: Mapped[str]              # 수요기업명 (String 200)
    contact_name: Mapped[str | None]          # 담당자 (String 100)
    department: Mapped[str | None]            # 현업부서 (String 100)
    demand_type: Mapped[str]                  # String 50
    # demand_type: tech_adoption / joint_dev / vendor / new_biz / strategic_invest
    description: Mapped[str]                  # Text — 해결하려는 문제
    tech_requirements: Mapped[str | None]     # Text — 원하는 솔루션
    timeline: Mapped[str | None]              # String 100
    budget_range: Mapped[str | None]          # String 50 — 있음/미정/없음
    nda_required: Mapped[bool]                # default False
    candidate_startups: Mapped[list | None]   # JSON — [{startup_id, fit_reason}]
    status: Mapped[str]                       # String 50 default "open"
    # status: open / matched / in_poc / contracted / closed

    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.2 PoCProject 모델 (`models/poc_project.py`)

OI-F02 PoC 제안서 + OI-F03 진행관리. PoCStatus Enum 사용.

```python
class PoCProject(Base):
    __tablename__ = "poc_projects"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]             # FK → startups.id
    partner_demand_id: Mapped[uuid.UUID]      # FK → partner_demands.id
    project_name: Mapped[str]                 # String 200

    # OI-F02 PoC 제안서 7개 필수항목
    objective: Mapped[str]                    # Text — 목표
    scope: Mapped[str]                        # Text — 범위
    duration_weeks: Mapped[int]               # Integer — 기간(주)
    validation_metrics: Mapped[list]          # JSON — 검증지표
    cost_structure: Mapped[str | None]        # Text — 비용부담 구조
    data_scope: Mapped[str | None]            # Text — 데이터 제공 범위
    success_criteria: Mapped[str]             # Text — 성공 기준
    next_step_if_success: Mapped[str | None]  # Text — 성공 시 다음 단계

    # OI-F02 추가 필드
    participants: Mapped[dict | None]         # JSON — 참여기관
    role_division: Mapped[str | None]         # Text — 역할 분담
    provided_resources: Mapped[str | None]    # Text — 제공 자원
    key_risks: Mapped[list | None]            # JSON — 리스크 및 대응

    # OI-F03 진행관리
    status: Mapped[PoCStatus]                 # Enum default DEMAND_IDENTIFIED
    kickoff_date: Mapped[date | None]
    completion_date: Mapped[date | None]
    weekly_issues: Mapped[str | None]         # Text
    support_needed: Mapped[str | None]        # Text
    partner_feedback: Mapped[str | None]      # Text
    startup_feedback: Mapped[str | None]      # Text
    conversion_likelihood: Mapped[str | None] # String 20 — 높음/중간/낮음
    result_summary: Mapped[str | None]        # Text

    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.3 FollowOnInvestment 모델 (`models/follow_on_investment.py`)

후속투자 관리. 투자자맵 + 라운드 추적.

```python
class FollowOnInvestment(Base):
    __tablename__ = "follow_on_investments"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]             # FK → startups.id
    round_type: Mapped[str]                   # String 50 — bridge/pre_a/series_a/strategic
    target_amount: Mapped[int | None]         # Integer — 목표 투자금 (원)
    investor_map: Mapped[dict | None]         # JSON — 투자자 분류별 매핑
    matching_criteria: Mapped[dict | None]    # JSON — 매칭 기준 6개
    lead_investor: Mapped[str | None]         # String 200
    co_investors: Mapped[list | None]         # JSON — 공동투자자 리스트
    status: Mapped[str]                       # String 50
    # status: planning / ir_active / termsheet / closing / completed
    ir_meetings_count: Mapped[int]            # Integer default 0
    closed_at: Mapped[date | None]

    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.4 ExitRecord 모델 (`models/exit_record.py`)

회수 기록. ExitType Enum + 7개 체크리스트.

```python
class ExitRecord(Base):
    __tablename__ = "exit_records"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]             # FK → startups.id
    exit_type: Mapped[ExitType]               # Enum
    exit_amount: Mapped[int | None]           # Integer (원)
    multiple: Mapped[Decimal | None]          # Numeric(12,4) — 수익배수

    # 회수 준비 체크리스트 7개항
    cap_table_clean: Mapped[bool]             # default False
    preferred_terms_reviewed: Mapped[bool]
    drag_tag_reviewed: Mapped[bool]
    ip_ownership_clean: Mapped[bool]
    accounting_transparent: Mapped[bool]
    customer_contracts_stable: Mapped[bool]
    management_issue_clear: Mapped[bool]

    exit_date: Mapped[date | None]
    notes: Mapped[str | None]                 # Text

    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.5 GovernmentProgram 모델 (`models/government_program.py`)

정부/공공사업 연계 추적.

```python
class GovernmentProgram(Base):
    __tablename__ = "government_programs"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]             # FK → startups.id
    program_type: Mapped[str]                 # String 50
    # program_type: tips / pre_tips / rnd / sandbox / pilot_support / overseas_voucher
    program_name: Mapped[str]                 # String 200
    managing_agency: Mapped[str]              # String 200 — 주관기관
    applied_at: Mapped[date | None]
    status: Mapped[str]                       # String 50
    # status: planned / applied / selected / in_progress / completed / rejected
    amount: Mapped[int | None]                # Integer — 지원 금액
    period_start: Mapped[date | None]
    period_end: Mapped[date | None]
    our_role: Mapped[str | None]              # String 100 — 추천인/공동수행/운영사
    notes: Mapped[str | None]                 # Text

    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.6 마이그레이션 순서

```
partner_demands (FK 없음)
  ↓
poc_projects (FK: startup_id → startups, partner_demand_id → partner_demands)
  ↓
follow_on_investments (FK: startup_id → startups)
  ↓
exit_records (FK: startup_id → startups)
  ↓
government_programs (FK: startup_id → startups)
```

---

## 2. API 설계

### 2.1 PartnerDemand API (`routers/partner_demands.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/partner-demands/` | `?demand_type=&status=&search=` | `PartnerDemandListResponse` |
| GET | `/api/v1/partner-demands/{id}` | - | `PartnerDemandResponse` |
| POST | `/api/v1/partner-demands/` | `PartnerDemandCreate` | `PartnerDemandResponse` |
| PUT | `/api/v1/partner-demands/{id}` | `PartnerDemandUpdate` | `PartnerDemandResponse` |
| DELETE | `/api/v1/partner-demands/{id}` | - | 204 |

**PartnerDemandCreate** (OI-F01):
```python
class PartnerDemandCreate(BaseModel):
    partner_company: str
    contact_name: str | None = None
    department: str | None = None
    demand_type: str           # tech_adoption/joint_dev/vendor/new_biz/strategic_invest
    description: str
    tech_requirements: str | None = None
    timeline: str | None = None
    budget_range: str | None = None   # 있음/미정/없음
    nda_required: bool = False
    candidate_startups: list[dict] | None = None  # [{startup_id, fit_reason}]
```

### 2.2 PoCProject API (`routers/poc_projects.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/poc-projects/` | `?status=&startup_id=&partner_demand_id=` | `PoCProjectListResponse` |
| GET | `/api/v1/poc-projects/{id}` | - | `PoCProjectResponse` |
| POST | `/api/v1/poc-projects/` | `PoCProjectCreate` | `PoCProjectResponse` |
| PUT | `/api/v1/poc-projects/{id}` | `PoCProjectUpdate` | `PoCProjectResponse` |
| PATCH | `/api/v1/poc-projects/{id}/status` | `PoCStatusChange` | `PoCProjectResponse` |
| PATCH | `/api/v1/poc-projects/{id}/progress` | `PoCProgressUpdate` | `PoCProjectResponse` |

**PoCProjectCreate** (OI-F02):
```python
class PoCProjectCreate(BaseModel):
    startup_id: uuid.UUID
    partner_demand_id: uuid.UUID
    project_name: str
    objective: str
    scope: str
    duration_weeks: int
    validation_metrics: list[str]
    success_criteria: str
    cost_structure: str | None = None
    data_scope: str | None = None
    next_step_if_success: str | None = None
    participants: dict | None = None
    role_division: str | None = None
    provided_resources: str | None = None
    key_risks: list[str] | None = None
```

**PoCStatusChange**:
```python
class PoCStatusChange(BaseModel):
    status: str               # PoCStatus 값
    notes: str | None = None
```

**PoCProgressUpdate** (OI-F03):
```python
class PoCProgressUpdate(BaseModel):
    weekly_issues: str | None = None
    support_needed: str | None = None
    partner_feedback: str | None = None
    startup_feedback: str | None = None
    conversion_likelihood: str | None = None   # 높음/중간/낮음
    result_summary: str | None = None
```

**자동화 #8 비즈니스 로직**: `poc_service.update_progress()`
1. PoCProject 필드 업데이트
2. `conversion_likelihood == "높음"` 이면:
   - 심사팀에 HANDOVER_REQUEST 알림
   - 메시지: "PoC 전환가능성 높음: {project_name} — 전략투자 검토 요청"
3. ActivityLog 기록

### 2.3 FollowOnInvestment API (`routers/follow_on_investments.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/follow-on-investments/` | `?startup_id=&status=` | `FollowOnListResponse` |
| GET | `/api/v1/follow-on-investments/{id}` | - | `FollowOnResponse` |
| POST | `/api/v1/follow-on-investments/` | `FollowOnCreate` | `FollowOnResponse` |
| PUT | `/api/v1/follow-on-investments/{id}` | `FollowOnUpdate` | `FollowOnResponse` |

**FollowOnCreate**:
```python
class FollowOnCreate(BaseModel):
    startup_id: uuid.UUID
    round_type: str          # bridge/pre_a/series_a/strategic
    target_amount: int | None = None
    investor_map: dict | None = None
    lead_investor: str | None = None
    co_investors: list[str] | None = None
```

### 2.4 ExitRecord API (`routers/exit_records.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/exit-records/` | `?startup_id=&exit_type=` | `ExitRecordListResponse` |
| GET | `/api/v1/exit-records/{id}` | - | `ExitRecordResponse` |
| POST | `/api/v1/exit-records/` | `ExitRecordCreate` | `ExitRecordResponse` |
| PUT | `/api/v1/exit-records/{id}` | `ExitRecordUpdate` | `ExitRecordResponse` |

**ExitRecordCreate**:
```python
class ExitRecordCreate(BaseModel):
    startup_id: uuid.UUID
    exit_type: str           # ExitType 값
    exit_amount: int | None = None
    multiple: float | None = None
    cap_table_clean: bool = False
    preferred_terms_reviewed: bool = False
    drag_tag_reviewed: bool = False
    ip_ownership_clean: bool = False
    accounting_transparent: bool = False
    customer_contracts_stable: bool = False
    management_issue_clear: bool = False
    exit_date: date | None = None
    notes: str | None = None
```

### 2.5 GovernmentProgram API (`routers/government_programs.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/government-programs/` | `?startup_id=&program_type=&status=` | `GovProgramListResponse` |
| GET | `/api/v1/government-programs/{id}` | - | `GovProgramResponse` |
| POST | `/api/v1/government-programs/` | `GovProgramCreate` | `GovProgramResponse` |
| PUT | `/api/v1/government-programs/{id}` | `GovProgramUpdate` | `GovProgramResponse` |
| DELETE | `/api/v1/government-programs/{id}` | - | 204 |

**GovProgramCreate**:
```python
class GovProgramCreate(BaseModel):
    startup_id: uuid.UUID
    program_type: str        # tips/pre_tips/rnd/sandbox/pilot_support/overseas_voucher
    program_name: str
    managing_agency: str
    applied_at: date | None = None
    amount: int | None = None
    period_start: date | None = None
    period_end: date | None = None
    our_role: str | None = None
    notes: str | None = None
```

---

## 3. 서비스 설계

### 3.1 partner_demand_service.py

```python
async def get_list(db, page, page_size, demand_type, status, search) -> tuple[list, int]
async def get_by_id(db, demand_id) -> PartnerDemand | None
async def create(db, data, user) -> PartnerDemand
async def update(db, demand, data, user) -> PartnerDemand
async def delete(db, demand, user) -> None   # soft delete
```

### 3.2 poc_service.py

```python
async def get_list(db, page, page_size, status, startup_id, partner_demand_id) -> tuple[list, int]
async def get_by_id(db, poc_id) -> PoCProject | None
async def create(db, data, user) -> PoCProject
    # 1. PoCProject 생성 (status=DEMAND_IDENTIFIED)
    # 2. PartnerDemand.status → "in_poc" 업데이트
    # 3. ActivityLog

async def update(db, poc, data, user) -> PoCProject
async def change_status(db, poc, new_status, notes, user) -> PoCProject
    # 1. 상태 변경
    # 2. ActivityLog

async def update_progress(db, poc, data, user) -> PoCProject
    # 1. 진행 필드 업데이트
    # 2. 자동화 #8: conversion_likelihood == "높음" → 심사팀 역인계
    # 3. ActivityLog
```

### 3.3 follow_on_service.py

```python
async def get_list(db, page, page_size, startup_id, status) -> tuple[list, int]
async def get_by_id(db, follow_on_id) -> FollowOnInvestment | None
async def create(db, data, user) -> FollowOnInvestment
async def update(db, follow_on, data, user) -> FollowOnInvestment
```

### 3.4 exit_service.py

```python
async def get_list(db, page, page_size, startup_id, exit_type) -> tuple[list, int]
async def get_by_id(db, exit_id) -> ExitRecord | None
async def create(db, data, user) -> ExitRecord
async def update(db, record, data, user) -> ExitRecord
```

### 3.5 government_program_service.py

```python
async def get_list(db, page, page_size, startup_id, program_type, status) -> tuple[list, int]
async def get_by_id(db, program_id) -> GovernmentProgram | None
async def create(db, data, user) -> GovernmentProgram
async def update(db, program, data, user) -> GovernmentProgram
async def delete(db, program, user) -> None   # soft delete
```

---

## 4. Frontend 컴포넌트 설계

### 4.1 파트너 수요맵 (`/oi/partners`)

```
┌───────────────────────────────────────────────────────────────┐
│  파트너 수요맵                                    [+ 수요 등록]  │
│                                                               │
│  ┌─ 기술도입: 5 ─ 공동개발: 3 ─ 벤더발굴: 2 ─ 전략투자: 1 ──┐   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 삼성전자 반도체사업부 | 기술도입 | 상태: 매칭 중         │     │
│  │ 문제: AI 기반 반도체 검사 자동화 솔루션 도입             │     │
│  │ 후보: QuantumAI (적합), 바이오텍X (검토)               │     │
│  └──────────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ LG에너지솔루션 생산기술팀 | 공동개발 | 상태: PoC 진행   │     │
│  │ 문제: 배터리 불량 탐지 비전 시스템                      │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 PoC 프로젝트 목록 (`/oi/poc`)

```
┌───────────────────────────────────────────────────────────────┐
│  PoC 프로젝트                                   [+ PoC 생성]   │
│                                                               │
│  필터: [전체 ▼] [수요발굴] [매칭] [진행중] [완료] [전환]         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ AI 검사 자동화 PoC | QuantumAI × 삼성전자             │     │
│  │ 상태: 진행중   기간: 8주   전환가능성: 높음 🔴          │     │
│  │ 시작: 2026-02-01   종료예정: 2026-03-28               │     │
│  │ [상세보기]                                           │     │
│  └──────────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 배터리 비전 PoC | 로보틱 × LG에너지                    │     │
│  │ 상태: 설계   기간: 12주   전환가능성: -                 │     │
│  │ [상세보기]                                           │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### 4.3 PoC 상세/관리 (`/oi/poc/[id]`) — OI-F03

```
┌───────────────────────────────────────────────────────────────┐
│  ← AI 검사 자동화 PoC                       상태: [진행중 ▼]   │
│  QuantumAI × 삼성전자 반도체사업부                              │
│                                                               │
│  ── 프로젝트 개요 ──                                           │
│  목표: AI 기반 비전 검사 정확도 99% 달성                         │
│  범위: 양산라인 3개 공정                                        │
│  기간: 8주 (2026-02-01 ~ 2026-03-28)                          │
│  성공기준: 불량 탐지율 99%, 오탐율 1% 이하                      │
│                                                               │
│  ── 진행관리 (OI-F03) ──                                       │
│  주간 이슈: [텍스트]                                           │
│  필요 지원: [텍스트]                                           │
│  파트너 피드백: [텍스트]                                        │
│  스타트업 피드백: [텍스트]                                      │
│  전환가능성: [높음 ▼] ← "높음" 시 심사팀 자동 알림              │
│  결과 요약: [텍스트]                                           │
│                                                               │
│  [저장]                                                       │
└───────────────────────────────────────────────────────────────┘
```

### 4.4 정부사업 (`/oi/government`)

| 기업명 | 사업유형 | 사업명 | 주관기관 | 상태 | 금액 | 기간 |
|--------|----------|--------|----------|------|------|------|
| QuantumAI | TIPS | 딥러닝 검사 | 중기부 | 선정 | 5억 | 2026.01~2027.12 |
| 바이오텍X | R&D | 신약탐색 AI | IITP | 지원중 | 3억 | - |

### 4.5 후속투자 (`/oi/follow-on`)

| 기업명 | 라운드 | 목표금액 | 리드투자자 | 미팅 수 | 상태 |
|--------|--------|----------|------------|:-------:|------|
| QuantumAI | Pre-A | 30억 | ABC VC | 5 | IR 진행 |
| 로보틱 | Series A | 100억 | - | 2 | 기획 |

### 4.6 회수관리 (`/oi/exits`)

| 기업명 | 회수방식 | 금액 | 배수 | 체크리스트 | 회수일 |
|--------|----------|------|------|:---------:|--------|
| 옛포트폴리오 | M&A | 50억 | 3.2x | 7/7 ✅ | 2026-01 |

---

## 5. 구현 순서 (9 Steps)

```
Step 1:  models/ — partner_demand, poc_project, follow_on_investment, exit_record, government_program
Step 2:  Alembic — 5개 테이블 생성
Step 3:  schemas/ — 5개 모델 × Create/Update/Response + 특수 스키마
Step 4:  services/ — partner_demand_service + poc_service (자동화 #8 포함)
Step 5:  services/ — follow_on_service + exit_service + government_program_service
Step 6:  routers/ — 5개 라우터 + main.py 등록 + errors.py
Step 7:  Frontend — 파트너 수요맵 + PoC 목록/생성/상세 (OI-F01~F03)
Step 8:  Frontend — 정부사업 + 후속투자 + 회수관리
Step 9:  Frontend types.ts + 통합 테스트
```

---

## 6. RBAC 매핑

| 엔드포인트 | 리소스 | 레벨 | oi | incubation | review | partner/admin |
|-----------|--------|------|:--:|:----------:|:------:|:------------:|
| GET partner-demands | poc_matching | read | ✅ | ✅ | ❌ | ✅ |
| POST partner-demands | poc_matching | full | ✅ | ❌ | ❌ | ✅ |
| GET poc-projects | poc_matching | read | ✅ | ✅ | ❌ | ✅ |
| POST poc-projects | poc_matching | full | ✅ | ❌ | ❌ | ✅ |
| PATCH poc status/progress | poc_matching | full | ✅ | ❌ | ❌ | ✅ |
| GET follow-on | poc_matching | read | ✅ | ✅ | ✅ | ✅ |
| POST follow-on | poc_matching | full | ✅ | ❌ | ❌ | ✅ |
| GET exit-records | poc_matching | read | ✅ | ❌ | ✅ | ✅ |
| POST exit-records | poc_matching | full | ✅ | ❌ | ❌ | ✅ |
| GET government-programs | poc_matching | read | ✅ | ✅ | ❌ | ✅ |
| POST government-programs | poc_matching | full | ✅ | ❌ | ❌ | ✅ |

---

## 7. 에러 코드 추가

```python
def partner_demand_not_found() -> HTTPException: ...
def poc_project_not_found() -> HTTPException: ...
def follow_on_not_found() -> HTTPException: ...
def exit_record_not_found() -> HTTPException: ...
def government_program_not_found() -> HTTPException: ...
```

---

## 8. Frontend 타입 추가 (`lib/types.ts`)

```typescript
// PoC 상태 (PoCStatus Enum 미러)
export type PoCStatusType =
  | "demand_identified" | "matching" | "planning" | "kickoff"
  | "in_progress" | "mid_review" | "completed"
  | "commercial_contract" | "joint_development"
  | "strategic_investment" | "retry" | "terminated";

// 회수 방식 (ExitType Enum 미러)
export type ExitTypeValue =
  | "secondary_sale" | "ma" | "strategic_sale" | "ipo"
  | "secondary_market" | "tech_transfer" | "jv" | "writeoff";

// 수요 유형
export type DemandType =
  | "tech_adoption" | "joint_dev" | "vendor" | "new_biz" | "strategic_invest";

// 정부사업 유형
export type GovProgramType =
  | "tips" | "pre_tips" | "rnd" | "sandbox" | "pilot_support" | "overseas_voucher";

export interface PartnerDemandItem { ... }
export interface PoCProjectItem { ... }
export interface FollowOnItem { ... }
export interface ExitRecordItem { ... }
export interface GovProgramItem { ... }
```

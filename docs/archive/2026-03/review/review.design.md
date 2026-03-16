# Design: 심사팀 모듈 (Phase 3)

> **Feature**: review
> **Plan Reference**: `docs/01-plan/features/review.plan.md`
> **Created**: 2026-03-16
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 Review 모델 (`models/review.py`)

```python
class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]        # FK → startups
    reviewer_id: Mapped[uuid.UUID]       # FK → users
    review_type: Mapped[str]             # "document" / "interview" / "dd"

    # 서류심사 5축 (각 1-5, nullable — review_type별 사용)
    team_score: Mapped[int | None]
    problem_score: Mapped[int | None]
    solution_score: Mapped[int | None]
    market_score: Mapped[int | None]
    traction_score: Mapped[int | None]

    # 인터뷰 8축 (각 1-5)
    number_literacy: Mapped[int | None]
    customer_experience: Mapped[int | None]
    tech_moat: Mapped[int | None]
    execution_plan: Mapped[int | None]
    feedback_absorption: Mapped[int | None]
    cofounder_stability: Mapped[int | None]

    # DD 체크리스트 (JSON — 10항목)
    dd_checklist: Mapped[dict | None]
    # {"법인등기": "completed", "주주구조": "issue", "IP귀속": "pending", ...}

    risk_log: Mapped[str | None]
    overall_verdict: Mapped[str]         # proceed / concern / reject

    # 딥테크 심화 (§27)
    tech_type: Mapped[str | None]
    scalability_score: Mapped[int | None]
    process_compatibility: Mapped[int | None]
    sample_test_status: Mapped[str | None]
    certification_stage: Mapped[str | None]
    purchase_lead_time_months: Mapped[int | None]

    started_at: Mapped[datetime]
    completed_at: Mapped[datetime | None]
```

### 1.2 InvestmentMemo 모델 (`models/investment_memo.py`)

```python
class InvestmentMemo(Base):
    __tablename__ = "investment_memos"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]        # FK → startups
    author_id: Mapped[uuid.UUID]         # FK → users
    version: Mapped[int]                 # 1, 2, 3...

    # 9개 필수 섹션
    overview: Mapped[str]
    team_assessment: Mapped[str]
    market_assessment: Mapped[str]
    tech_product_assessment: Mapped[str]
    traction: Mapped[str]
    risks: Mapped[str]                   # 5대 리스크
    value_add_points: Mapped[str]
    proposed_terms: Mapped[dict]         # JSON {amount, valuation, vehicle, ...}
    post_investment_plan: Mapped[str]

    status: Mapped[str]                  # draft / submitted / ic_ready
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.3 ICDecision 모델 (`models/ic_decision.py`)

```python
class ICDecision(Base):
    __tablename__ = "ic_decisions"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]        # FK → startups
    memo_id: Mapped[uuid.UUID]           # FK → investment_memos
    decision: Mapped[ICDecisionType]     # Enum
    conditions: Mapped[str | None]
    monitoring_points: Mapped[str | None]
    attendees: Mapped[list]              # JSON
    contract_assignee_id: Mapped[uuid.UUID | None]
    program_assignee_id: Mapped[uuid.UUID | None]
    decided_at: Mapped[datetime]
    notes: Mapped[str | None]
```

---

## 2. API 설계

### 2.1 Reviews API (`routers/reviews.py`)

| Method | Path | Request | Response | RBAC |
|--------|------|---------|----------|------|
| GET | `/api/v1/reviews/` | `?startup_id=&review_type=` | `list[ReviewResponse]` | review_dd_memo: read |
| GET | `/api/v1/reviews/{id}` | - | `ReviewResponse` | review_dd_memo: read |
| POST | `/api/v1/reviews/` | `ReviewCreate` | `ReviewResponse` | review_dd_memo: full |
| PATCH | `/api/v1/reviews/{id}` | `ReviewUpdate` | `ReviewResponse` | review_dd_memo: full |

**DD 자동 완료 (#3)**: PATCH 시 dd_checklist 전 항목이 "completed"이면 → completed_at 자동 설정 + DealStage → IC_PENDING

### 2.2 InvestmentMemos API (`routers/investment_memos.py`)

| Method | Path | Request | Response | RBAC |
|--------|------|---------|----------|------|
| GET | `/api/v1/investment-memos/` | `?startup_id=` | `list[MemoResponse]` | review_dd_memo: read |
| GET | `/api/v1/investment-memos/{id}` | - | `MemoResponse` | review_dd_memo: read |
| POST | `/api/v1/investment-memos/` | `MemoCreate` | `MemoResponse` | review_dd_memo: full |
| PATCH | `/api/v1/investment-memos/{id}` | `MemoUpdate` | `MemoResponse` | review_dd_memo: full |

### 2.3 ICDecisions API (`routers/ic_decisions.py`)

| Method | Path | Request | Response | RBAC |
|--------|------|---------|----------|------|
| GET | `/api/v1/ic-decisions/` | `?startup_id=` | `list[ICDecisionResponse]` | ic_decision: read |
| GET | `/api/v1/ic-decisions/{id}` | - | `ICDecisionResponse` | ic_decision: read |
| POST | `/api/v1/ic-decisions/` | `ICDecisionCreate` | `ICDecisionResponse` | ic_decision: write |

**자동화 #4**: POST 시 decision에 따른 DealStage 자동 전환:
- approved → CONTRACT
- conditional → CONDITIONAL
- on_hold → ON_HOLD
- incubation_first → INCUBATION_FIRST
- rejected → REJECTED

---

## 3. 서비스 설계

### 3.1 review_service.py
```
create(db, startup, user, data) → Review + ActivityLog
update(db, review, data, user) → Review + DD 자동 완료 감지
get_by_startup(db, startup_id, review_type?) → list[Review]
```

### 3.2 investment_memo_service.py
```
create(db, startup, user, data) → InvestmentMemo(version=latest+1)
update(db, memo, data, user) → InvestmentMemo + status 변경
get_by_startup(db, startup_id) → list[InvestmentMemo]
```

### 3.3 ic_decision_service.py
```
create(db, startup, memo, user, data) → ICDecision
  + DealStage 자동 전환 (#4)
  + ActivityLog 기록
get_by_startup(db, startup_id) → list[ICDecision]
```

---

## 4. 구현 순서

```
Step 1: 모델 3개 + Alembic 마이그레이션
Step 2: 스키마 3개 (review, investment_memo, ic_decision)
Step 3: review_service + investment_memo_service + ic_decision_service
Step 4: 라우터 3개 + main.py 등록 + errors.py
Step 5: Backend 통합 테스트 (11개 엔드포인트)
```

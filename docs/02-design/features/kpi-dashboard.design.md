# Design: KPI 대시보드 + 전사 뷰 (Phase 8)

> **Feature**: kpi-dashboard
> **Plan Reference**: `docs/01-plan/features/kpi-dashboard.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 TeamKPI 모델 (`models/team_kpi.py`)

§16 팀별 4계층 KPI. 5팀 × 39개 지표.

```python
class TeamKPI(Base):
    __tablename__ = "team_kpis"

    id: Mapped[uuid.UUID]
    team: Mapped[str]                    # String 50 — sourcing/review/incubation/oi/backoffice
    period: Mapped[str]                  # String 7 — "2026-03" (YYYY-MM)
    kpi_layer: Mapped[str]               # String 20 — input/process/output/outcome
    kpi_name: Mapped[str]                # String 100 — 지표명
    kpi_definition: Mapped[str]          # Text — 정의/산식
    target_value: Mapped[float]          # Float — 목표값
    actual_value: Mapped[float | None]   # Float nullable — 실제값
    achievement_rate: Mapped[float | None]  # Float nullable — 달성률 (자동 계산)
    mom_change: Mapped[str | None]       # String 50 — 전월 대비 (▲5%, ▼3%, -)
    notes: Mapped[str | None]            # Text
    updated_by: Mapped[uuid.UUID | None] # FK → users.id nullable
    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

**UniqueConstraint**: `(team, period, kpi_name)` — 팀+기간+지표명 유일.

---

## 2. API 설계

### 2.1 TeamKPI API (`routers/team_kpis.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/team-kpis/` | `?team=&period=&kpi_layer=` | `TeamKPIListResponse` |
| GET | `/api/v1/team-kpis/{team}/{period}` | - | `TeamKPIListResponse` |
| POST | `/api/v1/team-kpis/` | `TeamKPICreate` | `TeamKPIResponse` |
| PUT | `/api/v1/team-kpis/{id}` | `TeamKPIUpdate` | `TeamKPIResponse` |
| POST | `/api/v1/team-kpis/seed` | - | `{seeded: int}` |

**TeamKPICreate**:
```python
class TeamKPICreate(BaseModel):
    team: str
    period: str
    kpi_layer: str
    kpi_name: str
    kpi_definition: str
    target_value: float
    actual_value: float | None = None
    notes: str | None = None
```

**TeamKPIUpdate**:
```python
class TeamKPIUpdate(BaseModel):
    actual_value: float | None = None
    target_value: float | None = None
    notes: str | None = None
```

### 2.2 KPI Executive API (`routers/team_kpis.py`에 포함)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/team-kpis/executive` | `?period=` | `ExecutiveKPIResponse` |

**ExecutiveKPIResponse**:
```python
class ExecutiveKPIResponse(BaseModel):
    period: str
    teams: dict[str, TeamSummary]
    overall_health: str              # 양호 / 보완필요 / 개선필요

class TeamSummary(BaseModel):
    team: str
    total_kpis: int
    achieved: int                    # 달성률 >= 90%
    needs_improvement: int           # 달성률 < 70%
    highlight_kpis: list[KPIHighlight]

class KPIHighlight(BaseModel):
    kpi_name: str
    kpi_layer: str
    target_value: float
    actual_value: float | None
    achievement_rate: float | None
    status: str                      # 양호 / 보완필요 / 개선필요
```

---

## 3. 서비스 설계

### 3.1 team_kpi_service.py

```python
async def get_list(db, team, period, kpi_layer, page, page_size) -> tuple[list, int]
async def get_by_team_period(db, team, period) -> list[TeamKPI]
async def get_by_id(db, kpi_id) -> TeamKPI | None

async def create(db, data, user) -> TeamKPI
    # 1. UniqueConstraint 체크
    # 2. achievement_rate = actual_value / target_value * 100 (자동)
    # 3. ActivityLog

async def update(db, kpi, data, user) -> TeamKPI
    # 1. actual_value 변경 시 achievement_rate 재계산
    # 2. 전월 대비 mom_change 계산
    # 3. ActivityLog

async def seed_kpis(db, period, user) -> int
    # 39개 KPI 시드 데이터 일괄 생성 (target_value만)

def calculate_achievement(actual: float | None, target: float) -> float | None
    # actual / target * 100

def determine_status(rate: float | None) -> str
    # >= 90% → "양호", 70-89% → "보완필요", < 70% → "개선필요"
```

### 3.2 kpi_executive_service.py

```python
async def get_executive_summary(db, period) -> ExecutiveKPIResponse
    # 1. 5팀 TeamKPI 조회
    # 2. 팀별 달성률 집계
    # 3. highlight_kpis: Output/Outcome 계층 위주 추출
    # 4. overall_health 판정
```

### 3.3 tasks/kpi_aggregation.py (확장)

```python
@celery_app.task
def aggregate_all():
    """§19 수식 기반 실제 집계"""
    # Sourcing: Startup, DealFlow, Handover, Review, ICDecision, Contract 기반
    # 심사: Review, InvestmentMemo, ICDecision, Contract 기반
    # 보육: Incubation, MentoringSession, KPIRecord 기반
    # OI: PartnerDemand, PoCProject 기반
    # 백오피스: Contract 기반
    # → TeamKPI.actual_value + achievement_rate 자동 업데이트
```

---

## 4. KPI 시드 데이터 (39개)

### Sourcing (8)
| Layer | KPI | Target |
|-------|-----|--------|
| input | 신규 리드 수 | 80 |
| input | 전략산업 리드 비율 | 60 |
| process | 1차 미팅 완료율 | 50 |
| process | CRM 입력 완결률 | 100 |
| output | 심사 전환 수 | 20 |
| output | 유효 딜 비율 | 60 |
| outcome | 최종 선발 기여 수 | 6 |
| outcome | 투자 전환 기여율 | 20 |

### 심사 (8)
| Layer | KPI | Target |
|-------|-----|--------|
| input | 신규 심사 착수 건수 | 15 |
| process | 평균 심사 소요일 | 21 |
| process | DD 자료 회수율 | 95 |
| process | 투자메모 완결률 | 100 |
| output | IC 상정 건수 | 8 |
| output | 승인율 | 50 |
| outcome | 클로징 성공률 | 90 |
| outcome | 후속투자 준비 적합률 | 60 |

### 보육 (8)
| Layer | KPI | Target |
|-------|-----|--------|
| input | 관리 포트폴리오 수 | 20 |
| process | 온보딩 완료율 | 100 |
| process | 멘토링 실행률 | 90 |
| process | 액션아이템 이행률 | 75 |
| output | KPI 개선 기업 비율 | 70 |
| output | IR 자료 완성률 | 90 |
| outcome | 후속 투자미팅 발생률 | 60 |
| outcome | 만족도 | 4.5 |

### OI (8)
| Layer | KPI | Target |
|-------|-----|--------|
| input | 신규 파트너 수 | 5 |
| input | 수요과제 발굴 수 | 10 |
| process | 매칭 제안 수 | 12 |
| process | PoC 설계 완료율 | 80 |
| output | PoC 착수 건수 | 4 |
| output | PoC 완료율 | 80 |
| outcome | 계약 전환율 | 30 |
| outcome | 전략적 투자 검토건수 | 2 |

### 백오피스 (7)
| Layer | KPI | Target |
|-------|-----|--------|
| process | 계약 처리 리드타임 | 10 |
| process | 투자집행 정시율 | 100 |
| process | 보고서 정시 제출률 | 100 |
| process | 문서 정합성 오류건수 | 0 |
| outcome | 감사 지적 건수 | 0 |
| outcome | 보안사고 건수 | 0 |
| outcome | Cap Table 정확도 | 100 |

---

## 5. Frontend 컴포넌트 설계

### 5.1 팀별 KPI (`/kpi/team/[team]`)

```
┌───────────────────────────────────────────────────────────────┐
│  Sourcing팀 KPI — 2026-03                    [기간: 2026-03 ▼] │
│                                                               │
│  ── Input ──                                                  │
│  신규 리드 수      ████████████████░░░░  82/80  103% 양호 ▲2  │
│  전략산업 비율     ████████████░░░░░░░░  55/60   92% 양호 ▼5  │
│                                                               │
│  ── Process ──                                                │
│  1차 미팅 완료율   ██████████░░░░░░░░░░  48/50   96% 양호 ▲3  │
│  CRM 완결률       ████████████████████  100/100 100% 양호 -   │
│                                                               │
│  ── Output ──                                                 │
│  심사 전환 수      ████████████████░░░░  18/20   90% 양호 ▲1  │
│  유효 딜 비율      ██████████░░░░░░░░░░  52/60   87% 보완 ▼3  │
│                                                               │
│  ── Outcome ──                                                │
│  최종 선발         ████████░░░░░░░░░░░░   5/6    83% 보완 ▲1  │
│  투자 전환율       ██████░░░░░░░░░░░░░░  15/20   75% 보완 -   │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 전사 경영 (`/kpi/executive`)

```
┌───────────────────────────────────────────────────────────────┐
│  전사 경영 대시보드 — 2026-03                  [기간: 2026-03 ▼] │
│                                                               │
│  전체 상태: 🟢 양호 (달성률 87%)                                │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │ Sourcing │ │  심사팀  │ │  보육팀  │ │  OI팀   │ │백오피스││
│  │ 🟢 92%  │ │ 🟡 85%  │ │ 🟢 91%  │ │ 🟡 78%  │ │🟢 95% ││
│  │ 6/8 달성 │ │ 5/8 달성 │ │ 7/8 달성 │ │ 4/8 달성 │ │6/7달성││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────┘│
│                                                               │
│  ── 개선 필요 지표 ──                                          │
│  🔴 OI | 계약 전환율 22% (목표 30%) — 개선필요                  │
│  🟡 심사 | 승인율 45% (목표 50%) — 보완필요                     │
│  🟡 OI | PoC 완료율 56% (목표 80%) — 보완필요                   │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 KPI 관리 (`/kpi/manage`)

```
┌───────────────────────────────────────────────────────────────┐
│  KPI 값 입력/수정                         [시드 생성] [기간 ▼]  │
│                                                               │
│  팀: [Sourcing ▼]  기간: [2026-03]                            │
│                                                               │
│  ┌──────────────────┬──────┬──────┬──────┬──────┐            │
│  │ 지표             │ 계층 │ 목표 │ 실적 │ 달성률│            │
│  ├──────────────────┼──────┼──────┼──────┼──────┤            │
│  │ 신규 리드 수      │input │  80 │[   ]│      │            │
│  │ 전략산업 비율     │input │  60 │[   ]│      │            │
│  │ ...              │      │     │     │      │            │
│  └──────────────────┴──────┴──────┴──────┴──────┘            │
│                                                               │
│  [저장]                                                       │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 순서 (8 Steps)

```
Step 1:  models/team_kpi.py + Alembic
Step 2:  schemas/team_kpi.py
Step 3:  services/team_kpi_service.py (CRUD + 달성률 + 상태 판정)
Step 4:  services/kpi_executive_service.py (팀별 집계 + 전사 요약)
Step 5:  routers/team_kpis.py (6개 엔드포인트)
Step 6:  tasks/kpi_aggregation.py 실제 구현 + main.py + errors.py + __init__.py
Step 7:  Frontend — 팀별 KPI + 전사 경영 + KPI 관리
Step 8:  시드 데이터 + types.ts + 통합 테스트
```

---

## 7. RBAC 매핑

| 엔드포인트 | 비고 |
|-----------|------|
| GET team-kpis | 전 팀 조회 가능 (deal_flow read) |
| POST/PUT team-kpis | admin/partner만 (서비스 레벨 체크) |
| GET executive | admin/partner만 |
| POST seed | admin만 |

---

## 8. 에러 코드

```python
def team_kpi_not_found() -> HTTPException: ...
def team_kpi_duplicate() -> HTTPException: ...   # 409 (team+period+kpi_name 중복)
```

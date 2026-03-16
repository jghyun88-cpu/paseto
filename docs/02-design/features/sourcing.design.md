# Design: Sourcing 팀 모듈 (Phase 2)

> **Feature**: sourcing
> **Plan Reference**: `docs/01-plan/features/sourcing.plan.md`
> **Created**: 2026-03-16
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 Screening 모델 (`models/screening.py`)

마스터 §3-3 Screening 스펙 기반. SRC-F02 양식 필드를 1:1 매핑.

```python
class Screening(Base):
    __tablename__ = "screenings"

    id: Mapped[uuid.UUID]              # PK
    startup_id: Mapped[uuid.UUID]      # FK → startups.id
    screener_id: Mapped[uuid.UUID]     # FK → users.id

    # SRC-F02 7개 평가항목 (각 1-5점)
    fulltime_commitment: Mapped[int]   # 전일제 헌신도
    problem_clarity: Mapped[int]       # 문제 정의 명확성
    tech_differentiation: Mapped[int]  # 기술/제품 차별성
    market_potential: Mapped[int]      # 시장성
    initial_validation: Mapped[int]    # 초기 검증/진척도
    legal_clear: Mapped[bool]          # 법적 이슈 없음
    strategy_fit: Mapped[int]          # 프로그램 적합성

    # 산출
    overall_score: Mapped[float]       # 자동 계산 (6개 항목 합산)
    recommendation: Mapped[str]        # pass / review / reject
    risk_notes: Mapped[str | None]     # 핵심 리스크 3개
    handover_memo: Mapped[str | None]  # 심사팀 인계 메모

    created_at: Mapped[datetime]
```

**점수 산정 로직** (서비스 레이어):
```
overall_score = fulltime_commitment + problem_clarity + tech_differentiation
              + market_potential + initial_validation + strategy_fit
              + (5 if legal_clear else 0)

총점 범위: 5~35
- 30-35 → recommendation = "pass"    (A등급)
- 20-29 → recommendation = "review"  (B등급)
- <20   → recommendation = "reject"  (C/D등급)
```

### 1.2 HandoverDocument 모델 (`models/handover.py`)

마스터 §3-3 HandoverDocument 스펙 기반. 팀 간 인계 문서.

```python
class HandoverDocument(Base):
    __tablename__ = "handover_documents"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]           # FK → startups.id
    from_team: Mapped[str]                  # "sourcing"
    to_team: Mapped[str]                    # "review"
    handover_type: Mapped[str]              # "sourcing_to_review"
    content: Mapped[dict]                   # JSON — 인계 내용
    created_by: Mapped[uuid.UUID]           # FK → users.id
    created_at: Mapped[datetime]
    acknowledged_by: Mapped[uuid.UUID|None] # FK → users.id
    acknowledged_at: Mapped[datetime|None]
    escalated: Mapped[bool] = False
    escalated_at: Mapped[datetime|None]
```

**content JSON 구조**:
```json
{
  "screening_results": {
    "grade": "pass",
    "overall_score": 32,
    "risk_notes": "..."
  },
  "company_overview": "기업 개요 1페이지",
  "recommendation_reason": "검토 가치 설명",
  "key_risks": ["리스크1", "리스크2", "리스크3"],
  "handover_memo": "심사팀 참고사항"
}
```

### 1.3 마이그레이션 순서
```
screenings (FK: startup_id, screener_id → users)
  ↓
handover_documents (FK: startup_id, created_by → users, acknowledged_by → users)
```
단일 Alembic 리비전으로 2개 테이블 동시 생성.

---

## 2. API 설계

### 2.1 DealFlow API (`routers/deal_flows.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/deal-flows/` | 딜플로우 이력 | `?startup_id=` | `DealFlowListResponse` |
| POST | `/api/v1/deal-flows/move` | 칸반 단계 이동 | `DealFlowMoveRequest` | `DealFlowResponse` |

**DealFlowMoveRequest**:
```python
class DealFlowMoveRequest(BaseModel):
    startup_id: uuid.UUID
    to_stage: str           # DealStage 값
    notes: str | None = None
```

**비즈니스 로직**: `deal_flow_service.move_stage()`
1. DealFlow 레코드 생성 (stage=to_stage, moved_by=current_user)
2. Startup.current_deal_stage 동기화
3. ActivityLog 기록

### 2.2 Screening API (`routers/screenings.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/screenings/` | 스크리닝 목록 | `?startup_id=` | `ScreeningListResponse` |
| GET | `/api/v1/screenings/{id}` | 스크리닝 상세 | - | `ScreeningResponse` |
| POST | `/api/v1/screenings/` | 스크리닝 제출 | `ScreeningCreate` | `ScreeningResponse` |

**ScreeningCreate**:
```python
class ScreeningCreate(BaseModel):
    startup_id: uuid.UUID
    fulltime_commitment: int     # 1-5
    problem_clarity: int         # 1-5
    tech_differentiation: int    # 1-5
    market_potential: int        # 1-5
    initial_validation: int      # 1-5
    legal_clear: bool
    strategy_fit: int            # 1-5
    risk_notes: str | None = None
    handover_memo: str | None = None
    handover_to_review: bool = False  # 인계 여부
```

**비즈니스 로직**: `screening_service.create()`
1. overall_score 자동 계산
2. recommendation 자동 산정 (pass/review/reject)
3. Screening 저장 + ActivityLog
4. **자동화 #2**: recommendation="pass" AND handover_to_review=True 이면:
   - HandoverDocument 자동 생성
   - DealFlow → DEEP_REVIEW 단계 이동
   - Notification(심사팀) 생성

### 2.3 Handover API (`routers/handovers.py`)

| Method | Path | 기능 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/handovers/` | 인계 목록 | `?from_team=&to_team=` | `HandoverListResponse` |
| GET | `/api/v1/handovers/{id}` | 인계 상세 | - | `HandoverResponse` |
| POST | `/api/v1/handovers/{id}/acknowledge` | 수신 확인 | - | `HandoverResponse` |

**acknowledge 로직**:
1. acknowledged_by = current_user.id
2. acknowledged_at = now
3. ActivityLog 기록

---

## 3. 서비스 설계

### 3.1 deal_flow_service.py

```python
async def get_by_startup(db, startup_id) -> list[DealFlow]
async def move_stage(db, startup_id, to_stage, user, notes) -> DealFlow
    # 1. DealFlow 생성
    # 2. Startup.current_deal_stage 업데이트
    # 3. ActivityLog 기록
```

### 3.2 screening_service.py

```python
def calculate_score(data: ScreeningCreate) -> tuple[float, str]
    # overall_score 계산 + recommendation 산정

async def create(db, data, user) -> Screening
    # 1. 점수 계산
    # 2. Screening 저장
    # 3. ActivityLog
    # 4. 자동화 #2: 인계 트리거

async def get_by_startup(db, startup_id) -> list[Screening]
```

### 3.3 handover_service.py

```python
async def create_handover(db, startup_id, screening, user) -> HandoverDocument
    # 1. content JSON 조립 (screening + startup 데이터)
    # 2. HandoverDocument 저장
    # 3. DealFlow → DEEP_REVIEW 이동
    # 4. 심사팀 Notification 생성
    # 5. ActivityLog

async def acknowledge(db, handover_id, user) -> HandoverDocument
async def get_list(db, from_team, to_team) -> list[HandoverDocument]
```

### 3.4 notification_service.py

```python
async def create(db, user_id, title, message, ntype, entity_type, entity_id)
async def get_for_team(db, team) -> list[User]
    # 해당 팀의 모든 활성 사용자에게 알림 생성
```

---

## 4. Frontend 컴포넌트 설계

### 4.1 칸반보드 (`/sourcing/pipeline`)

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Inbound   │  1차 스크리닝  │  심층검토 대기  │ 심사팀 인계 완료 │
│             │             │             │              │
│  ┌───────┐  │  ┌───────┐  │  ┌───────┐  │  ┌───────┐   │
│  │ 카드  │  │  │ 카드  │  │  │ 카드  │  │  │ 카드  │   │
│  │ 기업명 │  │  │ 기업명 │  │  │ 기업명 │  │  │ 기업명 │   │
│  │ 산업  │  │  │ 점수  │  │  │ 등급  │  │  │ 인계일 │   │
│  └───────┘  │  └───────┘  │  └───────┘  │  └───────┘   │
│     ...     │     ...     │     ...     │     ...      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**컬럼별 DealStage 매핑**:
| 컬럼 | DealStage |
|------|-----------|
| Inbound | `INBOUND` |
| 1차 스크리닝 | `FIRST_SCREENING` |
| 심층검토 대기 | `DEEP_REVIEW` |
| 심사팀 인계 완료 | `INTERVIEW` 이상 |

**DnD 동작**: 카드 드래그 → `POST /api/v1/deal-flows/move` 호출

**카드 컴포넌트**:
- 기업명 (클릭 → `/startup/{id}` 이동)
- 산업 태그
- 담당자 아바타
- 스크리닝 점수 (있으면)
- 등록일

### 4.2 스크리닝 폼 (`/sourcing/screening/new`)

```
┌────────────────────────────────────────┐
│  1차 스크리닝 — {기업명}                   │
│                                        │
│  전일제 헌신도    ●●●●○  4/5             │
│  문제 정의       ●●●○○  3/5             │
│  기술 차별성     ●●●●●  5/5             │
│  시장성         ●●●●○  4/5             │
│  초기 검증       ●●●○○  3/5             │
│  법적 이슈       ☑ 없음                  │
│  프로그램 적합성  ●●●●○  4/5             │
│                                        │
│  총점: 28/35    등급 제안: B (Review)     │
│                                        │
│  핵심 리스크 3개: [텍스트 입력]            │
│  인계 메모: [텍스트 입력]                 │
│  ☐ 심사팀 인계                           │
│                                        │
│  [제출]  [취소]                          │
└────────────────────────────────────────┘
```

- 슬라이더 or 별점 UI로 1-5점 입력
- 총점/등급은 실시간 계산 (클라이언트)
- "심사팀 인계" 체크 시 제출 후 자동 HandoverDocument 생성

### 4.3 인계 관리 (`/sourcing/handover`)

| 기업명 | 인계일 | 등급 | 심사팀 확인 | 상태 |
|--------|--------|------|-------------|------|
| A사 | 2026-03-15 | Pass | 김심사역 | ✅ 확인됨 |
| B사 | 2026-03-16 | Pass | - | ⏳ 대기중 |

- "대기중" 24h 이상 → 에스컬레이션 뱃지 표시

### 4.4 소싱 분석 (`/sourcing/reports`)

- 채널별 유입 건수 (recharts BarChart)
- 월간 딜플로우 현황 (LineChart)
- 등급별 분포 (PieChart)
- 데이터 소스: `GET /api/v1/startups/?page_size=999` + 클라이언트 집계

---

## 5. 구현 순서 (9 Steps)

```
Step 1: models/screening.py + models/handover.py + Alembic 마이그레이션
Step 2: services/notification_service.py + services/deal_flow_service.py
Step 3: services/screening_service.py + services/handover_service.py
Step 4: schemas (screening, deal_flow, handover, notification)
Step 5: routers (screenings, deal_flows, handovers) + main.py 등록 + errors.py
Step 6: Backend API 통합 테스트 (7개 엔드포인트)
Step 7: Frontend 칸반보드 (@hello-pangea/dnd 설치 + KanbanBoard/Column/Card)
Step 8: Frontend 스크리닝 폼 + 인계 관리 페이지
Step 9: Frontend 소싱 분석 페이지 + 통합 테스트
```

---

## 6. RBAC 매핑

| 엔드포인트 | 리소스 | 레벨 | sourcing | review | partner/admin |
|-----------|--------|------|:--------:|:------:|:------------:|
| GET deal-flows | deal_flow | read | ✅ | ✅ | ✅ |
| POST deal-flows/move | deal_flow | full | ✅ | ❌ | ✅ |
| GET screenings | screening | read | ✅ | ✅ | ✅ |
| POST screenings | screening | full | ✅ | ❌ | ✅ |
| GET handovers | deal_flow | read | ✅ | ✅ | ✅ |
| POST handovers/{id}/ack | review_dd_memo | write | ❌ | ✅ | ✅ |

---

## 7. 에러 코드 추가

```python
# errors.py에 추가
def screening_not_found() -> HTTPException: ...
def handover_not_found() -> HTTPException: ...
def invalid_deal_stage_transition() -> HTTPException: ...
def handover_already_acknowledged() -> HTTPException: ...
```

# Design: 팀간 연결 + 고도화 (Phase 7)

> **Feature**: phase7-integration
> **Plan Reference**: `docs/01-plan/features/phase7-integration.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 Meeting 모델 (`models/meeting.py`)

§37 회의체 시스템. 7종 회의 유형.

```python
class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID]
    meeting_type: Mapped[MeetingType]          # 7종 Enum
    title: Mapped[str]                         # String 200
    scheduled_at: Mapped[datetime]             # 회의 예정 일시
    duration_minutes: Mapped[int | None]       # Integer nullable
    attendees: Mapped[list]                    # JSON — [{user_id, team, role}]
    agenda_items: Mapped[list]                 # JSON — [{item, owner_id, priority}]
    minutes: Mapped[str | None]                # Text — 회의록
    action_items: Mapped[list | None]          # JSON — [{item, assignee_id, deadline, status}]
    related_startup_ids: Mapped[list | None]   # JSON — [startup_id, ...]
    created_by: Mapped[uuid.UUID]              # FK → users.id

    is_deleted: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

> Notification, HandoverDocument 모델은 이미 구현됨. 추가 필드 불필요.

---

## 2. API 설계

### 2.1 Meeting API (`routers/meetings.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/meetings/` | `?meeting_type=&from_date=&to_date=` | `MeetingListResponse` |
| GET | `/api/v1/meetings/{id}` | - | `MeetingResponse` |
| POST | `/api/v1/meetings/` | `MeetingCreate` | `MeetingResponse` |
| PUT | `/api/v1/meetings/{id}` | `MeetingUpdate` | `MeetingResponse` |
| DELETE | `/api/v1/meetings/{id}` | - | 204 |

**MeetingCreate**:
```python
class MeetingCreate(BaseModel):
    meeting_type: str         # MeetingType 값
    title: str
    scheduled_at: datetime
    duration_minutes: int | None = None
    attendees: list[dict] = []
    agenda_items: list[dict] = []
    related_startup_ids: list[str] | None = None
```

**MeetingUpdate**:
```python
class MeetingUpdate(BaseModel):
    title: str | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    attendees: list[dict] | None = None
    agenda_items: list[dict] | None = None
    minutes: str | None = None
    action_items: list[dict] | None = None
    related_startup_ids: list[str] | None = None
```

### 2.2 Notification API (`routers/notifications.py` — 신규)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/notifications/` | `?notification_type=&is_read=` | `NotificationListResponse` |
| PATCH | `/api/v1/notifications/{id}/read` | - | `NotificationResponse` |
| PATCH | `/api/v1/notifications/read-all` | - | `{count: int}` |

> 현재 사용자의 알림만 조회 (user_id = current_user.id)

### 2.3 Handover 확장 (기존 `routers/handovers.py`에 추가)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/handovers/hub` | `?handover_type=&status=` | `HandoverHubResponse` |
| GET | `/api/v1/handovers/pending` | - | `list[HandoverResponse]` |

**HandoverHubResponse**:
```python
class HandoverHubResponse(BaseModel):
    total: int
    acknowledged: int
    pending: int
    escalated: int
    by_type: dict        # {handover_type: count}
    recent: list[HandoverResponse]
```

### 2.4 Dashboard API (`routers/dashboard.py`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/v1/dashboard/executive` | - | `ExecutiveDashboardResponse` |
| GET | `/api/v1/dashboard/timeline/{startup_id}` | `?page=&page_size=` | `TimelineResponse` |

**ExecutiveDashboardResponse**:
```python
class ExecutiveDashboardResponse(BaseModel):
    deal_pipeline: DealPipelineMetrics
    portfolio_metrics: PortfolioMetrics
    crisis_alerts: list[CrisisAlert]
    unacknowledged_handovers: int
    upcoming_meetings: list[MeetingResponse]
    recent_handovers: list[HandoverResponse]

class DealPipelineMetrics(BaseModel):
    total: int
    in_screening: int
    in_contract: int
    portfolio: int

class PortfolioMetrics(BaseModel):
    total_startups: int
    grade_a_ratio: float
    follow_on_rate: float

class CrisisAlert(BaseModel):
    startup_id: uuid.UUID
    company_name: str
    crisis_type: str       # cash_depletion / headcount_loss / customer_loss
    severity: str          # high / medium
```

### 2.5 Admin Task Trigger (`routers/dashboard.py`에 포함)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/v1/admin/tasks/escalation-check` | - | `{triggered: true}` |
| POST | `/api/v1/admin/tasks/crisis-scan` | - | `{triggered: true}` |

---

## 3. 서비스 설계

### 3.1 meeting_service.py

```python
async def get_list(db, page, page_size, meeting_type, from_date, to_date) -> tuple[list, int]
async def get_by_id(db, meeting_id) -> Meeting | None
async def create(db, data, user) -> Meeting
async def update(db, meeting, data, user) -> Meeting
async def delete(db, meeting, user) -> None   # soft delete
```

### 3.2 dashboard_service.py

```python
async def get_executive_dashboard(db) -> dict
    # 1. deal_pipeline: Startup.current_deal_stage별 카운트
    # 2. portfolio_metrics: Incubation 집계
    # 3. crisis_alerts: Incubation.crisis_flags + KPIRecord 분석
    # 4. unacknowledged_handovers: HandoverDocument.acknowledged_by IS NULL
    # 5. upcoming_meetings: Meeting WHERE scheduled_at > now()
    # 6. recent_handovers: 최근 5개

async def get_timeline(db, startup_id, page, page_size) -> tuple[list, int]
    # ActivityLog WHERE startup_id = startup_id ORDER BY created_at DESC
```

### 3.3 notification_read_service.py

```python
async def get_my_notifications(db, user_id, notification_type, is_read, page, page_size) -> tuple[list, int]
async def mark_read(db, notification_id, user_id) -> Notification
async def mark_all_read(db, user_id) -> int   # 읽음 처리된 건수
```

---

## 4. Celery Tasks 설계

### 4.1 tasks/escalation.py (매시간)

```python
@celery_app.task
def check_unacknowledged():
    """미확인 인계 24h 경과 → ESCALATION 알림"""
    # 1. HandoverDocument WHERE acknowledged_by IS NULL
    #    AND created_at < now() - 24h AND escalated = False
    # 2. 각 인계에 대해:
    #    - escalated = True, escalated_at = now()
    #    - from_team + to_team 리더에게 ESCALATION 알림
```

### 4.2 tasks/report_reminders.py (매일 09:00)

```python
@celery_app.task
def check_deadlines():
    """보고 마감 D-7/D-3/당일 리마인더"""
    # Report 모델 또는 OPS-F02 기반
    # deadline - today == 7, 3, 0 → REPORT_DEADLINE 알림
```

### 4.3 tasks/crisis_scan.py (매일 08:00)

```python
@celery_app.task
def scan_all_portfolios():
    """전체 포트폴리오 위기 신호 스캔"""
    # 1. KPIRecord: runway_months < 3 → CRISIS_ALERT
    # 2. KPIRecord: headcount 전월 대비 20%+ 감소 → CRISIS_ALERT
    # 3. KPIRecord: customer_count 전월 대비 20%+ 감소 → CRISIS_ALERT
    # 4. Incubation.crisis_flags 업데이트
```

### 4.4 tasks/kpi_aggregation.py (매월 1일 02:00)

```python
@celery_app.task
def aggregate_all():
    """전체 포트폴리오 KPI 월간 집계"""
    # TeamKPI 또는 집계 결과를 캐시/저장
```

### 4.5 tasks/__init__.py (Beat 스케줄 등록)

```python
celery_app.conf.beat_schedule = {
    "escalation-check-hourly": {
        "task": "app.tasks.escalation.check_unacknowledged",
        "schedule": crontab(minute=0),
    },
    "report-reminder-daily": {
        "task": "app.tasks.report_reminders.check_deadlines",
        "schedule": crontab(hour=9, minute=0),
    },
    "crisis-scan-daily": {
        "task": "app.tasks.crisis_scan.scan_all_portfolios",
        "schedule": crontab(hour=8, minute=0),
    },
    "kpi-aggregation-monthly": {
        "task": "app.tasks.kpi_aggregation.aggregate_all",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),
    },
}
```

---

## 5. Frontend 컴포넌트 설계

### 5.1 통합 대시보드 (`/dashboard`)

```
┌───────────────────────────────────────────────────────────────┐
│  eLSA 전사 대시보드                                            │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 파이프라인 │  │ 포트폴리오│  │ 미확인인계 │  │ 위기기업  │     │
│  │   42건   │  │   31개   │  │   2건    │  │   3건    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                               │
│  ── 위기 알림 ──                                               │
│  ⚠ A사: 현금고갈 위험 (runway 2.5개월)                          │
│  ⚠ B사: 고객 수 3개월 연속 하락                                 │
│                                                               │
│  ── 이번 주 회의 ──              ── 최근 인계 ──                 │
│  │ 3/18(화) 주간딜회의 14:00 │   │ Sourcing→심사 A사 ⏳       │
│  │ 3/20(목) IC 15:00       │   │ 심사→보육 B사 ✅            │
│  └─────────────────────────┘   └──────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 인계 허브 (`/handover/hub`)

```
┌───────────────────────────────────────────────────────────────┐
│  인계 허브                                                     │
│                                                               │
│  전체: 25 | 확인완료: 20 | 대기중: 3 | 에스컬레이션: 2          │
│                                                               │
│  필터: [전체 ▼] [Sourcing→심사] [심사→백오피스] [심사→보육] ...   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Sourcing → 심사 | A사 | 2026-03-17 | ⏳ 대기 (6h)      │   │
│  │ Sourcing → 심사 | B사 | 2026-03-16 | ⚠ 에스컬레이션    │   │
│  │ 심사 → 보육 | C사 | 2026-03-15 | ✅ 확인 (김PM)        │   │
│  │ OI → 심사 | D사 (역인계) | 2026-03-14 | ✅ 확인        │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 회의 관리 (`/meetings`)

```
┌───────────────────────────────────────────────────────────────┐
│  회의 관리                                        [+ 회의 등록]  │
│                                                               │
│  필터: [전체 ▼] [주간딜] [IC] [포트폴리오] [파트너십] [운영]     │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 🔵 주간 딜소싱 회의 | 2026-03-18 14:00 | 60분          │   │
│  │ 참석: Sourcing팀 5명, 심사팀 3명, 대표                  │   │
│  │ 안건: 3건 | 회의록: 미작성 | 액션: 5건 (2 완료)         │   │
│  └────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 🔴 투자위원회 (IC) | 2026-03-20 15:00 | 90분           │   │
│  │ 참석: 파트너 3명, 심사역 2명, 외부전문가                 │   │
│  │ 안건: A사 투자심의 | 회의록: - | 액션: -                 │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 5.4 알림 센터 (`/notifications`)

```
┌───────────────────────────────────────────────────────────────┐
│  알림                                         [전체 읽음 처리]   │
│                                                               │
│  필터: [전체] [인계] [기한] [KPI] [위기] [보고] [에스컬레이션]    │
│                                                               │
│  ● 인계 도착: A사 — Sourcing팀에서 인계 (3시간 전)              │
│  ● KPI 경고: B사 매출 3개월 연속 하락 (5시간 전)                │
│  ○ 보고 마감: 월간운용보고서 D-3 (어제)                         │
│  ○ 멘토링 액션: C사 프로토타입 v2 기한 D-1 (어제)               │
│                                                               │
│  ● = 미읽음, ○ = 읽음                                         │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 순서 (10 Steps)

```
Step 1:  models/meeting.py + Alembic 마이그레이션
Step 2:  schemas/ — meeting.py, dashboard.py, notification 확장
Step 3:  services/ — meeting_service + notification_read_service
Step 4:  services/ — dashboard_service + handover_hub_service
Step 5:  routers/ — meetings.py + notifications.py
Step 6:  routers/ — dashboard.py + handovers.py 확장
Step 7:  tasks/ — escalation, report_reminders, crisis_scan, kpi_aggregation + Beat 스케줄
Step 8:  main.py + errors.py + __init__.py 등록
Step 9:  Frontend — 통합 대시보드 + 알림 센터
Step 10: Frontend — 인계 허브 + 회의 관리 + types.ts
```

---

## 7. RBAC 매핑

| 엔드포인트 | 리소스 | 레벨 | 비고 |
|-----------|--------|------|------|
| GET/POST meetings | deal_flow | read/full | 전 팀 조회 가능, 등록은 full |
| GET notifications | - | - | 현재 사용자 본인 알림만 (RBAC 불필요) |
| GET dashboard/executive | - | - | partner/admin만 (서비스 레벨 체크) |
| GET handovers/hub | deal_flow | read | 전 팀 조회 가능 |
| POST admin/tasks/* | - | - | admin만 |

---

## 8. 에러 코드 추가

```python
def meeting_not_found() -> HTTPException: ...
def notification_not_found() -> HTTPException: ...
```

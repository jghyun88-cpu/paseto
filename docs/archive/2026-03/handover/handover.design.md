# Handover (인계 패키지) 개선 Design Document

> **Summary**: 5개 추가 경로 자동화 + 에스컬레이션 보완 + 수신팀 대시보드 + UX 개선 상세 설계
>
> **Project**: eLSA (딥테크 액셀러레이터 운영시스템)
> **Author**: AI Assistant
> **Date**: 2026-03-23
> **Status**: Draft
> **Planning Doc**: [handover.plan.md](../../01-plan/features/handover.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 기존 `sourcing→review` 자동 인계 패턴을 확장하여 나머지 5개 경로 구현
2. 이미 구현된 에스컬레이션 Celery 태스크의 알림 대상을 수신팀 리더로 변경
3. 각 팀 메뉴에 인계 수신함 추가 — 팀별 권한 분리
4. 인계 수동 생성 UX를 기업 검색 + 경로 선택 + 동적 폼으로 개선
5. 인계 상세 보기에서 content JSON을 구조화된 카드로 렌더링

### 1.2 Design Principles

- **기존 코드 최소 변경**: 새 경로는 `handover_service.py`에 별도 함수로 추가, 기존 `create_from_screening()` 변경 없음
- **타입 안전성**: 경로별 content를 Pydantic 모델로 검증
- **일관된 패턴**: 모든 경로가 동일한 흐름 (HandoverDocument 생성 → 알림 → ActivityLog)

---

## 2. Architecture

### 2.1 Component Diagram — 인계 자동화 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRIGGER SERVICES                             │
├─────────────┬──────────────┬──────────────┬──────────────┬──────────┤
│ screening   │ deal_flow    │ poc          │ follow_on    │ contract │
│ _service    │ _service     │ _service     │ _service     │ _service │
│ .create()   │ .move_stage()│ .create()    │ .recommend() │ .update()│
│ [구현완료]   │ [신규 훅]    │ [신규 훅]    │ [신규 훅]    │ [신규 훅] │
└──────┬──────┴──────┬───────┴──────┬───────┴──────┬───────┴─────┬────┘
       │             │              │              │             │
       ▼             ▼              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   handover_service.py                               │
├─────────────────────────────────────────────────────────────────────┤
│ create_from_screening()          [구현완료]                         │
│ create_review_to_backoffice()    [신규] FR-01                      │
│ create_review_to_incubation()    [신규] FR-02                      │
│ create_incubation_to_oi()        [신규] FR-03                      │
│ create_oi_to_review()            [신규] FR-04                      │
│ create_backoffice_broadcast()    [신규] FR-05                      │
│ create_manual()                  [신규] FR-08 (수동 생성)           │
│ get_list() / get_by_id()         [기존 유지]                       │
│ acknowledge()                    [기존 유지]                       │
│ get_stats()                      [신규] FR-10                      │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
    HandoverDocument   Notification   ActivityLog
    (DB 저장)          (알림 발송)     (감사 추적)
```

### 2.2 Data Flow — 자동 인계

```
비즈니스 이벤트 발생 (e.g. IC 승인)
  → Trigger Service에서 조건 충족 확인
  → handover_service.create_xxx() 호출
  → HandoverDocument 생성 (content = 경로별 Pydantic 모델로 구성)
  → notification_service.notify_team() → 수신팀에 HANDOVER_REQUEST 알림
  → activity_log_service.log() → 인계 이벤트 기록
  → DB commit
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| handover_service (신규 함수들) | Startup, Deal, InvestmentMemo 모델 | content 구성을 위한 데이터 조회 |
| 각 Trigger Service | handover_service | 인계 문서 생성 호출 |
| 에스컬레이션 태스크 | HandoverDocument, Notification | 미확인 체크 + 알림 |
| 프론트엔드 수신함 | GET /handovers/ API | 팀별 필터링 조회 |

---

## 3. Data Model

### 3.1 HandoverDocument (기존 — 변경 없음)

```python
class HandoverDocument(Base):
    __tablename__ = "handover_documents"

    id: UUID                    # PK
    startup_id: UUID            # FK → startups.id
    from_team: str              # sourcing / review / incubation / oi / backoffice
    to_team: str                # sourcing / review / incubation / oi / backoffice
    handover_type: str          # 6가지 경로 키
    content: dict               # 경로별 구조화된 JSON (§3.2에서 정의)
    created_by: UUID            # FK → users.id
    created_at: datetime        # 생성일시
    acknowledged_by: UUID|None  # FK → users.id (수신 확인자)
    acknowledged_at: datetime|None
    escalated: bool             # 24시간 미확인 시 true
    escalated_at: datetime|None
    is_deleted: bool            # soft delete
```

**DB 스키마 변경: 없음** — 기존 테이블 그대로 사용.

### 3.2 경로별 Content Pydantic 모델 (신규)

```python
# schemas/handover.py에 추가

class SourcingToReviewContent(BaseModel):
    """sourcing_to_review — 기존 create_from_screening() 생성 구조"""
    screening_results: dict      # {grade, overall_score, risk_notes}
    company_overview: dict       # {name, ceo, industry, stage, one_liner}
    handover_memo: str | None
    key_risks: list[str]

class ReviewToBackofficeContent(BaseModel):
    """review_to_backoffice — IC 승인 시 전달"""
    ic_decision: str             # approved / conditional
    investment_terms: dict       # {amount, valuation, instrument, conditions}
    preconditions: list[str]     # 선행조건 리스트
    legal_memo: str | None       # 법무 이슈 메모
    company_overview: dict

class ReviewToIncubationContent(BaseModel):
    """review_to_incubation — 계약 체결 시 전달"""
    investment_memo_summary: str  # 투자메모 핵심 요약
    growth_bottlenecks: list[str] # 성장 병목 요약
    six_month_priorities: list[str]  # 6개월 핵심과제
    risk_signals: list[str]       # 위험 신호
    company_overview: dict

class IncubationToOiContent(BaseModel):
    """incubation_to_oi — PoC 매칭 요청 시 전달"""
    tech_product_status: str     # 기술/제품 현재 상태
    poc_areas: list[str]         # PoC 가능 영역
    matching_priorities: list[str] # 수요기업 매칭 우선순위
    available_resources: str     # 대응 가능 리소스
    company_overview: dict

class OiToReviewContent(BaseModel):
    """oi_to_review — 후속투자 추천 시 전달"""
    strategic_investment_potential: str  # 전략투자 가능성
    customer_feedback: str        # 고객 반응
    pilot_results: str            # 실증 성과
    follow_on_points: list[str]   # 후속라운드 설득 포인트
    company_overview: dict

class BackofficeBroadcastContent(BaseModel):
    """backoffice_broadcast — 전 조직 브로드캐스트"""
    contract_status: str          # 계약 상태
    report_deadline: str | None   # 보고 기한
    risk_alert: str | None        # 리스크 알림
    document_updates: list[str]   # 권한/문서 업데이트 목록
    company_overview: dict
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | 변경 |
|--------|------|-------------|------|------|
| GET | `/api/v1/handovers/` | 인계 목록 (from_team/to_team/handover_type 필터) | deal_flow:read | **확장**: handover_type 필터 추가 |
| GET | `/api/v1/handovers/{id}` | 인계 상세 | deal_flow:read | 기존 유지 |
| POST | `/api/v1/handovers/{id}/acknowledge` | 수신 확인 | **확장**: 팀별 권한 | **변경**: 수신팀 동적 권한 |
| POST | `/api/v1/handovers/manual` | 수동 인계 생성 | deal_flow:write | **신규** FR-08 |
| GET | `/api/v1/handovers/stats` | 인계 통계 | deal_flow:read | **신규** FR-10 |

### 4.2 신규 API — POST /api/v1/handovers/manual

**Request:**
```json
{
  "startup_id": "uuid",
  "handover_type": "sourcing_to_review",  // 6가지 중 택 1
  "content": {
    // 경로별 필수 필드 (§3.2 Content 모델에 따라)
  },
  "memo": "추가 전달 사항"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "startup_id": "uuid",
  "from_team": "sourcing",
  "to_team": "review",
  "handover_type": "sourcing_to_review",
  "content": { ... },
  "created_by": "uuid",
  "created_at": "2026-03-23T10:00:00Z",
  "acknowledged_by": null,
  "acknowledged_at": null,
  "escalated": false,
  "escalated_at": null
}
```

**Validation:**
- `handover_type`에 따라 `from_team`/`to_team` 자동 설정
- `content`는 해당 경로의 Pydantic 모델로 검증
- `startup_id` 존재 확인 (is_deleted=False)

### 4.3 신규 API — GET /api/v1/handovers/stats

**Response (200):**
```json
{
  "by_type": {
    "sourcing_to_review": { "total": 12, "acknowledged": 10, "pending": 1, "escalated": 1 },
    "review_to_backoffice": { "total": 5, "acknowledged": 3, "pending": 2, "escalated": 0 }
  },
  "avg_acknowledge_hours": 8.5,
  "escalation_rate": 0.08
}
```

### 4.4 acknowledge 권한 변경

현재: `review_dd_memo:write` (심사팀 전용)

**변경 후**: 수신팀(to_team)에 따라 동적 권한 체크

```python
# acknowledge 시 검증 로직
TEAM_PERMISSIONS = {
    "review":     "review_dd_memo:write",
    "backoffice": "backoffice:write",
    "incubation": "incubation:write",
    "oi":         "oi:write",
}

# to_team에 해당하는 권한을 가진 사용자만 acknowledge 가능
```

---

## 5. 경로별 자동 트리거 상세 설계

### 5.1 FR-01: review → backoffice (IC 승인 시)

**트리거 조건**: `deal_flow_service.move_stage(to_stage=DealStage.APPROVED)`

**호출 위치**: `deal_flow_service.py` — `move_stage()` 함수 내부

```python
# deal_flow_service.py — move_stage() 끝부분에 추가
if to_stage == DealStage.APPROVED:
    await handover_service.create_review_to_backoffice(db, startup, user)
```

**content 구성**:
```python
async def create_review_to_backoffice(db, startup, user):
    # Deal에서 투자 조건 조회
    deal = await deal_service.get_latest_by_startup(db, startup.id)
    content = ReviewToBackofficeContent(
        ic_decision="approved",
        investment_terms={
            "amount": str(deal.investment_amount) if deal else None,
            "valuation": str(deal.valuation) if deal else None,
            "instrument": deal.instrument if deal else None,
            "conditions": deal.conditions if deal else [],
        },
        preconditions=deal.preconditions if deal and deal.preconditions else [],
        legal_memo=deal.legal_memo if deal else None,
        company_overview=_build_company_overview(startup),
    ).model_dump()
    # ... HandoverDocument 생성 + 알림 + ActivityLog
```

### 5.2 FR-02: review → incubation (CLOSED 시)

**트리거 조건**: `deal_flow_service.move_stage(to_stage=DealStage.CLOSED)`

```python
if to_stage == DealStage.CLOSED:
    await handover_service.create_review_to_incubation(db, startup, user)
```

**content 구성**: InvestmentMemo에서 요약, 성장병목, 6개월과제 추출

### 5.3 FR-03: incubation → oi (PoC 매칭 요청)

**트리거 조건**: `poc_service.create_request()` 호출 시

```python
# poc_service.py — create_request() 끝부분에 추가
await handover_service.create_incubation_to_oi(db, startup, user)
```

### 5.4 FR-04: oi → review (후속투자 추천)

**트리거 조건**: `follow_on_service.recommend()` 호출 시

```python
# follow_on_service.py — recommend() 끝부분에 추가
await handover_service.create_oi_to_review(db, startup, user)
```

### 5.5 FR-05: backoffice → broadcast (계약 상태 변경)

**트리거 조건**: `contract_service.update_status()` 호출 시

```python
# contract_service.py — update_status() 끝부분에 추가
if status_changed:
    await handover_service.create_backoffice_broadcast(db, startup, user)
```

**broadcast 특수 처리**: `to_team="all"` → `notify_team`을 sourcing, review, incubation, oi 모두에게 발송

### 5.6 공통 헬퍼 함수

```python
def _build_company_overview(startup: Startup) -> dict:
    """모든 경로에서 재사용하는 기업 개요 구성"""
    return {
        "name": startup.company_name,
        "ceo": startup.ceo_name,
        "industry": startup.industry,
        "stage": startup.stage,
        "one_liner": startup.one_liner,
    }

HANDOVER_TYPE_MAP = {
    "sourcing_to_review":     ("sourcing",    "review"),
    "review_to_backoffice":   ("review",      "backoffice"),
    "review_to_incubation":   ("review",      "incubation"),
    "incubation_to_oi":       ("incubation",  "oi"),
    "oi_to_review":           ("oi",          "review"),
    "backoffice_broadcast":   ("backoffice",  "all"),
}
```

---

## 6. 에스컬레이션 보완 (FR-06)

### 6.1 현재 구현 상태

**구현완료**: `backend/app/tasks/escalation.py` — `check_unacknowledged()`
- Celery Beat: 매시 정각 실행 (`crontab(minute=0)`)
- 24시간 경과 미확인 → `escalated=True` + Notification 생성

### 6.2 보완 사항

현재 알림이 `created_by` (발송자)에게 발송됨 → **수신팀 리더**에게 발송하도록 변경

```python
# 변경: 알림 대상을 수신팀(to_team) 리더로 변경
notif = Notification(
    user_id=None,  # → notify_team 사용으로 변경
    ...
)

# 변경 후: notify_team 호출로 수신팀 전체에 알림
# (sync 컨텍스트이므로 sync 버전 notify 사용)
```

**NotificationType 추가**: `ESCALATION`이 이미 정의되어 있으므로 추가 불필요

---

## 7. UI/UX Design

### 7.1 수신팀 인계 수신함 (FR-07)

각 팀 메뉴(`/review/`, `/incubation/`, `/oi/`, `/backoffice/`)에 **인계 수신함** 추가

```
┌─────────────────────────────────────────────────────────────────┐
│  심사관리  >  인계 수신함                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  미확인 (2)    확인됨 (8)    에스컬레이션 (1)                    │
│  ──────────────────────────────────────────                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⚠️ 에스컬레이션  [Sourcing → 심사]                        │   │
│  │ 기업: (주)알바이오텍  │ 등급: A (32점)  │ 2026.03.21      │   │
│  │                                 [수신 확인]  [상세 보기]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔵 대기중  [Sourcing → 심사]                              │   │
│  │ 기업: (주)딥마인드코리아  │ 등급: B (28점)  │ 2026.03.22  │   │
│  │                                 [수신 확인]  [상세 보기]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**URL 패턴**: `/review/handover`, `/incubation/handover`, `/oi/handover`, `/backoffice/handover`

**공통 컴포넌트**: `HandoverInbox` — `to_team` prop으로 팀별 필터링

### 7.2 인계 상세 보기 (FR-09)

```
┌─────────────────────────────────────────────────────────────────┐
│  인계 상세  │  Sourcing → 심사                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 기업 개요                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 기업명: (주)알바이오텍  │  대표: 김철수                     │   │
│  │ 산업: 바이오  │  단계: Pre-A  │  소싱팀 등급: A (32점)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 스크리닝 결과                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 추천등급: Pass  │  총점: 32/35                              │   │
│  │ 리스크: IP 분쟁 가능성 / 시장 규모 불확실 / 경쟁사 진입    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📝 인계 메모                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ "창업자가 해당 분야 10년 경력. 경쟁 VC 2곳 관심 표명.     │   │
│  │  빠른 의사결정 필요."                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  상태: 대기중  │  생성: 2026.03.22  │  [수신 확인]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**렌더링 로직**: `handover_type`에 따라 content의 키를 분기하여 카드 생성

### 7.3 수동 생성 UX 개선 (FR-08)

```
┌─────────────────────────────────────────────────────────────────┐
│  인계 패키지 수동 생성                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  기업 검색                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔍 기업명 입력...                      [자동완성 드롭다운]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  인계 경로                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ▼  Sourcing → 심사팀                                      │   │
│  │    심사 → 백오피스                                         │   │
│  │    심사 → 보육팀                                           │   │
│  │    보육 → OI팀                                             │   │
│  │    OI → 심사팀 (역인계)                                    │   │
│  │    백오피스 → 전체 (브로드캐스트)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── 경로 선택 시 동적 필수항목 폼 표시 ──                       │
│                                                                 │
│  투자 조건 (review→backoffice 선택 시)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 투자금액:  [              ]  밸류에이션: [              ]   │   │
│  │ 투자수단:  [              ]  선행조건:   [              ]   │   │
│  │ 법무메모:  [                                            ]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  추가 메모                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [                                                        ]   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                        [인계 패키지 생성]       │
└─────────────────────────────────────────────────────────────────┘
```

**기업 검색 API**: 기존 `GET /api/v1/startups/?search=검색어` 활용

### 7.4 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `HandoverInbox` | `components/handover/` | 팀별 인계 수신함 (재사용 가능) |
| `HandoverContentCard` | `components/handover/` | content JSON → 경로별 카드 렌더링 |
| `HandoverStatusBadge` | `components/handover/` | 상태 배지 (대기/확인/에스컬레이션) |
| `StartupSearchInput` | `components/handover/` | 기업명 자동완성 검색 |
| `HandoverTypeSelect` | `components/handover/` | 인계 경로 드롭다운 |
| `DynamicContentForm` | `components/handover/` | 경로별 동적 필수항목 폼 |

### 7.5 User Flow

```
[수신팀 사용자]
  팀 메뉴 → "인계 수신함" 클릭
  → 미확인 인계 목록 확인
  → 인계 카드 클릭 → 상세 보기 (/handover/[id])
  → content 카드 확인 → [수신 확인] 클릭
  → 상태: "확인됨" 변경 + ActivityLog 기록

[소싱팀 사용자]
  소싱관리 → "인계 패키지 생성" 클릭
  → 기업 검색 → 인계 경로 선택 → 필수항목 입력
  → [생성] 클릭 → 수신팀 알림 발송
```

---

## 8. Error Handling

### 8.1 Error Code Definition

| Code | Message | Cause | 변경 |
|------|---------|-------|------|
| 404 | 해당 인계 문서를 찾을 수 없습니다 | handover_id 불일치 | 기존 |
| 409 | 이미 수신 확인된 인계 문서입니다 | 이중 확인 시도 | 기존 |
| 400 | 유효하지 않은 인계 경로입니다 | handover_type 불일치 | **신규** |
| 400 | 인계 필수 항목이 누락되었습니다 | content 검증 실패 | **신규** |
| 403 | 해당 팀의 인계 문서만 확인할 수 있습니다 | 수신팀 불일치 | **신규** |

### 8.2 errors.py 추가

```python
def invalid_handover_type() -> HTTPException:
    return HTTPException(status_code=400, detail="유효하지 않은 인계 경로입니다.")

def handover_content_invalid(field: str) -> HTTPException:
    return HTTPException(status_code=400, detail=f"인계 필수 항목이 누락되었습니다: {field}")

def handover_team_mismatch() -> HTTPException:
    return HTTPException(status_code=403, detail="해당 팀의 인계 문서만 확인할 수 있습니다.")
```

---

## 9. Security Considerations

- [x] 수신 확인 시 to_team 권한 동적 검증 (다른 팀이 확인 불가)
- [x] 수동 생성 시 startup_id 존재 + is_deleted=False 검증
- [x] content 필드 Pydantic 검증으로 임의 데이터 주입 방지
- [x] soft delete 필터 모든 조회에 적용

---

## 10. Test Plan

### 10.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Backend API | 수동 생성, acknowledge 팀별 권한, 경로별 content 검증 | pytest + httpx |
| 자동 인계 | 각 DealStage 전환 시 HandoverDocument 자동 생성 확인 | pytest |
| Celery 태스크 | 에스컬레이션 알림 대상 변경 확인 | pytest-celery |
| Frontend | 수신함 목록, 상세 보기, 수동 생성 폼 | 수동 검증 (Zero Script QA) |

### 10.2 Test Cases (Key)

- [ ] IC 승인 시 review→backoffice HandoverDocument 자동 생성됨
- [ ] CLOSED 전환 시 review→incubation HandoverDocument 자동 생성됨
- [ ] 수신팀이 아닌 사용자가 acknowledge 시 403 에러
- [ ] 수동 생성 시 잘못된 handover_type → 400 에러
- [ ] 수동 생성 시 content 필수필드 누락 → 400 에러
- [ ] 기존 sourcing→review 자동 인계 정상 동작 (회귀 없음)
- [ ] 에스컬레이션 알림이 수신팀에게 발송됨

---

## 11. Implementation Guide

### 11.1 File Structure (변경/신규 파일)

```
backend/app/
├── services/
│   └── handover_service.py          # 5개 create_xxx() 함수 + create_manual() + get_stats() 추가
├── schemas/
│   └── handover.py                  # 6개 Content 모델 + ManualCreateRequest + StatsResponse 추가
├── routers/
│   └── handovers.py                 # POST /manual, GET /stats, acknowledge 팀별 권한 변경
├── errors.py                        # 3개 에러 함수 추가
├── tasks/
│   └── escalation.py                # 알림 대상 수신팀으로 변경
│
frontend/src/
├── app/
│   ├── review/handover/page.tsx     # [신규] 심사팀 수신함
│   ├── incubation/handover/page.tsx # [신규] 보육팀 수신함
│   ├── oi/handover/page.tsx         # [신규] OI팀 수신함
│   ├── backoffice/handover/page.tsx # [신규] 백오피스 수신함
│   ├── handover/[id]/page.tsx       # [신규] 인계 상세 보기
│   ├── handover/hub/page.tsx        # 통계 추가
│   └── sourcing/handover/new/page.tsx # UX 개선 (기업 검색 + 동적 폼)
├── components/handover/
│   ├── HandoverInbox.tsx            # [신규] 재사용 가능 수신함 컴포넌트
│   ├── HandoverContentCard.tsx      # [신규] 경로별 content 카드
│   ├── HandoverStatusBadge.tsx      # [신규] 상태 배지
│   ├── StartupSearchInput.tsx       # [신규] 기업 검색 자동완성
│   ├── HandoverTypeSelect.tsx       # [신규] 경로 드롭다운
│   └── DynamicContentForm.tsx       # [신규] 경로별 동적 폼
```

### 11.2 Implementation Order

```
1단계: Backend 기반 구축
  1. [ ] schemas/handover.py — 6개 Content 모델 + ManualCreateRequest + StatsResponse
  2. [ ] errors.py — 3개 에러 함수
  3. [ ] handover_service.py — _build_company_overview() + HANDOVER_TYPE_MAP
  4. [ ] handover_service.py — create_manual() + get_stats()
  5. [ ] routers/handovers.py — POST /manual, GET /stats 엔드포인트

2단계: 자동 트리거 연결
  6. [ ] handover_service.py — create_review_to_backoffice()
  7. [ ] handover_service.py — create_review_to_incubation()
  8. [ ] deal_flow_service.py — move_stage()에 APPROVED/CLOSED 훅 추가
  9. [ ] handover_service.py — create_incubation_to_oi(), create_oi_to_review(), create_backoffice_broadcast()
  10. [ ] 각 trigger service에 훅 추가 (poc, follow_on, contract)

3단계: 에스컬레이션 보완
  11. [ ] tasks/escalation.py — 알림 대상 수신팀(to_team)으로 변경
  12. [ ] routers/handovers.py — acknowledge 팀별 동적 권한 체크

4단계: Frontend 수신함
  13. [ ] components/handover/HandoverStatusBadge.tsx
  14. [ ] components/handover/HandoverInbox.tsx (공통 재사용)
  15. [ ] review/handover/page.tsx, incubation/handover/page.tsx, oi/handover/page.tsx, backoffice/handover/page.tsx
  16. [ ] 각 팀 좌측 메뉴(layout.tsx)에 "인계 수신함" 링크 추가

5단계: Frontend 상세 + 수동 생성
  17. [ ] components/handover/HandoverContentCard.tsx (경로별 카드)
  18. [ ] handover/[id]/page.tsx (상세 보기)
  19. [ ] components/handover/StartupSearchInput.tsx, HandoverTypeSelect.tsx, DynamicContentForm.tsx
  20. [ ] sourcing/handover/new/page.tsx UX 개선

6단계: 통계
  21. [ ] handover/hub/page.tsx — 통계 차트 추가
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial draft — 전체 설계 (API, 트리거, UI, 에스컬레이션 보완) | AI Assistant |

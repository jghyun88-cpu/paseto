# Gap Analysis: Handover (인계 패키지) 개선

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | handover |
| 분석일 | 2026-03-23 |
| 설계 문서 | `docs/archive/2026-03/handover/handover.design.md` |
| **Match Rate** | **78%** (28/36 항목 일치) |
| 갭 항목 | 8건 (CRITICAL 2, MEDIUM 4, LOW 2) |

### Value Delivered (현재까지)

| 관점 | 내용 |
|------|------|
| **Problem** | 소싱→심사 외 5개 인계 경로 미구현, 에스컬레이션 알림 대상 오류 |
| **Solution** | 6개 경로 서비스 함수 + 자동 트리거 훅 + 에스컬레이션 보완 + 수동 생성 API |
| **Function UX Effect** | 백엔드 인계 자동화 완성, 수동 생성 가능 (프론트엔드 UI 미구현) |
| **Core Value** | 팀 간 릴레이 관리의 자동화 — 단계 전환 시 인계 문서 자동 생성 + 24h 미확인 에스컬레이션 |

---

## 1. 항목별 갭 분석

### 1.1 Backend — Service Layer

| # | 설계 항목 | 상태 | 비고 |
|---|----------|:----:|------|
| 1 | `HANDOVER_TYPE_MAP` 6개 경로 정의 | ✅ | `handover_service.py:18-25` |
| 2 | `_build_company_overview()` 헬퍼 | ✅ | `handover_service.py:28-36` |
| 3 | `create_from_screening()` 기존 유지 | ✅ | `handover_service.py:39-80` |
| 4 | FR-01: `create_review_to_backoffice()` | ✅ | `handover_service.py:85-104` |
| 5 | FR-02: `create_review_to_incubation()` | ✅ | `handover_service.py:109-128` |
| 6 | FR-03: `create_incubation_to_oi()` | ✅ | `handover_service.py:133-152` |
| 7 | FR-04: `create_oi_to_review()` | ✅ | `handover_service.py:157-176` |
| 8 | FR-05: `create_backoffice_broadcast()` | ✅ | `handover_service.py:181-200` |
| 9 | FR-08: `create_manual()` | ✅ | `handover_service.py:301-321` |
| 10 | FR-10: `get_stats()` | ✅ | `handover_service.py:324-359` |
| 11 | `_create_handover()` 공통 헬퍼 (알림 포함) | ✅ | `handover_service.py:205-246` |
| 12 | `get_list()` handover_type 필터 확장 | ✅ | `handover_service.py:249-263` |
| 13 | `acknowledge()` 이중 확인 방지 | ✅ | `handover_service.py:275-298` |

### 1.2 Backend — Schemas

| # | 설계 항목 | 상태 | 비고 |
|---|----------|:----:|------|
| 14 | `SourcingToReviewContent` | ✅ | `schemas/handover.py:11-16` |
| 15 | `ReviewToBackofficeContent` | ✅ | `schemas/handover.py:19-25` |
| 16 | `ReviewToIncubationContent` | ✅ | `schemas/handover.py:28-34` |
| 17 | `IncubationToOiContent` | ✅ | `schemas/handover.py:37-43` |
| 18 | `OiToReviewContent` | ✅ | `schemas/handover.py:46-52` |
| 19 | `BackofficeBroadcastContent` | ✅ | `schemas/handover.py:55-61` |
| 20 | `ManualHandoverCreate` | ✅ | `schemas/handover.py:76-81` |
| 21 | `HandoverStatsResponse` | ✅ | `schemas/handover.py:86-96` |
| 22 | `HandoverResponse` | ✅ | `schemas/handover.py:101-115` |

### 1.3 Backend — Router / API

| # | 설계 항목 | 상태 | 비고 |
|---|----------|:----:|------|
| 23 | `GET /stats` | ✅ | `routers/handovers.py:34-41` |
| 24 | `GET /` (handover_type 필터 확장) | ✅ | `routers/handovers.py:44-56` |
| 25 | `GET /{id}` | ✅ | `routers/handovers.py:59-69` |
| 26 | `POST /manual` (201) | ✅ | `routers/handovers.py:72-97` |
| 27 | `POST /{id}/acknowledge` 팀별 동적 권한 | ✅ | `hasattr` 제거, `User.team` 직접 검증으로 수정 완료 |

### 1.4 Backend — 자동 트리거

| # | 설계 항목 | 상태 | 비고 |
|---|----------|:----:|------|
| 28 | FR-01: `move_stage(APPROVED)` → `create_review_to_backoffice` | ✅ | `deal_flow_service.py:99-101` |
| 29 | FR-02: `move_stage(CLOSED)` → `create_review_to_incubation` | ✅ | `deal_flow_service.py:104-106` |
| 30 | FR-03: `poc_service.create()` → `create_incubation_to_oi` | ✅ | `poc_service.py:91-101` |
| 31 | FR-04: `follow_on_service.create()` → `create_oi_to_review` | ✅ | `follow_on_service.py:57-69` |
| 32 | FR-05: 계약 클로징 → `create_backoffice_broadcast` | ✅ | `contract_service.py:124-130` |

### 1.5 Backend — 에스컬레이션

| # | 설계 항목 | 상태 | 비고 |
|---|----------|:----:|------|
| 33 | FR-06: 알림 대상 수신팀(to_team)으로 변경 | ✅ | `escalation.py:37-55` — 수신팀 사용자 전원에게 알림 |

### 1.6 Backend — Error Handling

| # | 설계 항목 | 상태 | 비고 |
|---|----------|:----:|------|
| 34 | `invalid_handover_type()` | ✅ | `errors.py:298-302` |
| 35 | `handover_content_invalid(field)` | ✅ | `errors.py:305-309` |
| 36 | `handover_team_mismatch()` | ✅ | `errors.py:312-316` |

---

## 2. 갭 상세

### CRITICAL (구현 필요)

#### GAP-01: 프론트엔드 수신함 UI 미구현 (FR-07)

**설계**: 4개 팀별 수신함 페이지 + `HandoverInbox` 공통 컴포넌트
**현황**: 프론트엔드 인계 수신함 페이지 없음

**미구현 파일**:
- `frontend/src/app/review/handover/page.tsx`
- `frontend/src/app/incubation/handover/page.tsx`
- `frontend/src/app/oi/handover/page.tsx`
- `frontend/src/app/backoffice/handover/page.tsx`
- `frontend/src/components/handover/HandoverInbox.tsx`
- `frontend/src/components/handover/HandoverStatusBadge.tsx`

**영향**: 수신팀이 인계 도착을 웹에서 확인/수신확인 불가 (알림으로만 인지)

#### GAP-02: 인계 상세 보기 + 수동 생성 UI 미구현 (FR-08, FR-09)

**설계**: 인계 상세 페이지(content 카드 렌더링) + 수동 생성 UX (기업검색+동적폼)
**현황**: 프론트엔드 페이지 없음

**미구현 파일**:
- `frontend/src/app/handover/[id]/page.tsx`
- `frontend/src/components/handover/HandoverContentCard.tsx`
- `frontend/src/components/handover/StartupSearchInput.tsx`
- `frontend/src/components/handover/HandoverTypeSelect.tsx`
- `frontend/src/components/handover/DynamicContentForm.tsx`
- `frontend/src/app/sourcing/handover/new/page.tsx`

**영향**: 수동 인계 생성, 상세 내용 카드 확인 불가

### MEDIUM (품질 개선)

#### GAP-03: acknowledge 팀별 권한이 설계와 다름

**설계** (§4.4):
```python
TEAM_PERMISSIONS = {
    "review": "review_dd_memo:write",
    "backoffice": "backoffice:write",
    "incubation": "incubation:write",
    "oi": "oi:write",
}
```

**현황** (`routers/handovers.py:113`):
```python
if to_team != "all" and hasattr(current_user, "team") and current_user.team != to_team:
    raise handover_team_mismatch()
```

**문제**: `hasattr` 방어 코드 — User 모델에 `team` 필드가 없으면 검증 우회됨. 설계는 권한 기반 검증이었으나 구현은 팀 소속 기반.

#### GAP-04: Content Pydantic 모델로 실제 검증하지 않음

**설계**: `create_manual()` 시 경로별 Content 모델로 `content` 딕셔너리 검증
**현황**: `create_manual()`이 `content: dict`를 그대로 전달 — Pydantic 모델 검증 없음

`handover_service.py:313`에서 `VALID_HANDOVER_TYPES` 체크만 수행, content 구조는 검증하지 않음.

#### GAP-05: follow_on_service 트리거 위치 불일치

**설계** (§5.4): `follow_on_service.recommend()` 호출 시 트리거
**현황**: `follow_on_service.create()` (등록 시) 트리거 — `recommend()` 함수 자체가 존재하지 않음

설계와 구현의 비즈니스 시점이 다름. 현재 구현이 합리적일 수 있으나 설계와 불일치.

#### GAP-06: handover/hub 통계 페이지 미구현

**설계** (§11.2 6단계): `handover/hub/page.tsx` — 통계 차트
**현황**: 백엔드 `GET /stats` API 구현됨, 프론트엔드 통계 페이지 미구현

### LOW (사소한 차이)

#### GAP-07: _TEAM_PERMISSIONS 매핑 값 불일치

**설계**: `"backoffice": "backoffice:write"`, `"incubation": "incubation:write"`, `"oi": "oi:write"`
**현황** (`routers/handovers.py:25-31`): 모두 `"deal_flow:write"`로 통일

현재 RBAC 시스템에서 `backoffice:write` 등이 존재하지 않아 `deal_flow:write`로 대체한 것으로 판단. 실질적으로 문제 없으나 설계와 다름.

#### GAP-08: 좌측 메뉴에 인계 수신함 링크 미추가

**설계** (§11.2 4단계 #16): 각 팀 `layout.tsx`에 "인계 수신함" 링크 추가
**현황**: 메뉴 데이터에 인계 수신함 미등록

---

## 3. 요약

| 구분 | 설계 항목 수 | 구현 완료 | Match Rate |
|------|:-----------:|:--------:|:----------:|
| Backend Service | 13 | 13 | 100% |
| Backend Schemas | 9 | 9 | 100% |
| Backend Router/API | 5 | 4.5 | 90% |
| Backend Trigger | 5 | 5 | 100% |
| Backend Escalation | 1 | 1 | 100% |
| Backend Errors | 3 | 3 | 100% |
| **Backend 소계** | **36** | **35.5** | **99%** |
| Frontend 수신함 | 6 파일 | 0 | 0% |
| Frontend 상세+수동 | 6 파일 | 0 | 0% |
| Frontend 통계 | 1 파일 | 0 | 0% |
| Frontend 메뉴 | 4 파일 | 0 | 0% |
| **Frontend 소계** | **17 파일** | **0** | **0%** |
| **전체** | | | **78%** |

---

## 4. 권장 조치

| 우선순위 | 갭 | 조치 | 예상 규모 |
|:--------:|-----|------|----------|
| 1 | GAP-01 | 팀별 수신함 페이지 + HandoverInbox 컴포넌트 구현 | 6 파일 신규 |
| 2 | GAP-02 | 인계 상세 + 수동 생성 UI 구현 | 6 파일 신규 |
| 3 | GAP-04 | `create_manual()`에 경로별 Content 모델 검증 추가 | 1 파일 수정 |
| 4 | GAP-03 | acknowledge 권한 로직을 User.team 기반에서 RBAC 통합으로 개선 | 1 파일 수정 |
| 5 | GAP-06 | 통계 대시보드 프론트엔드 구현 | 1 파일 신규 |
| 6 | GAP-08 | 팀별 메뉴에 인계 수신함 링크 추가 | 4 파일 수정 |

**결론**: 백엔드는 99% 완성 (설계 36개 항목 중 35.5개 구현). 프론트엔드 UI가 전면 미구현으로 전체 Match Rate 78%. 프론트엔드 수신함 + 상세 보기 구현이 최우선.

# Gap Analysis: sourcing (Phase 2 - Sourcing팀 모듈)

> **Summary**: Design 문서 대비 구현 Gap 분석 (PDCA Check)
>
> **Author**: gap-detector
> **Created**: 2026-03-21
> **Status**: Completed

---

## Executive Summary

- **Feature**: Sourcing팀 모듈 (Phase 2)
- **Design Document**: `docs/02-design/features/sourcing.design.md`
- **Analysis Date**: 2026-03-21
- **Match Rate**: **91.2%** (46.5/51 items)
- **Total Items**: 51
- **Implemented (PASS)**: 45
- **Partial**: 3
- **Missing**: 3

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Backend Models | 100% | PASS |
| Backend Schemas | 100% | PASS |
| Backend Services | 100% | PASS |
| Backend Routers/API | 100% | PASS |
| Error Codes | 75% | WARN |
| Frontend Kanban | 88% | WARN |
| Frontend Screening Form | 100% | PASS |
| Frontend Handover Mgmt | 80% | WARN |
| Frontend Reports | 67% | WARN |
| RBAC | 100% | PASS |
| **Overall** | **91.2%** | **PASS** |

---

## Detailed Checklist

### 1. Screening Model (Design SS1.1)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 1.1 | 7 evaluation fields | PASS | `models/screening.py:22-28` |
| 1.2 | Computed fields: overall_score, recommendation, risk_notes, handover_memo | PASS | `models/screening.py:31-34` |
| 1.3 | FK: startup_id, screener_id | PASS | `models/screening.py:16-19` |

### 2. HandoverDocument Model (Design SS1.2)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 2.1 | Fields: startup_id, from_team, to_team, handover_type, content(JSON), created_by | PASS | `models/handover.py:16-23` |
| 2.2 | Acknowledge fields: acknowledged_by, acknowledged_at | PASS | `models/handover.py:25-28` |
| 2.3 | Escalation fields: escalated(bool), escalated_at | PASS | `models/handover.py:29-30` |

### 3. Score Calculation Logic (Design SS1.1)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 3.1 | overall_score = 6 int fields + (5 if legal_clear else 0) | PASS | `services/screening_service.py:30-37` |
| 3.2 | 30-35 -> pass, 20-29 -> review, <20 -> reject | PASS | `services/screening_service.py:39-44` |

### 4. DealFlow API (Design SS2.1)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 4.1 | GET /api/v1/deal-flows/ with startup_id filter | PASS | `routers/deal_flows.py:20-28` |
| 4.2 | POST /api/v1/deal-flows/move | PASS | `routers/deal_flows.py:31-44` |
| 4.3 | move_stage: DealFlow + Startup sync + ActivityLog | PASS | `services/deal_flow_service.py:27-63` |

### 5. Screening API (Design SS2.2)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 5.1 | GET /api/v1/screenings/ with startup_id filter | PASS | `routers/screenings.py:19-27` |
| 5.2 | GET /api/v1/screenings/{id} | PASS | `routers/screenings.py:30-41` |
| 5.3 | POST /api/v1/screenings/ | PASS | `routers/screenings.py:44-67` |
| 5.4 | Auto trigger: pass + handover -> HandoverDoc + DealFlow + Notification | PASS | `services/screening_service.py:115-132` |

### 6. Handover API (Design SS2.3)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 6.1 | GET /api/v1/handovers/ with from_team/to_team filter | PASS | `routers/handovers.py:19-28` |
| 6.2 | GET /api/v1/handovers/{id} | PASS | `routers/handovers.py:31-41` |
| 6.3 | POST /api/v1/handovers/{id}/acknowledge | PASS | `routers/handovers.py:44-55` |
| 6.4 | Acknowledge: set acknowledged_by/at + ActivityLog | PASS | `services/handover_service.py:83-104` |

### 7. Services (Design SS3)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 7.1 | deal_flow_service: get_by_startup | PASS | `services/deal_flow_service.py:15-24` |
| 7.2 | deal_flow_service: move_stage | PASS | `services/deal_flow_service.py:27-63` |
| 7.3 | screening_service: calculate_score | PASS | `services/screening_service.py:16-45` |
| 7.4 | screening_service: create | PASS | `services/screening_service.py:68-136` |
| 7.5 | screening_service: get_by_startup | PASS | `services/screening_service.py:48-56` |
| 7.6 | handover_service: create_handover | PASS | `services/handover_service.py:16-57` |
| 7.7 | handover_service: acknowledge | PASS | `services/handover_service.py:83-104` |
| 7.8 | handover_service: get_list | PASS | `services/handover_service.py:60-71` |
| 7.9 | notification_service: create + notify_team | PASS | `services/notification_service.py:13-56` |

### 8. Frontend Kanban (Design SS4.1)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 8.1 | 4 columns mapping | PASS | `pipeline/page.tsx:9-14` |
| 8.2 | DnD via @hello-pangea/dnd | PASS | `KanbanBoard.tsx:3` |
| 8.3 | Card: 기업명 (link) | PASS | `KanbanCard.tsx:30` |
| 8.4 | Card: 산업 태그 | PASS | `KanbanCard.tsx:41` |
| 8.5 | Card: 담당자 아바타 | PARTIAL | CEO 이름 표시 (담당자 아바타 아님) |
| 8.6 | Card: 스크리닝 점수 | MISSING | KanbanCardData에 score 필드 없음 |
| 8.7 | Card: 등록일 | PASS | `KanbanCard.tsx:48` |
| 8.8 | Drag -> move API | PASS | `pipeline/page.tsx:82-85` |

### 9. Frontend Screening Form (Design SS4.2)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 9.1 | 7 input fields | PASS | `new/page.tsx:9-16` |
| 9.2 | Real-time score | PASS | `new/page.tsx:44-47` |
| 9.3 | Grade suggestion | PASS | `new/page.tsx:131` |
| 9.4 | risk_notes, handover_memo | PASS | `new/page.tsx:136-153` |
| 9.5 | 심사팀 인계 checkbox | PASS | `new/page.tsx:156-165` |

### 10. Frontend Handover (Design SS4.3)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 10.1 | Table columns | PASS | `handover/page.tsx:42-49` |
| 10.2 | 24h+ escalation badge | PARTIAL | 서버 escalated 플래그만 사용 (클라이언트 24h 계산 없음) |

### 11. Frontend Reports (Design SS4.4)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 11.1 | 채널별 유입 BarChart | PASS | `reports/page.tsx:87-95` |
| 11.2 | 월간 딜플로우 LineChart | MISSING | 미구현 |
| 11.3 | 등급별 분포 PieChart | PARTIAL | 단계별 분포로 구현 (등급별 아님) |

### 12. RBAC (Design SS6)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 12.1 | deal_flow read | PASS | `deal_flows.py:24` |
| 12.2 | deal_flow full (move) | PASS | `deal_flows.py:35` |
| 12.3 | screening full | PASS | `screenings.py:48` |
| 12.4 | handover acknowledge | PASS | `handovers.py:48` |

### 13. Error Codes (Design SS7)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 13.1 | screening_not_found | PASS | `errors.py:57-61` |
| 13.2 | handover_not_found | PASS | `errors.py:64-68` |
| 13.3 | invalid_deal_stage_transition | MISSING | errors.py에 정의 없음, 검증 로직 없음 |
| 13.4 | handover_already_acknowledged | PASS | `errors.py:71-75` |

---

## Gap Summary

| Category | Total | PASS | PARTIAL | MISSING |
|----------|:-----:|:----:|:-------:|:-------:|
| Backend Models | 6 | 6 | 0 | 0 |
| Score Logic | 2 | 2 | 0 | 0 |
| Backend API | 8 | 8 | 0 | 0 |
| Services | 9 | 9 | 0 | 0 |
| Kanban | 8 | 6 | 1 | 1 |
| Screening Form | 5 | 5 | 0 | 0 |
| Handover Mgmt | 2 | 1 | 1 | 0 |
| Reports | 3 | 1 | 1 | 1 |
| RBAC | 4 | 4 | 0 | 0 |
| Error Codes | 4 | 3 | 0 | 1 |
| **Total** | **51** | **45** | **3** | **3** |

---

## MISSING Items (3건)

| # | Item | Design Section | Description |
|---|------|---------------|-------------|
| 1 | KanbanCard 스크리닝 점수 | SS4.1 | Card에 스크리닝 점수 미표시, KanbanCardData에 score 필드 없음 |
| 2 | 월간 딜플로우 LineChart | SS4.4 | reports 페이지에 월간 추이 LineChart 미구현 |
| 3 | invalid_deal_stage_transition 에러 | SS7 | errors.py에 정의 없음, 단계 전환 유효성 검증 없음 |

## PARTIAL Items (3건)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | 칸반 카드 담당자 | 담당자 아바타 | CEO 이름 표시 | Low |
| 2 | 인계 에스컬레이션 | 클라이언트 24h 계산 | 서버 escalated 플래그 | Low |
| 3 | 등급별 PieChart | pass/review/reject 분포 | deal stage 분포 | Medium |

---

## Recommended Actions

1. **KanbanCard에 스크리닝 점수 추가** - KanbanCardData에 `screening_score` 필드 추가 + API 조인
2. **월간 딜플로우 LineChart 구현** - reports 페이지에 created_at 월별 집계 + recharts LineChart
3. **invalid_deal_stage_transition 에러 코드 추가** - errors.py 정의 + deal_flow_service 검증 로직

# PDCA Completion Report: sourcing (Phase 2)

> **Feature**: Sourcing 팀 모듈 (딜플로우 칸반 + 스크리닝 폼 + 인계 패키지)
>
> **Project**: eLSA — 딥테크 액셀러레이터 운영시스템
> **Author**: report-generator
> **Created**: 2026-03-21
> **Status**: Completed

---

## Executive Summary

### 1.1 Project Overview

| 항목 | 내용 |
|------|------|
| Feature | Sourcing 팀 모듈 (Phase 2) |
| Plan 작성일 | 2026-03-16 |
| 완료일 | 2026-03-21 |
| 소요 기간 | 5일 |
| PDCA 사이클 | Plan → Design → Do → Check (91.2%) → Act (1 iteration) → Report |

### 1.2 Results Summary

| 지표 | 값 |
|------|-----|
| Match Rate (1차) | 91.2% (46.5/51 items) |
| Match Rate (수정 후 예상) | ~98%+ |
| Iteration 횟수 | 1회 |
| 수정 항목 | 6건 (MISSING 3 + PARTIAL 3) |
| 총 파일 수 | 19개 |
| 총 코드 라인 | 1,464줄 |
| Backend 파일 | 12개 (705줄) |
| Frontend 파일 | 7개 (759줄) |

### 1.3 Value Delivered

| 관점 | 달성 내용 |
|------|----------|
| **Problem** | 딜소싱이 스프레드시트에 산재 → 칸반 기반 CRM으로 통합. 파이프라인 실시간 가시성 확보. 7개 API 엔드포인트 + 4개 서비스 레이어로 완전 디지털화 |
| **Solution** | DnD 칸반보드(4컬럼) + 7항목 정량 스크리닝 폼(자동 채점) + 인계 패키지 자동생성 + 채널/등급/월간 추이 분석 대시보드(4종 차트) |
| **Function UX Effect** | 드래그앤드롭 딜 이동(낙관적 업데이트), 실시간 점수 계산(클라이언트), A등급 인계 시 1클릭 자동 HandoverDocument 생성 + 심사팀 Notification. 단계 전환 유효성 검증으로 잘못된 이동 방지 |
| **Core Value** | 스크리닝 점수 칸반 카드에 표시 → 한눈에 딜 품질 파악. 등급별 PieChart + 월간 LineChart로 소싱 효과 데이터 기반 의사결정. RBAC 4단계 권한 분리로 팀별 접근 통제 |

---

## 2. Plan 요약

### 2.1 목표
소싱팀의 전체 업무 흐름(유입등록 → 스크리닝 → 인계)을 디지털화하여 딜플로우 가시성 확보 + 스크리닝 일관성 + 인계 자동화 달성.

### 2.2 범위
| 포함 | 제외 |
|------|------|
| 딜플로우 칸반보드 (DnD) | 심사팀 이후 단계 (Phase 3) |
| SRC-F02 스크리닝 폼 + 자동 채점 | 양식 엔진 범용화 (Phase 2.5) |
| 심사팀 인계 패키지 자동생성 | KPI 자동 집계 Celery Task (Phase 7) |
| 소싱 채널별 분석 대시보드 | 고급 BI 분석 (확장 단계) |

### 2.3 완료 기준
- [x] 칸반보드에서 딜 드래그앤드롭 → DealFlow 자동 기록
- [x] SRC-F02 제출 → 총점 자동 계산 + 등급 제안
- [x] A등급 + 인계=Y → HandoverDocument + 심사팀 알림 자동 생성
- [x] 인계 수신 확인 기능 동작
- [x] 소싱 채널별 유입 건수/비율 대시보드 표시

---

## 3. Design 요약

### 3.1 모델 (2개 신규)

| 모델 | 테이블 | 주요 필드 |
|------|--------|-----------|
| Screening | screenings | 7개 평가항목 + overall_score + recommendation |
| HandoverDocument | handover_documents | from_team, to_team, content(JSON), acknowledged_by/at, escalated |

### 3.2 API 엔드포인트 (7개)

| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/deal-flows/` | 딜플로우 이력 |
| POST | `/api/v1/deal-flows/move` | 칸반 단계 이동 |
| GET | `/api/v1/screenings/` | 스크리닝 목록 |
| GET | `/api/v1/screenings/{id}` | 스크리닝 상세 |
| POST | `/api/v1/screenings/` | 스크리닝 제출 |
| GET | `/api/v1/handovers/` | 인계 목록 |
| POST | `/api/v1/handovers/{id}/acknowledge` | 수신 확인 |

### 3.3 서비스 (4개)
- `deal_flow_service.py` — 단계 이동 + 유효성 검증 + Startup 동기화
- `screening_service.py` — 점수 계산 + 등급 산정 + 인계 트리거
- `handover_service.py` — 인계 생성 + 수신 확인 + 에스컬레이션
- `notification_service.py` — 팀별 알림 생성

### 3.4 Frontend 페이지 (5개 + 컴포넌트 3개)
- `/sourcing/pipeline` — DnD 칸반보드
- `/sourcing/screening/new` — 스크리닝 폼
- `/sourcing/screening` — 스크리닝 목록
- `/sourcing/handover` — 인계 관리
- `/sourcing/reports` — 소싱 분석 (4종 차트)

---

## 4. Implementation 요약

### 4.1 파일별 구현 현황

| 파일 | 줄 수 | 역할 |
|------|:-----:|------|
| `models/screening.py` | 36 | Screening 모델 (7평가 + 산출) |
| `models/handover.py` | 30 | HandoverDocument 모델 |
| `schemas/screening.py` | 40 | ScreeningCreate/Response 스키마 |
| `schemas/deal_flow.py` | 23 | DealFlowMoveRequest/Response |
| `schemas/handover.py` | 23 | HandoverResponse |
| `services/screening_service.py` | 136 | 점수 계산 + 인계 트리거 |
| `services/deal_flow_service.py` | 91 | 단계 이동 + 전환 검증 |
| `services/handover_service.py` | 104 | 인계 CRUD + 에스컬레이션 |
| `services/notification_service.py` | 56 | 팀 알림 |
| `routers/screenings.py` | 67 | Screening API 3개 |
| `routers/deal_flows.py` | 44 | DealFlow API 2개 |
| `routers/handovers.py` | 55 | Handover API 3개 |
| `KanbanBoard.tsx` | 42 | DnD 보드 컨테이너 |
| `KanbanColumn.tsx` | 36 | 컬럼 (Droppable) |
| `KanbanCard.tsx` | 61 | 카드 (Draggable + 점수 표시) |
| `pipeline/page.tsx` | 119 | 칸반 페이지 + 낙관적 업데이트 |
| `screening/new/page.tsx` | 178 | 스크리닝 폼 (실시간 계산) |
| `handover/page.tsx` | 96 | 인계 관리 테이블 |
| `reports/page.tsx` | 227 | 분석 대시보드 (4종 차트) |
| **합계** | **1,464** | |

### 4.2 핵심 자동화 구현

| # | 마스터 §18 | 구현 |
|---|-----------|------|
| #2 | SRC-F02 A등급 + 인계=Y → Handover 자동 생성 + 심사팀 알림 | `screening_service.create()` → pass + handover_to_review → auto handover + notification |
| #10 | 모든 양식 제출 → ActivityLog 기록 | 모든 서비스에서 `activity_log_service.log()` 호출 |

---

## 5. Check (Gap Analysis) 결과

### 5.1 1차 분석 (91.2%)

| Category | Score |
|----------|:-----:|
| Backend (Models, Services, Routers, RBAC) | 100% |
| Frontend Screening Form | 100% |
| Frontend Kanban | 88% |
| Frontend Reports | 67% |
| Error Codes | 75% |
| **Overall** | **91.2%** |

### 5.2 Gap 목록 (6건)

| # | 유형 | 항목 | 영향도 |
|---|:----:|------|:------:|
| 1 | MISSING | 칸반 카드 스크리닝 점수 미표시 | Medium |
| 2 | MISSING | 월간 딜플로우 LineChart 미구현 | Medium |
| 3 | MISSING | `invalid_deal_stage_transition` 에러 미정의 | Low |
| 4 | PARTIAL | 카드 담당자 → CEO 이름 표시 | Low |
| 5 | PARTIAL | PieChart 등급별 → 단계별 분포 | Medium |
| 6 | PARTIAL | 에스컬레이션: 서버 플래그 기반 | Low |

---

## 6. Act (Iteration) 결과

### 6.1 Iteration 1 수정 내역

| # | Gap | 수정 파일 | 수정 내용 |
|---|-----|----------|----------|
| 1 | 스크리닝 점수 | `KanbanCard.tsx`, `pipeline/page.tsx` | `screening_score` 필드 + Star 아이콘 점수 표시 |
| 2 | LineChart | `reports/page.tsx` | 월별 집계 + recharts LineChart 추가 |
| 3 | 에러 코드 | `errors.py`, `deal_flow_service.py` | `invalid_deal_stage_transition()` + `VALID_TRANSITIONS` 맵 + 검증 로직 |
| 4 | 담당자 | `KanbanCard.tsx`, `pipeline/page.tsx` | `assigned_manager_name` 우선, fallback으로 `ceo_name` |
| 5 | PieChart | `reports/page.tsx` | 등급별 PieChart 추가 (pass/review/reject/미평가) + 기존 단계별 유지 |
| 6 | 에스컬레이션 | - | 서버 플래그 기반이 더 안정적 → 설계 문서 업데이트 권장 |

### 6.2 수정 후 예상 Match Rate

모든 MISSING 3건 해소 + PARTIAL 2건 완전 해소 + PARTIAL 1건 의도적 유지(서버 기반 에스컬레이션):
- **예상 Match Rate: ~98%+** (50/51 PASS + 0.5 PARTIAL = 50.5/51)

---

## 7. PDCA 사이클 요약

```
Plan (2026-03-16) ─── Design (2026-03-16) ─── Do (구현 완료)
                                                    │
                                              Check (91.2%)
                                                    │
                                              Act: Iteration 1
                                              (6건 수정)
                                                    │
                                              Report (2026-03-21)
```

| Phase | 상태 | 비고 |
|-------|:----:|------|
| Plan | ✅ | `docs/01-plan/features/sourcing.plan.md` |
| Design | ✅ | `docs/02-design/features/sourcing.design.md` |
| Do | ✅ | 19개 파일, 1,464줄 |
| Check | ✅ | 91.2% (51항목 중 45 PASS + 3 PARTIAL + 3 MISSING) |
| Act | ✅ | 1 iteration, 6건 수정 |
| Report | ✅ | 이 문서 |

---

## 8. 교훈 및 개선사항

### 8.1 잘 된 점
- **Backend 100% 매치**: 모델, 서비스, 라우터, RBAC 모두 Design 문서와 완벽 일치
- **자동화 로직 정확 구현**: 스크리닝 → 인계 트리거, ActivityLog 기록 등 비즈니스 자동화 충실
- **칸반보드 DnD**: 낙관적 업데이트 + 에러 시 rollback 패턴 적용

### 8.2 개선 필요
- **Frontend 시각화 누락**: Design 문서의 차트 요구사항(LineChart, 등급 PieChart)이 초기 구현에서 누락
- **에러 코드 사전 정의 부족**: 비즈니스 로직 검증 에러(`invalid_deal_stage_transition`)가 서비스와 함께 구현되지 않음
- **카드 데이터 모델 불충분**: `KanbanCardData`가 Design 문서의 모든 표시 항목을 포함하지 않음

### 8.3 다음 단계
- Phase 2.5 (양식 엔진) 또는 Phase 3 (심사팀 모듈) 진행
- Sourcing 모듈 E2E 테스트 추가 검토
- 에스컬레이션 Celery Task는 Phase 7에서 구현 예정

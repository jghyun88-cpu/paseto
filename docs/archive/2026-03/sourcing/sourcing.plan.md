# Plan: Sourcing 팀 모듈 (Phase 2)

> **Feature**: sourcing
> **Author**: eLSA Dev Team
> **Created**: 2026-03-16
> **Status**: Draft
> **Phase**: Phase 2 — Sourcing팀 모듈

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 딜소싱 현황이 스프레드시트에 산재되어 실시간 파이프라인 가시성 없음, 1차 스크리닝이 정성적 판단에 의존하여 일관성 부족, 심사팀 인계 시 정보 누락 빈발 |
| **Solution** | 칸반 기반 딜플로우 CRM + 7개 항목 정량 스크리닝 폼 + 인계 패키지 자동생성 + 채널별 소싱 분석 대시보드 |
| **Function UX Effect** | 드래그앤드롭으로 딜 단계 이동, 스크리닝 점수 자동 계산 및 등급 제안, A등급 인계 시 1클릭으로 심사팀 알림 + 인계 문서 자동 생성 |
| **Core Value** | 고품질 딜 비율(유효 딜 60%+ 목표) 추적 가능, 채널별 ROI 분석으로 소싱 전략 데이터 기반 의사결정, 인계 미확인 24h 에스컬레이션으로 병목 제거 |

---

## 1. 목표 및 범위

### 1.1 Phase 2 목표
소싱팀의 전체 업무 흐름(유입등록 → 스크리닝 → 인계)을 디지털화하여, 딜플로우 가시성 확보 + 스크리닝 일관성 + 인계 자동화를 달성한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| 딜플로우 칸반보드 (DnD) | 심사팀 이후 단계 (Phase 3) |
| SRC-F02 스크리닝 폼 + 자동 채점 | 양식 엔진 범용화 (Phase 2.5) |
| 심사팀 인계 패키지 자동생성 | KPI 자동 집계 Celery Task (Phase 7) |
| 소싱 채널별 분석 기본 대시보드 | 고급 BI 분석 (확장 단계) |
| Handover 워크플로우 + 에스컬레이션 | 멀티 인계 경로 (Phase 7) |

### 1.3 완료 기준
- 칸반보드에서 딜 드래그앤드롭 → DealFlow 자동 기록
- SRC-F02 제출 → 총점 자동 계산 + 등급 제안
- A등급 + 인계=Y → HandoverDocument + 심사팀 알림 자동 생성
- 인계 수신 확인 기능 동작
- 소싱 채널별 유입 건수/비율 대시보드 표시

---

## 2. 기술 요구사항

### 2.1 Backend 신규 API (7개 엔드포인트)

| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/deal-flows/?startup_id={id}` | 딜플로우 이력 조회 | deal_flow: read |
| PATCH | `/api/v1/deal-flows/move` | 칸반 단계 이동 (DnD) | deal_flow: full |
| GET | `/api/v1/screenings/?startup_id={id}` | 스크리닝 결과 조회 | screening: read |
| POST | `/api/v1/screenings/` | 스크리닝 제출 (SRC-F02) | screening: full |
| GET | `/api/v1/handovers/` | 인계 목록 (from_team/to_team 필터) | deal_flow: read |
| POST | `/api/v1/handovers/` | 인계 생성 | deal_flow: full |
| POST | `/api/v1/handovers/{id}/acknowledge` | 인계 수신 확인 | review_dd_memo: write |

### 2.2 Backend 신규 모델 (Screening은 이미 정의됨, 마이그레이션 필요)

Phase 1에서 Screening, HandoverDocument 모델은 마스터 스펙에 정의되어 있으나 아직 구현 안 됨.

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| Screening | `models/screening.py` | startup_id, screener_id, 7개 평가점수, overall_score, recommendation, risk_notes, handover_memo |
| HandoverDocument | `models/handover.py` | startup_id, from_team, to_team, handover_type, content(JSON), acknowledged_by/at, escalated |

### 2.3 Backend 신규 서비스

| 서비스 | 파일 | 핵심 로직 |
|--------|------|-----------|
| screening_service | `services/screening_service.py` | 점수 자동 계산, 등급 산정, 인계 트리거 |
| deal_flow_service | `services/deal_flow_service.py` | 단계 이동 + DealFlow 기록 + Startup.current_deal_stage 동기화 |
| handover_service | `services/handover_service.py` | 인계 생성 + Notification + 에스컬레이션 로직 |
| notification_service | `services/notification_service.py` | 알림 생성 범용 함수 |

### 2.4 Frontend 신규 페이지 (5개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| 딜플로우 칸반보드 | `/sourcing/pipeline` | @hello-pangea/dnd 칸반 4컬럼 |
| 스크리닝 작성 | `/sourcing/screening/new?startup_id=` | 7항목 슬라이더 + 자동 총점 |
| 스크리닝 이력 | `/sourcing/screening` | 테이블 (기업별 스크리닝 결과) |
| 인계 관리 | `/sourcing/handover` | 인계 목록 + 확인 상태 |
| 소싱 분석 | `/sourcing/reports` | 채널별 차트 (recharts) |

### 2.5 Alembic 마이그레이션
- Screening 테이블 생성 (FK: startup_id, screener_id → users)
- HandoverDocument 테이블 생성 (FK: startup_id, created_by → users)

---

## 3. 핵심 자동화 (마스터 §18)

### 자동화 #1 (이미 구현)
SRC-F01 제출 → Startup + DealFlow(inbound) 자동 생성

### 자동화 #2 (Phase 2 구현)
SRC-F02 A등급 + 인계=Y → HandoverDocument 자동 생성 + 심사팀 Notification

### 자동화 #10 (공통)
모든 양식 제출 → ActivityLog 자동 기록

---

## 4. 구현 순서

```
Step 1: Screening + HandoverDocument 모델 생성 + Alembic 마이그레이션
Step 2: notification_service + deal_flow_service 생성
Step 3: screening_service + handover_service 생성 (자동화 #2 포함)
Step 4: routers/screenings.py + routers/deal_flows.py + routers/handovers.py
Step 5: main.py에 3개 라우터 등록 + Backend 검증
Step 6: Frontend 칸반보드 (/sourcing/pipeline) — @hello-pangea/dnd
Step 7: Frontend 스크리닝 폼 (/sourcing/screening/new)
Step 8: Frontend 인계 관리 + 소싱 분석 페이지
Step 9: 통합 테스트 + Gap 분석
```

---

## 5. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| @hello-pangea/dnd 칸반 성능 | 딜 100건+ 시 느려질 수 있음 | 가상화(virtualization) 적용 검토 |
| 스크리닝 점수 기준 변경 요청 | 하드코딩 시 유연성 부족 | 점수 산정 로직을 서비스 레이어에 분리 |
| 인계 에스컬레이션 타이밍 | Celery Beat 미설정 시 미동작 | Phase 2에서는 수동 체크, Phase 7에서 Celery 자동화 |

---

## 6. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1 (인프라 + 인증 + Startup CRUD) | ✅ 완료 (95%) |
| Startup 모델 (§38 필드 포함) | ✅ 구현됨 |
| DealFlow 모델 | ✅ 구현됨 |
| Notification 모델 | ✅ 구현됨 |
| ActivityLog 서비스 | ✅ 구현됨 |
| @hello-pangea/dnd 패키지 | ⏳ 설치 필요 |

---

## 7. 파일 목록 (예상)

### Backend (신규 12파일)
```
backend/app/models/screening.py
backend/app/models/handover.py
backend/app/schemas/screening.py
backend/app/schemas/deal_flow.py
backend/app/schemas/handover.py
backend/app/schemas/notification.py
backend/app/services/screening_service.py
backend/app/services/deal_flow_service.py
backend/app/services/handover_service.py
backend/app/services/notification_service.py
backend/app/routers/screenings.py
backend/app/routers/deal_flows.py
backend/app/routers/handovers.py
```

### Frontend (신규 5+페이지)
```
frontend/src/app/sourcing/pipeline/page.tsx
frontend/src/app/sourcing/screening/page.tsx
frontend/src/app/sourcing/screening/new/page.tsx
frontend/src/app/sourcing/handover/page.tsx
frontend/src/app/sourcing/reports/page.tsx
frontend/src/components/kanban/KanbanBoard.tsx
frontend/src/components/kanban/KanbanColumn.tsx
frontend/src/components/kanban/KanbanCard.tsx
```

### 수정
```
backend/app/models/__init__.py (Screening, HandoverDocument 추가)
backend/app/main.py (3개 라우터 등록)
backend/app/errors.py (screening/handover 에러 추가)
```

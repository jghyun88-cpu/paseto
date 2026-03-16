# Plan: 팀간 연결 + 고도화 (Phase 7)

> **Feature**: phase7-integration
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 7 — 팀간 연결 + Celery 고도화

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 팀간 인계가 구두/메신저 기반으로 누락·지연 빈발, 정기 회의 안건·액션아이템이 별도 관리되어 추적 불가, KPI 집계·위기 감지·보고 리마인더가 수동이라 대응 지연, 전사 현황 파악에 각 팀 별도 확인 필요 |
| **Solution** | 인계 허브(6경로 + 24h 에스컬레이션) + 회의체 관리(7종) + Celery Beat 4개 주기적 작업(KPI 집계/보고 리마인더/에스컬레이션/위기 스캔) + 통합 대시보드(8대 KPI + 위기 감지) |
| **Function UX Effect** | 인계 수신 확인 1클릭, 미확인 24h 자동 에스컬레이션, 회의 안건→액션아이템 자동 추적, 보고 마감 D-7/D-3/당일 자동 알림, 전사 KPI 한 화면 |
| **Core Value** | 인계 누락 0건 목표, 미확인 인계 24h 내 해소율 95%+, 보고 정시율 95%+, 위기 신호 당일 감지·대응, 전사 의사결정 데이터 기반화 |

---

## 1. 목표 및 범위

### 1.1 Phase 7 목표
Phase 1~6에서 구축한 각 팀 모듈을 **하나의 파이프라인으로 연결**하고, **Celery 기반 자동화**로 운영 효율을 극대화한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| 인계 허브 완성 (6경로 + 에스컬레이션) | 외부 메신저 연동 (Slack/Teams) |
| 회의체 관리 시스템 (Meeting CRUD + 7종) | 화상회의 연동 |
| Celery Beat 4개 주기적 작업 | 복잡한 ML 기반 위기 예측 |
| 통합 대시보드 (대표/파트너용) | 팀별 상세 KPI 대시보드 (Phase 8) |
| 알림 센터 UI | 이메일/SMS 발송 (확장 단계) |

### 1.3 완료 기준
- 인계 목록에서 from_team/to_team/handover_type 필터 + acknowledge 기능
- 미확인 인계 24h 경과 시 ESCALATION 알림 자동 생성 (Celery)
- 회의 등록/조회/회의록 작성/액션아이템 관리 기능
- 4개 Celery Beat 작업 정상 동작
- 통합 대시보드에서 8대 KPI + 위기 알림 + 최근 인계 + 회의 일정 표시

---

## 2. 기술 요구사항

### 2.1 Backend 신규 모델 (1개)

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| Meeting | `models/meeting.py` | meeting_type(MeetingType), title, scheduled_at, duration_minutes, attendees(JSON), agenda_items(JSON), minutes, action_items(JSON), related_startup_ids(JSON), created_by |

> HandoverDocument, Notification 모델은 이미 구현됨. 기능 확장만 필요.

### 2.2 Backend 신규 API (14개 엔드포인트)

#### Meeting (5개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/meetings/` | 회의 목록 (유형·기간 필터) |
| GET | `/api/v1/meetings/{id}` | 회의 상세 |
| POST | `/api/v1/meetings/` | 회의 등록 |
| PUT | `/api/v1/meetings/{id}` | 회의 수정 (회의록, 액션아이템) |
| DELETE | `/api/v1/meetings/{id}` | 회의 삭제 (soft) |

#### Notification 확장 (3개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/notifications/` | 내 알림 목록 (유형·읽음 필터) |
| PATCH | `/api/v1/notifications/{id}/read` | 알림 읽음 처리 |
| PATCH | `/api/v1/notifications/read-all` | 전체 읽음 처리 |

#### Dashboard (2개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/dashboard/executive` | 통합 대시보드 (8대 KPI + 위기) |
| GET | `/api/v1/dashboard/timeline/{startup_id}` | 기업 타임라인 (ActivityLog) |

#### Handover 확장 (2개, 기존 라우터에 추가)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/handovers/hub` | 인계 허브 (전체 팀간 인계 현황) |
| GET | `/api/v1/handovers/pending` | 미확인 인계 목록 |

#### Celery Task 트리거 (2개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| POST | `/api/v1/admin/tasks/escalation-check` | 수동 에스컬레이션 체크 트리거 |
| POST | `/api/v1/admin/tasks/crisis-scan` | 수동 위기 스캔 트리거 |

### 2.3 Backend Celery Tasks (4개 신규)

| 파일 | 작업 | 주기 |
|------|------|------|
| `tasks/kpi_aggregation.py` | 전체 포트폴리오 KPI 월간 집계 | 매월 1일 02:00 |
| `tasks/report_reminders.py` | 보고 마감 리마인더 (D-7/D-3/당일) | 매일 09:00 |
| `tasks/escalation.py` | 미확인 인계 에스컬레이션 | 매시간 정각 |
| `tasks/crisis_scan.py` | 위기 신호 스캔 (runway, KPI 하락, 인력이탈) | 매일 08:00 |

### 2.4 Backend 신규 서비스 (3개)

| 서비스 | 파일 | 핵심 로직 |
|--------|------|-----------|
| meeting_service | `services/meeting_service.py` | 회의 CRUD, 액션아이템 추적 |
| dashboard_service | `services/dashboard_service.py` | 8대 KPI 집계, 위기 감지, 최근 인계/회의 |
| handover_hub_service | `services/handover_hub_service.py` | 인계 허브 현황, 미확인 목록, 에스컬레이션 로직 확장 |

### 2.5 Frontend 신규 페이지 (5개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| 통합 대시보드 | `/dashboard` (메인) | 8대 KPI 카드 + 위기 알림 + 회의 위젯 + 인계 현황 |
| 인계 허브 | `/handover/hub` | 팀간 인계 플로우 + 필터 + 에스컬레이션 표시 |
| 회의 관리 | `/meetings` | 회의 목록 + 등록 폼 + 캘린더 뷰 |
| 회의 상세 | `/meetings/[id]` | 안건 + 회의록 + 액션아이템 |
| 알림 센터 | `/notifications` | 유형별 필터 + 읽음 처리 + 관련 링크 |

---

## 3. 핵심 자동화 (마스터 §18)

### 자동화 #9 (Phase 7 구현)
OPS-F02 마감 7일전/3일전/당일 → 자동 리마인더
- `tasks/report_reminders.py`에서 매일 09:00 실행
- REPORT_DEADLINE 알림 생성

### 인계 에스컬레이션 (Phase 7 구현)
미확인 인계 24h 경과 → ESCALATION 알림
- `tasks/escalation.py`에서 매시간 실행
- from_team + to_team 리더 + 대표에게 발송

### 위기 스캔 (Phase 7 구현)
매일 08:00 전체 포트폴리오 스캔
- runway < 3개월 → CRISIS_ALERT
- headcount 20%+ 감소 → CRISIS_ALERT
- customer_count 20%+ 감소 → CRISIS_ALERT

---

## 4. 구현 순서

```
Step 1: Meeting 모델 생성 + Alembic 마이그레이션
Step 2: Meeting 스키마 + 서비스 + 라우터
Step 3: Notification 라우터 확장 (읽음 처리)
Step 4: Handover 라우터 확장 (hub, pending)
Step 5: Celery Task 4개 구현 (kpi_aggregation, report_reminders, escalation, crisis_scan)
Step 6: Dashboard 서비스 + 라우터 (8대 KPI + 위기 감지)
Step 7: main.py 라우터 등록 + errors.py
Step 8: Frontend 통합 대시보드 + 알림 센터
Step 9: Frontend 인계 허브 + 회의 관리
Step 10: 통합 테스트 + Gap 분석
```

---

## 5. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Celery/Redis 미가동 시 자동화 불가 | 알림 미발송, KPI 미집계 | Docker Compose에 celery_worker + celery_beat 서비스 포함, 수동 트리거 API 제공 |
| 통합 대시보드 쿼리 성능 | 데이터 증가 시 느려질 수 있음 | 캐시(Redis) 적용, 집계 결과 저장 |
| 에스컬레이션 과다 알림 | 동일 인계에 반복 알림 | escalated=True 플래그로 1회만 에스컬레이션 |

---

## 6. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1~6 (모든 팀 모듈) | ✅ 완료 |
| HandoverDocument 모델 | ✅ 구현됨 |
| Notification 모델 + 서비스 | ✅ 구현됨 |
| ActivityLog 서비스 | ✅ 구현됨 |
| MeetingType Enum | ✅ 정의됨 (enums.py) |
| NotificationType Enum (8종) | ✅ 정의됨 |
| Redis (Celery broker) | ⏳ Docker Compose에 정의됨, 실행 필요 |
| Celery + celery_beat | ⏳ requirements.txt에 포함, 설정 필요 |

---

## 7. 파일 목록 (예상)

### Backend 신규 (12파일)
```
backend/app/models/meeting.py
backend/app/schemas/meeting.py
backend/app/schemas/dashboard.py
backend/app/services/meeting_service.py
backend/app/services/dashboard_service.py
backend/app/services/handover_hub_service.py
backend/app/routers/meetings.py
backend/app/routers/dashboard.py
backend/app/tasks/kpi_aggregation.py
backend/app/tasks/report_reminders.py
backend/app/tasks/escalation.py
backend/app/tasks/crisis_scan.py
```

### Backend 수정 (5파일)
```
backend/app/models/__init__.py (Meeting 추가)
backend/app/main.py (meetings, dashboard 라우터 등록)
backend/app/errors.py (meeting_not_found 추가)
backend/app/routers/handovers.py (hub, pending 엔드포인트 추가)
backend/app/routers/__init__.py (notifications 라우터 확장)
backend/app/tasks/__init__.py (Celery app + Beat 스케줄)
```

### Frontend 신규 (5페이지)
```
frontend/src/app/dashboard/page.tsx
frontend/src/app/handover/hub/page.tsx
frontend/src/app/meetings/page.tsx
frontend/src/app/meetings/[id]/page.tsx
frontend/src/app/notifications/page.tsx
```

### Frontend 수정 (1파일)
```
frontend/src/lib/types.ts (Meeting, Dashboard 타입 추가)
```

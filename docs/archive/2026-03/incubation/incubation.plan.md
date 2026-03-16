# Plan: 보육팀 모듈 (Phase 5)

> **Feature**: incubation
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 5 — 보육팀 모듈

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 포트폴리오 기업 관리가 스프레드시트+구두 기반으로 성장 병목 파악·추적 불가, 멘토링이 이벤트성으로 끝나 액션아이템 이행률 0%, KPI가 월말 한 번 정성 리뷰로 위기 신호 감지 3개월 이상 지연 |
| **Solution** | 포트폴리오 대시보드(등급·위기 자동 하이라이트) + 온보딩 체크리스트(PRG-F01) + 90일 액션플랜(PRG-F02) + 멘토링 실행관리(PRG-F03, 액션아이템 이행률 자동추적) + KPI 트래커(PRG-F04, 3개월 하락 경보) + IR/DemoDay 관리 |
| **Function UX Effect** | 포트폴리오 카드에 등급(A~D)·KPI 스파크라인·위기 플래그 원클릭 확인, 멘토링 기록 시 액션아이템 자동 Task 등록+기한 알림, KPI 입력 시 전월 대비 증감·달성률 자동 계산 |
| **Core Value** | KPI 개선 기업 비율 70%+ 목표 추적, 멘토링 액션아이템 이행률 75%+ 실시간 모니터링, 위기 신호 즉시 감지(runway<3개월, KPI 3개월 연속 하락)로 조기 대응, 후속 투자미팅 발생률 60%+ 추적 |

---

## 1. 목표 및 범위

### 1.1 Phase 5 목표
보육팀의 전체 업무 흐름(온보딩 → 진단 → 액션플랜 → 멘토링 → KPI 관리 → IR/DemoDay)을 디지털화하여, **성장 병목의 가시화 + 멘토링 실행관리 + 위기 조기 감지**를 달성한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| 포트폴리오 대시보드 (등급, KPI 스파크라인, 위기 하이라이트) | KPI 자동 집계 Celery Task (Phase 7) |
| 온보딩 워크플로우 (PRG-F01) | 양식 엔진 범용화 (Phase 2.5에서 구현) |
| 90일 액션플랜 빌더 (PRG-F02) | 팀간 인계 허브 통합 (Phase 7) |
| 멘토링 실행관리 (PRG-F03) + 액션아이템 이행 추적 | 후속투자 파이프라인 (Phase 6 OI팀 연동) |
| KPI 트래커 (PRG-F04) + 3개월 하락 경보 | 고급 위기 자동감지 Celery Task (Phase 7) |
| DemoDay 관리 + IR 정비 체크리스트 | 외부 투자자 포털 (확장 단계) |
| 투자자 미팅 기록 + 후속 추적 | 만족도 설문 시스템 (확장 단계) |
| 멘토 풀 관리 (CRUD, Mentor 모델 이미 존재) | 멘토 자동 매칭 추천 (확장 단계) |

### 1.3 완료 기준
- 포트폴리오 대시보드에 기업 카드(등급, KPI 스파크라인, 전담 PM, 위기 플래그) 표시
- PRG-F01 온보딩 제출 → Incubation 레코드 생성 + 진단 7개 항목 저장
- PRG-F02 액션플랜 저장 → Incubation.action_plan JSON 저장 + 기한별 알림 등록
- PRG-F03 멘토링 기록 → MentoringSession 저장 + 액션아이템 Task 자동 등록
- PRG-F04 KPI 입력 → KPIRecord 저장 + 전월 대비 증감/달성률 자동 계산
- KPI 3개월 연속 하락 시 KPI_WARNING 알림 생성
- DemoDay 생성 + 스타트업별 IR 정비 체크리스트 관리
- 투자자 미팅 기록 + 후속 추적 (outcome 관리)

---

## 2. 기술 요구사항

### 2.1 Backend 신규 API (21개 엔드포인트)

#### Incubation (6개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/incubations/` | 포트폴리오 목록 (등급·상태 필터) | incubation: read |
| GET | `/api/v1/incubations/{id}` | 포트폴리오 상세 | incubation: read |
| POST | `/api/v1/incubations/` | 온보딩 생성 (PRG-F01) | incubation: full |
| PUT | `/api/v1/incubations/{id}` | 온보딩 정보 수정 | incubation: full |
| PATCH | `/api/v1/incubations/{id}/grade` | 포트폴리오 등급 변경 | incubation: full (PM/Partner만) |
| PATCH | `/api/v1/incubations/{id}/action-plan` | 90일 액션플랜 저장/수정 (PRG-F02) | incubation: full |

#### MentoringSession (5개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/mentoring-sessions/` | 멘토링 세션 목록 (startup_id 필터) | mentoring: read |
| GET | `/api/v1/mentoring-sessions/{id}` | 멘토링 세션 상세 | mentoring: read |
| POST | `/api/v1/mentoring-sessions/` | 멘토링 기록 생성 (PRG-F03) | mentoring: full |
| PUT | `/api/v1/mentoring-sessions/{id}` | 멘토링 기록 수정 | mentoring: full |
| PATCH | `/api/v1/mentoring-sessions/{id}/action-items` | 액션아이템 상태 업데이트 | mentoring: full |

#### KPIRecord (4개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/kpi-records/` | KPI 기록 목록 (startup_id, period 필터) | kpi: read |
| GET | `/api/v1/kpi-records/{startup_id}/trend` | KPI 트렌드 (최근 N개월) | kpi: read |
| POST | `/api/v1/kpi-records/` | 월간 KPI 입력 (PRG-F04) | kpi: full |
| PUT | `/api/v1/kpi-records/{id}` | KPI 기록 수정 | kpi: full |

#### DemoDay (3개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/demo-days/` | 데모데이 목록 | incubation: read |
| POST | `/api/v1/demo-days/` | 데모데이 생성 | incubation: full |
| PUT | `/api/v1/demo-days/{id}` | 데모데이 수정 (체크리스트 업데이트 포함) | incubation: full |

#### InvestorMeeting (3개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/investor-meetings/` | 투자자 미팅 목록 (startup_id, demo_day_id 필터) | incubation: read |
| POST | `/api/v1/investor-meetings/` | 투자자 미팅 기록 | incubation: full |
| PUT | `/api/v1/investor-meetings/{id}` | 투자자 미팅 수정 | incubation: full |

### 2.2 Backend 신규 모델 (5개)

Mentor, Batch 모델은 Phase 1에서 이미 생성됨. 아래 5개 모델 신규 생성 필요:

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| Incubation | `models/incubation.py` | startup_id, batch_name, program_start/end, assigned_pm_id, diagnosis(JSON), action_plan(JSON), growth_bottleneck, portfolio_grade, status, crisis_flags(JSON) |
| MentoringSession | `models/mentoring_session.py` | startup_id, mentor_id(nullable FK→mentors), mentor_name, mentor_type, session_date, pre_agenda, discussion_summary, feedback, action_items(JSON), action_completion_rate, pm_confirmed_by |
| KPIRecord | `models/kpi_record.py` | startup_id, period(YYYY-MM), period_type, revenue, customer_count, active_users, poc_count, repurchase_rate, release_velocity, cac, ltv, pilot_conversion_rate, mou_to_contract_rate, headcount, runway_months, follow_on_meetings, notes |
| DemoDay | `models/demo_day.py` | batch_name, event_date, invited_investors(JSON), startup_readiness(JSON), status, follow_up_deadline |
| InvestorMeeting | `models/investor_meeting.py` | startup_id, demo_day_id(nullable), investor_name, investor_company, investor_type, meeting_date, meeting_type, outcome, materials_sent(JSON), next_step, notes |

### 2.3 Backend 신규 서비스 (5개)

| 서비스 | 파일 | 핵심 로직 |
|--------|------|-----------|
| incubation_service | `services/incubation_service.py` | 온보딩 생성, 등급 변경(ActivityLog 기록), 액션플랜 저장, 위기 플래그 수동 업데이트 |
| mentoring_service | `services/mentoring_service.py` | 세션 기록, 액션아이템 Task 자동 등록, 이행률 자동 계산 |
| kpi_service | `services/kpi_service.py` | KPI 입력, 전월 대비 증감 계산, 3개월 연속 하락 감지 → KPI_WARNING 알림 |
| demo_day_service | `services/demo_day_service.py` | 데모데이 관리, IR 체크리스트, 후속추적 deadline 관리 |
| investor_meeting_service | `services/investor_meeting_service.py` | 미팅 기록, outcome 추적 |

### 2.4 Frontend 신규 페이지 (8개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| 포트폴리오 대시보드 | `/incubation` | 기업 카드 그리드 (등급 배지, KPI 스파크라인, 위기 하이라이트) |
| 온보딩 (PRG-F01) | `/incubation/onboarding/new?startup_id=` | 진단 7개 항목 폼 + 자동 필드 |
| 90일 액션플랜 (PRG-F02) | `/incubation/[id]/action-plan` | 5영역 테이블 (제품/고객/매출/투자/조직) + 간트차트 |
| 멘토링 관리 (PRG-F03) | `/incubation/[id]/mentoring` | 세션 목록 + 기록 폼 + 액션아이템 이행 체크 |
| KPI 트래커 (PRG-F04) | `/incubation/[id]/kpi` | 12개 지표 입력 + 트렌드 차트 (recharts) |
| 멘토 풀 관리 | `/incubation/mentors` | 멘토 목록 + CRUD |
| DemoDay 관리 | `/incubation/demo-days` | 데모데이 목록 + IR 체크리스트 |
| 투자자 미팅 기록 | `/incubation/[id]/investor-meetings` | 미팅 이력 + 후속 추적 |

### 2.5 Alembic 마이그레이션
- Incubation 테이블 생성 (FK: startup_id → startups, assigned_pm_id → users)
- MentoringSession 테이블 생성 (FK: startup_id → startups, mentor_id → mentors)
- KPIRecord 테이블 생성 (FK: startup_id → startups)
- DemoDay 테이블 생성
- InvestorMeeting 테이블 생성 (FK: startup_id → startups, demo_day_id → demo_days)
- Batch.demo_day_id FK 연결 (demo_days 테이블 생성 후)

---

## 3. 핵심 자동화 (마스터 §18)

### 자동화 #4 (Phase 5 구현)
INV-F03 승인 → PRG-F01 온보딩시트 자동 생성 (OPS-F01과 동시)
- IC 승인 시 Incubation 레코드(status=onboarding) 자동 생성
- 보육팀 PM에게 온보딩 시작 알림 발송

### 자동화 #6 (Phase 5 구현)
PRG-F03 액션아이템 → Task 자동 등록 + 기한 알림
- 멘토링 기록 저장 시 action_items 각각 Notification 생성
- 기한 D-3, D-1, 당일 자동 리마인더 (Phase 7 Celery 연동 전까지 수동 체크)

### 자동화 #7 (Phase 5 구현)
PRG-F04 KPI 3개월 연속 하락 → 위기 알림 + 포트폴리오 등급 재검토 트리거
- KPI 저장 시 최근 3개월 트렌드 자동 검사
- 하락 감지 시 KPI_WARNING 알림 + crisis_flags 업데이트

### 자동화 #10 (공통)
모든 양식 제출 → ActivityLog 자동 기록

---

## 4. 구현 순서

```
Step 1: Incubation + MentoringSession + KPIRecord + DemoDay + InvestorMeeting 모델 생성
Step 2: Alembic 마이그레이션 (5개 테이블 + Batch FK 수정)
Step 3: Pydantic v2 스키마 생성 (5개 모델 × Create/Update/Response)
Step 4: incubation_service + mentoring_service + kpi_service 생성 (자동화 #4, #6, #7 포함)
Step 5: demo_day_service + investor_meeting_service 생성
Step 6: 5개 라우터 생성 + main.py 등록 + Backend API 검증
Step 7: Frontend 포트폴리오 대시보드 (/incubation)
Step 8: Frontend 온보딩(PRG-F01) + 액션플랜(PRG-F02)
Step 9: Frontend 멘토링 관리(PRG-F03) + KPI 트래커(PRG-F04) — recharts 활용
Step 10: Frontend DemoDay + 투자자 미팅 + 멘토 풀 관리
Step 11: 통합 테스트 + Gap 분석
```

---

## 5. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| KPI 지표 12개 입력 부담 | 사용자가 월간 입력을 누락할 수 있음 | 필수 지표 5개만 required, 나머지 optional 처리 |
| KPI 3개월 하락 판정 기준 모호 | 모든 지표가 하락해야 하는지, 일부만 해당하는지 | revenue + customer_count + runway_months 3개 중 1개라도 3개월 연속 하락 시 경보 |
| 멘토링 액션아이템 이행 추적 복잡도 | Task 시스템과 중복 가능 | Phase 5에서는 MentoringSession.action_items JSON 내부에서 관리, Phase 7에서 Task 테이블 연동 |
| 스파크라인 차트 데이터 부족 | 신규 기업은 KPI 이력 없음 | 3개월 미만 데이터 시 "데이터 축적 중" 표시 |
| DemoDay 후속추적 기간(4~8주) 관리 | 수동 관리 시 누락 가능 | follow_up_deadline 기반 알림, Phase 7에서 Celery Beat 자동화 |
| 포트폴리오 등급 자동 제안 정확도 | 알고리즘이 실제 상황 반영 못 할 수 있음 | 자동 제안은 참고용, 실제 변경은 PM/Partner 수동 승인 필수 |

---

## 6. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1 (인프라 + 인증 + Startup CRUD) | ✅ 완료 |
| Startup 모델 | ✅ 구현됨 |
| Mentor 모델 (models/mentor.py) | ✅ 구현됨 |
| Batch 모델 (models/batch.py) | ✅ 구현됨 |
| Notification 모델 + 서비스 | ✅ 구현됨 |
| ActivityLog 서비스 | ✅ 구현됨 |
| PortfolioGrade Enum | ✅ 정의됨 (enums.py) |
| NotificationType.KPI_WARNING / CRISIS_ALERT | ✅ 정의됨 (enums.py) |
| recharts 패키지 | ⏳ 확인 필요 |
| Phase 4 (백오피스 — 계약 클로징) | 🔄 자동화 #4 연동 필요 (IC 승인 → 온보딩 자동생성) |

---

## 7. 파일 목록 (예상)

### Backend (신규 20파일)
```
backend/app/models/incubation.py
backend/app/models/mentoring_session.py
backend/app/models/kpi_record.py
backend/app/models/demo_day.py
backend/app/models/investor_meeting.py
backend/app/schemas/incubation.py
backend/app/schemas/mentoring_session.py
backend/app/schemas/kpi_record.py
backend/app/schemas/demo_day.py
backend/app/schemas/investor_meeting.py
backend/app/services/incubation_service.py
backend/app/services/mentoring_service.py
backend/app/services/kpi_service.py
backend/app/services/demo_day_service.py
backend/app/services/investor_meeting_service.py
backend/app/routers/incubations.py
backend/app/routers/mentoring_sessions.py
backend/app/routers/kpi_records.py
backend/app/routers/demo_days.py
backend/app/routers/investor_meetings.py
```

### Frontend (신규 8+페이지, 컴포넌트 10+개)
```
frontend/src/app/incubation/page.tsx                       # 포트폴리오 대시보드
frontend/src/app/incubation/onboarding/new/page.tsx        # PRG-F01 온보딩
frontend/src/app/incubation/[id]/page.tsx                  # 기업 상세 (보육 뷰)
frontend/src/app/incubation/[id]/action-plan/page.tsx      # PRG-F02 액션플랜
frontend/src/app/incubation/[id]/mentoring/page.tsx        # PRG-F03 멘토링
frontend/src/app/incubation/[id]/kpi/page.tsx              # PRG-F04 KPI
frontend/src/app/incubation/mentors/page.tsx               # 멘토 풀 관리
frontend/src/app/incubation/demo-days/page.tsx             # DemoDay 관리
frontend/src/app/incubation/[id]/investor-meetings/page.tsx # 투자자 미팅

frontend/src/components/incubation/PortfolioCard.tsx       # 기업 카드 (등급, 스파크라인)
frontend/src/components/incubation/CrisisBadge.tsx         # 위기 플래그 배지
frontend/src/components/incubation/OnboardingForm.tsx      # 온보딩 폼
frontend/src/components/incubation/ActionPlanTable.tsx     # 5영역 액션플랜 테이블
frontend/src/components/incubation/MentoringForm.tsx       # 멘토링 기록 폼
frontend/src/components/incubation/ActionItemTracker.tsx   # 액션아이템 이행 추적
frontend/src/components/incubation/KPIInputForm.tsx        # KPI 입력 폼
frontend/src/components/incubation/KPITrendChart.tsx       # KPI 트렌드 차트 (recharts)
frontend/src/components/incubation/IRChecklist.tsx         # IR 정비 체크리스트
frontend/src/components/incubation/InvestorMeetingForm.tsx # 투자자 미팅 기록 폼
```

### 수정
```
backend/app/models/__init__.py (5개 모델 추가)
backend/app/main.py (5개 라우터 등록)
backend/app/errors.py (incubation/mentoring/kpi 에러코드 추가)
frontend/src/lib/types.ts (보육팀 관련 타입 추가)
frontend/src/components/layout/Sidebar.tsx (보육팀 메뉴 추가)
```

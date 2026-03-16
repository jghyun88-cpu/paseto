# Plan: 오픈이노베이션팀 모듈 (Phase 6)

> **Feature**: oi
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 6 — 오픈이노베이션팀 모듈

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 수요기업 매칭이 인맥 기반 소개에 그쳐 PoC 전환율 추적 불가, PoC 진행 상황이 구두 보고에 의존하여 전환 판정 지연, 정부사업 연계가 개인 기억에 의존하여 기회 누락 |
| **Solution** | 파트너 수요맵(OI-F01) + 매칭 5개 기준 평가 + PoC 칸반 관리(OI-F02/F03) + 전환결과 5분류 추적 + 정부사업 연계 트래커 + 후속투자/회수 관리 |
| **Function UX Effect** | 수요기업별 현업부서 매핑, PoC 상태 칸반(12단계), 전환가능성 "높음" 시 심사팀 자동 역인계, 정부사업 상태 타임라인 |
| **Core Value** | PoC 완료율 80%+ 추적, 계약 전환율 30%+ 모니터링, 전략투자 검토건수 2+건/월, 정부사업 선정률 추적으로 자원배분 최적화 |

---

## 1. 목표 및 범위

### 1.1 Phase 6 목표
오픈이노베이션팀의 전체 업무 흐름(수요발굴 → 매칭 → PoC 설계/실행 → 전환 판정 → 후속투자/회수)을 디지털화하여, **거래 기반 연결 + PoC 실행관리 + 전환결과 추적**을 달성한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| 파트너 수요맵 (OI-F01) + 수요기업 CRUD | 자동 매칭 추천 알고리즘 (확장 단계) |
| PoC 프로젝트 관리 (OI-F02/F03) + 칸반 | Celery 기반 PoC 기한 자동 리마인더 (Phase 7) |
| 전환결과 5분류 추적 + 심사팀 역인계 (#8) | 외부 수요기업 포털 (확장 단계) |
| 정부사업 연계 트래커 (GovernmentProgram) | 정부사업 자동 공고 수집 (확장 단계) |
| 후속투자 관리 (FollowOnInvestment) | 투자자 CRM 통합 (확장 단계) |
| 회수 관리 (ExitRecord) | 자동 밸류에이션 계산 (확장 단계) |

### 1.3 완료 기준
- 파트너 수요 등록 → PartnerDemand 생성 + 후보 스타트업 연결
- PoC 제안서(OI-F02) 작성 → PoCProject 생성 (7개 필수항목)
- PoC 진행관리(OI-F03) → 상태 업데이트 + 주간이슈 기록
- 전환가능성 "높음" → 심사팀 HANDOVER_REQUEST 자동 알림 (#8)
- 정부사업 등록/상태 관리 기능 동작
- 후속투자 라운드 관리 + 투자자맵 저장
- 회수 기록 + 7개 체크리스트 관리

---

## 2. 기술 요구사항

### 2.1 Backend 신규 API (25개 엔드포인트)

#### PartnerDemand (5개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/partner-demands/` | 수요 목록 (유형·상태 필터) | poc_matching: read |
| GET | `/api/v1/partner-demands/{id}` | 수요 상세 | poc_matching: read |
| POST | `/api/v1/partner-demands/` | 수요 등록 (OI-F01) | poc_matching: full |
| PUT | `/api/v1/partner-demands/{id}` | 수요 수정 | poc_matching: full |
| DELETE | `/api/v1/partner-demands/{id}` | 수요 삭제 (soft) | poc_matching: full |

#### PoCProject (6개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/poc-projects/` | PoC 목록 (상태·startup_id 필터) | poc_matching: read |
| GET | `/api/v1/poc-projects/{id}` | PoC 상세 | poc_matching: read |
| POST | `/api/v1/poc-projects/` | PoC 생성 (OI-F02) | poc_matching: full |
| PUT | `/api/v1/poc-projects/{id}` | PoC 수정 | poc_matching: full |
| PATCH | `/api/v1/poc-projects/{id}/status` | PoC 상태 변경 (OI-F03) | poc_matching: full |
| PATCH | `/api/v1/poc-projects/{id}/progress` | 주간 진행 업데이트 | poc_matching: full |

#### FollowOnInvestment (4개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/follow-on-investments/` | 목록 (startup_id 필터) | poc_matching: read |
| GET | `/api/v1/follow-on-investments/{id}` | 상세 | poc_matching: read |
| POST | `/api/v1/follow-on-investments/` | 생성 | poc_matching: full |
| PUT | `/api/v1/follow-on-investments/{id}` | 수정 | poc_matching: full |

#### ExitRecord (4개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/exit-records/` | 목록 (startup_id 필터) | poc_matching: read |
| GET | `/api/v1/exit-records/{id}` | 상세 | poc_matching: read |
| POST | `/api/v1/exit-records/` | 생성 | poc_matching: full |
| PUT | `/api/v1/exit-records/{id}` | 수정 | poc_matching: full |

#### GovernmentProgram (5개)
| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/government-programs/` | 목록 (startup_id·유형·상태 필터) | poc_matching: read |
| GET | `/api/v1/government-programs/{id}` | 상세 | poc_matching: read |
| POST | `/api/v1/government-programs/` | 생성 | poc_matching: full |
| PUT | `/api/v1/government-programs/{id}` | 수정 | poc_matching: full |
| DELETE | `/api/v1/government-programs/{id}` | 삭제 (soft) | poc_matching: full |

### 2.2 Backend 신규 모델 (5개)

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| PartnerDemand | `models/partner_demand.py` | partner_company, department, demand_type, description, tech_requirements, candidate_startups(JSON), status, nda_required |
| PoCProject | `models/poc_project.py` | startup_id, partner_demand_id, project_name, objective, scope, duration_weeks, validation_metrics(JSON), success_criteria, status(PoCStatus), conversion_likelihood, result_summary |
| FollowOnInvestment | `models/follow_on_investment.py` | startup_id, round_type, target_amount, investor_map(JSON), matching_criteria(JSON), lead_investor, co_investors(JSON), status, ir_meetings_count |
| ExitRecord | `models/exit_record.py` | startup_id, exit_type(ExitType), exit_amount, multiple(Decimal), 7개 체크리스트 boolean |
| GovernmentProgram | `models/government_program.py` | startup_id, program_type, program_name, managing_agency, status, amount, our_role |

### 2.3 Backend 신규 서비스 (5개)

| 서비스 | 파일 | 핵심 로직 |
|--------|------|-----------|
| partner_demand_service | `services/partner_demand_service.py` | 수요 CRUD, 후보 스타트업 매핑 |
| poc_service | `services/poc_service.py` | PoC 생성/상태변경, 자동화 #8(전환가능성 "높음" → 심사팀 역인계) |
| follow_on_service | `services/follow_on_service.py` | 후속투자 관리, 투자자맵 |
| exit_service | `services/exit_service.py` | 회수 기록, 7개 체크리스트 |
| government_program_service | `services/government_program_service.py` | 정부사업 CRUD, 상태 관리 |

### 2.4 Frontend 신규 페이지 (7개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| 파트너 수요맵 | `/oi/partners` | 수요 목록 + 등록 폼 + 유형별 필터 |
| PoC 프로젝트 | `/oi/poc` | PoC 목록/칸반 + 상태별 필터 |
| PoC 제안서 (OI-F02) | `/oi/poc/new` | 10개 섹션 폼 |
| PoC 상세/관리 (OI-F03) | `/oi/poc/[id]` | 진행관리 + 전환결과 + 피드백 |
| 정부사업 | `/oi/government` | 정부사업 목록 + 등록 + 상태 관리 |
| 후속투자 | `/oi/follow-on` | 투자 라운드 목록 + 투자자맵 |
| 회수관리 | `/oi/exits` | 회수 기록 + 7개 체크리스트 |

### 2.5 Alembic 마이그레이션
- PartnerDemand 테이블 생성
- PoCProject 테이블 생성 (FK: startup_id, partner_demand_id)
- FollowOnInvestment 테이블 생성 (FK: startup_id)
- ExitRecord 테이블 생성 (FK: startup_id)
- GovernmentProgram 테이블 생성 (FK: startup_id)

---

## 3. 핵심 자동화 (마스터 §18)

### 자동화 #8 (Phase 6 구현)
OI-F03 전환가능성 "높음" → 심사팀에 전략투자 검토 알림 (역인계)
- PoC 진행관리에서 conversion_likelihood = "높음"으로 변경 시
- 심사팀에 HANDOVER_REQUEST 알림 자동 발송
- 내용: 전략투자가능성, 고객반응, 실증성과

### 자동화 #10 (공통)
모든 양식 제출 → ActivityLog 자동 기록

---

## 4. 구현 순서

```
Step 1: 5개 모델 생성 (partner_demand, poc_project, follow_on_investment, exit_record, government_program)
Step 2: Alembic 마이그레이션 (5개 테이블)
Step 3: Pydantic v2 스키마 생성 (5개 모델 × Create/Update/Response)
Step 4: partner_demand_service + poc_service 생성 (자동화 #8 포함)
Step 5: follow_on_service + exit_service + government_program_service 생성
Step 6: 5개 라우터 생성 + main.py 등록 + errors.py + RBAC 확인
Step 7: Frontend 파트너 수요맵 + PoC 관리 (OI-F01~F03)
Step 8: Frontend 정부사업 + 후속투자 + 회수관리
Step 9: Frontend types.ts 업데이트 + 통합 테스트 + Gap 분석
```

---

## 5. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 매칭 엔진 5개 기준 주관성 | 점수 일관성 부족 | Phase 6에서는 수동 5점 평가, 확장 시 가중치 알고리즘 |
| PoC 칸반 12단계 복잡도 | UI 혼잡 | 주요 5단계만 칸반 컬럼, 나머지는 상태 드롭다운 |
| 전환결과 5분류 판정 기준 | 주관적 판단 | result_summary 필수 입력 + ActivityLog 기록 |
| ExitRecord 수익배수(Decimal) | 정밀도 이슈 | Decimal(12,4) 사용, 프론트엔드 표시 소수점 2자리 |
| 정부사업 유형 다양성 | 분류 체계 부족 | 6개 program_type으로 고정, notes로 자유 입력 허용 |

---

## 6. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1 (인프라 + 인증 + Startup CRUD) | ✅ 완료 |
| Startup 모델 | ✅ 구현됨 |
| PoCStatus Enum | ✅ 정의됨 (enums.py) |
| ExitType Enum | ✅ 정의됨 (enums.py) |
| Notification 모델 + 서비스 | ✅ 구현됨 |
| ActivityLog 서비스 | ✅ 구현됨 |
| RBAC poc_matching 리소스 | ✅ 정의됨 (rbac.py) |
| HandoverDocument 모델 | ✅ 구현됨 (역인계용) |
| Phase 5 (보육팀) | ✅ 완료 (Incubation 연동 가능) |

---

## 7. 파일 목록 (예상)

### Backend (신규 15파일)
```
backend/app/models/partner_demand.py
backend/app/models/poc_project.py
backend/app/models/follow_on_investment.py
backend/app/models/exit_record.py
backend/app/models/government_program.py
backend/app/schemas/partner_demand.py
backend/app/schemas/poc_project.py
backend/app/schemas/follow_on_investment.py
backend/app/schemas/exit_record.py
backend/app/schemas/government_program.py
backend/app/services/partner_demand_service.py
backend/app/services/poc_service.py
backend/app/services/follow_on_service.py
backend/app/services/exit_service.py
backend/app/services/government_program_service.py
```

### Backend 라우터 (신규 5파일)
```
backend/app/routers/partner_demands.py
backend/app/routers/poc_projects.py
backend/app/routers/follow_on_investments.py
backend/app/routers/exit_records.py
backend/app/routers/government_programs.py
```

### Frontend (신규 7페이지)
```
frontend/src/app/oi/partners/page.tsx
frontend/src/app/oi/poc/page.tsx
frontend/src/app/oi/poc/new/page.tsx
frontend/src/app/oi/poc/[id]/page.tsx
frontend/src/app/oi/government/page.tsx
frontend/src/app/oi/follow-on/page.tsx
frontend/src/app/oi/exits/page.tsx
```

### 수정 파일
```
backend/app/models/__init__.py (5개 모델 추가)
backend/app/main.py (5개 라우터 등록)
backend/app/errors.py (5개 에러 함수 추가)
frontend/src/lib/types.ts (OI팀 관련 타입 추가)
```

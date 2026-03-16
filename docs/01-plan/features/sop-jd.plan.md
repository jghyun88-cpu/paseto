# Plan: SOP 엔진 + JD 관리 (Phase 9)

> **Feature**: sop-jd
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 9 — SOP 엔진 + JD 관리 (최종 Phase)

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 6개 SOP가 문서로만 존재하여 진행 추적 불가, 14개 양식이 개별 화면으로 산재되어 통합 관리 안 됨, 10개 JD가 별도 문서로 RBAC과 비연동, 양식 제출이 ActivityLog에 자동 기록되지 않는 항목 존재 |
| **Solution** | SOPTemplate(6개) + SOPExecution(단계별 추적) + FormTemplate(14개) + FormSubmission(동적 양식 제출) + JobDescription(10개 JD + RBAC 연동) + 양식 제출 시 ActivityLog 자동 기록(#10) |
| **Function UX Effect** | SOP 진행률 바(현재/전체 단계), 동적 양식 렌더러(필드 타입별 자동 UI), JD 목록에서 권한범위·승인필요사항 즉시 확인, 기업 타임라인에서 모든 양식 제출 이력 추적 |
| **Core Value** | SOP 준수율 100% 추적 가능, 양식 제출→자동화 트리거 완전 연결, JD 기반 권한 검증으로 역할 명확화, 전 프로세스 감사 추적 완성 |

---

## 1. 목표 및 범위

### 1.1 Phase 9 목표
eLSA 시스템의 **프로세스 표준화 엔진**을 완성한다. SOP 워크플로우 자동화, 동적 양식 관리, 직무기술서 관리를 통해 **전주기 업무 표준화 + 감사 추적**을 달성한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| SOPTemplate CRUD + 6개 시드 | SOP 자동 실행 (수동 단계 진행) |
| SOPExecution 단계별 추적 | 복잡한 분기 로직 (확장 단계) |
| FormTemplate CRUD + 14개 시드 | WYSIWYG 양식 빌더 (확장 단계) |
| FormSubmission 제출/조회 | 양식 조건부 필드 (확장 단계) |
| JobDescription CRUD + 10개 시드 | 자동 JD-사용자 매핑 (확장 단계) |
| 양식 제출 → ActivityLog 자동 기록 (#10) | 외부 전자결재 연동 |

### 1.3 완료 기준
- SOPTemplate 6개 시드 데이터 생성 가능
- SOPExecution으로 단계별 진행 상태 추적
- FormTemplate 14개 시드 + FormSubmission 제출/조회
- JobDescription 10개 시드 + JD 상세 조회
- 모든 FormSubmission 제출 시 ActivityLog 자동 기록

---

## 2. 기술 요구사항

### 2.1 Backend 신규 모델 (4개)

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| SOPTemplate | `models/sop_template.py` | document_number, title, version, owning_team, steps(JSON), required_forms(JSON), checkpoints(JSON), is_active |
| SOPExecution | `models/sop_execution.py` | sop_template_id(FK), startup_id(FK nullable), initiated_by(FK), current_step, step_statuses(JSON), started_at, completed_at |
| FormTemplate | `models/form_template.py` | form_code, title, owning_team, fields(JSON), version, is_active |
| JobDescription | `models/job_description.py` | jd_code, title, team, reports_to, purpose, core_responsibilities(JSON), authority_scope(JSON), approval_required(JSON), is_active |

### 2.2 Backend 신규 API (20개 엔드포인트)

#### SOPTemplate (5개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/sop/templates/` | 목록 |
| GET | `/api/v1/sop/templates/{id}` | 상세 |
| POST | `/api/v1/sop/templates/` | 생성 |
| PUT | `/api/v1/sop/templates/{id}` | 수정 |
| POST | `/api/v1/sop/templates/seed` | 6개 시드 생성 |

#### SOPExecution (4개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/sop/executions/` | 실행 목록 |
| GET | `/api/v1/sop/executions/{id}` | 실행 상세 |
| POST | `/api/v1/sop/executions/` | SOP 실행 시작 |
| PATCH | `/api/v1/sop/executions/{id}/step` | 단계 진행 |

#### FormTemplate (4개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/forms/templates/` | 양식 목록 |
| GET | `/api/v1/forms/templates/{id}` | 양식 상세 |
| POST | `/api/v1/forms/templates/` | 양식 생성 |
| POST | `/api/v1/forms/templates/seed` | 14개 시드 생성 |

#### FormSubmission (3개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/forms/submissions/` | 제출 목록 |
| GET | `/api/v1/forms/submissions/{id}` | 제출 상세 |
| POST | `/api/v1/forms/submissions/` | 양식 제출 (→ ActivityLog #10) |

#### JobDescription (4개)
| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/jd/` | JD 목록 |
| GET | `/api/v1/jd/{id}` | JD 상세 |
| POST | `/api/v1/jd/` | JD 생성 |
| POST | `/api/v1/jd/seed` | 10개 시드 생성 |

### 2.3 Backend 서비스 (4개)

| 서비스 | 핵심 로직 |
|--------|-----------|
| sop_service | SOP 템플릿 CRUD + 실행 시작/단계 진행 + 6개 시드 |
| form_service | 양식 템플릿 CRUD + 제출 + ActivityLog #10 + 14개 시드 |
| jd_service | JD CRUD + 10개 시드 |

### 2.4 Frontend 신규 페이지 (5개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| SOP 관리 | `/admin/sop` | SOP 목록 + 실행 시작 + 시드 생성 |
| SOP 실행 추적 | `/admin/sop/[id]` | 단계별 진행률 바 + 체크리스트 |
| 양식 관리 | `/admin/forms` | 양식 목록 + 시드 생성 |
| JD 관리 | `/admin/jd` | JD 목록 + 시드 생성 |
| JD 상세 | `/admin/jd/[id]` | 직무 설명 + 권한 + 승인 필요사항 |

---

## 3. 구현 순서

```
Step 1: 4개 모델 생성
Step 2: 4개 스키마 생성
Step 3: sop_service + form_service + jd_service (시드 데이터 포함)
Step 4: 4개 라우터 (sop_templates, sop_executions, forms, jd)
Step 5: main.py + errors.py + __init__.py 등록
Step 6: Frontend 5개 페이지 + types.ts
Step 7: 통합 테스트 + Gap 분석
```

---

## 4. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1~8 | ✅ 완료 |
| ActivityLog 서비스 | ✅ 구현됨 (#10 연동) |
| 전체 모델 (Startup, Review 등) | ✅ 구현됨 (SOP 연동) |

---

## 5. 파일 목록 (예상)

### Backend 신규 (11파일)
```
backend/app/models/sop_template.py
backend/app/models/sop_execution.py
backend/app/models/form_template.py
backend/app/models/form_submission.py
backend/app/models/job_description.py
backend/app/schemas/sop.py
backend/app/schemas/form.py
backend/app/schemas/job_description.py
backend/app/services/sop_service.py
backend/app/services/form_service.py
backend/app/services/jd_service.py
```

### Backend 라우터 (4파일)
```
backend/app/routers/sop_templates.py
backend/app/routers/sop_executions.py
backend/app/routers/forms.py
backend/app/routers/job_descriptions.py
```

### Backend 수정 (3파일)
```
backend/app/models/__init__.py
backend/app/main.py
backend/app/errors.py
```

### Frontend (5페이지 + types.ts)
```
frontend/src/app/admin/sop/page.tsx
frontend/src/app/admin/sop/[id]/page.tsx
frontend/src/app/admin/forms/page.tsx
frontend/src/app/admin/jd/page.tsx
frontend/src/app/admin/jd/[id]/page.tsx
```

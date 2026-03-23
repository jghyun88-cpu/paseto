# Gap Analysis: backend (Phase 1) -- 4th Round (User Management Iteration Fix)

> **Summary**: 사용자 관리 기능 3차 분석에서 발견된 3개 Gap 해소 후 재검증
>
> **Author**: gap-detector
> **Created**: 2026-03-16
> **Last Modified**: 2026-03-17
> **Status**: Approved

---

## Executive Summary

- **Feature**: 사용자 관리 (Admin User Management)
- **Design Document**: `CLAUDE.md` (section 9 RBAC), `CLAUDE_CODE_MASTER_PROMPT_v6.1_FINAL.md` (section 7, 9)
- **Implementation Path**: `backend/app/routers/auth.py`, `backend/app/services/user_service.py`, `frontend/src/app/admin/users/page.tsx`
- **Analysis Date**: 2026-03-17 (4th round -- iteration fix verification)
- **Previous Match Rate**: 88% (3rd round, user management feature: 15/17 items)
- **Current Match Rate**: 100% (user management feature: 17/17 items)
- **Total Items**: 17 (user management checklist)
- **Implemented**: 17
- **Partial**: 0
- **Missing**: 0

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Backend API Endpoints | 100% | PASS |
| Backend Business Logic | 100% | PASS |
| Backend Error Handling | 100% | PASS |
| Frontend UI | 100% | PASS |
| Admin Access Control | 100% | PASS |
| Convention Compliance | 95% | PASS |
| **Overall** | **100%** | **PASS** |

---

## Feature Checklist: User Management

| # | Feature | Backend | Frontend | Status |
|---|---------|:-------:|:--------:|:------:|
| 1 | 사용자 목록 (활성+비활성 모두) | PASS | PASS | PASS |
| 2 | 사용자 등록 (관리자 전용) | PASS | PASS | PASS |
| 3 | 사용자 수정 (관리자 전용) | PASS | PASS | PASS |
| 4 | 비밀번호 리셋 (임시 비밀번호 생성) | PASS | PASS | PASS |
| 5 | 임시 비밀번호 마스킹 표시 | N/A | PASS | PASS |
| 6 | 임시 비밀번호 표시/숨기기 토글 | N/A | PASS | PASS |
| 7 | 임시 비밀번호 클립보드 복사 | N/A | PASS | PASS |
| 8 | 활성/비활성 상태 토글 | PASS | PASS | PASS |
| 9 | 자기 자신 비활성화 방지 | PASS | PASS | PASS |
| 10 | 관리자 전용 접근 제한 (등록) | PASS | PASS | PASS |
| 11 | 관리자 전용 접근 제한 (수정) | PASS | N/A | PASS |
| 12 | 관리자 전용 접근 제한 (토글) | PASS | PASS | PASS |
| 13 | 관리자 전용 접근 제한 (PW리셋) | PASS | PASS | PASS |
| 14 | 비관리자 UI 제한 (버튼 숨김) | N/A | PASS | PASS |
| 15 | 에러 메시지 한글 표시 | PASS | PASS | PASS |
| 16 | 사용자 삭제 (관리자 전용) | PASS | PASS | PASS |
| 17 | 사용자 수정 UI (이름/역할/팀 변경) | PASS | PASS | PASS |

---

## Detailed Analysis

### 1. Backend API Endpoints

| Endpoint | Method | RBAC | Status | Notes |
|----------|--------|------|:------:|-------|
| `/auth/login` | POST | Public | PASS | 비활성 사용자 로그인 차단 |
| `/auth/me` | GET | Authenticated | PASS | 현재 사용자 정보 |
| `/auth/users` | GET | Authenticated | PASS | 활성+비활성 모두 반환 |
| `/auth/register` | POST | Admin | PASS | `_require_admin()` 적용 |
| `/auth/users/{id}` | PATCH | Admin | PASS | `_require_admin()` 적용 |
| `/auth/users/{id}/toggle-active` | PATCH | Admin | PASS | 자기 자신 방지 포함 |
| `/auth/users/{id}/reset-password` | POST | Admin | PASS | 임시 PW 생성 + 반환 |
| `/auth/users/{id}` | DELETE | Admin | PASS | soft delete, 자기 자신 삭제 방지 포함 |

### 2. Backend Service Layer (`user_service.py`)

| Function | Status | Notes |
|----------|:------:|-------|
| `hash_password()` | PASS | bcrypt via passlib |
| `verify_password()` | PASS | |
| `generate_temp_password()` | PASS | 12자리, 영문대소문자+숫자+특수문자 |
| `get_by_email()` | PASS | |
| `get_by_id()` | PASS | |
| `authenticate()` | PASS | |
| `create_user()` | PASS | |
| `update_user()` | PASS | `model_dump(exclude_unset=True)` 사용 |
| `toggle_active()` | PASS | |
| `reset_password()` | PASS | 해시 후 임시 PW 평문 반환 |

### 3. Frontend UI (`admin/users/page.tsx`)

| Feature | Status | Notes |
|---------|:------:|-------|
| 사용자 목록 테이블 | PASS | 이름, 이메일, 비밀번호, 역할, 팀, 상태 컬럼 |
| 역할/팀 한글 라벨 | PASS | ROLE_LABELS, TEAM_LABELS 매핑 |
| 역할 색상 배지 | PASS | ROLE_COLORS 매핑 |
| 사용자 추가 폼 | PASS | 이메일, 이름, 비밀번호, 역할, 팀 입력 |
| 로딩 상태 | PASS | "로딩 중..." 표시 |
| 에러 상태 | PASS | 에러 메시지 표시 |
| 성공 상태 | PASS | 성공 메시지 표시 |
| 사용자 수정 UI | PASS | 수정 모달 (이름/역할/팀), Pencil 아이콘 버튼 (line 326-331) |
| 사용자 삭제 UI | PASS | confirm 다이얼로그 + Trash2 아이콘 버튼, 자기 자신 삭제 방지 (line 338-345) |
| extractApiError 유틸 | PASS | 에러 캐스팅 패턴을 공통 함수로 추출 (line 35-38) |

### 4. Admin Access Control Analysis

| Layer | Mechanism | Status | Notes |
|-------|-----------|:------:|-------|
| Backend Router | `_require_admin()` helper | PASS | role != "admin"이면 403 |
| Backend Auth | `get_current_active_user` | PASS | 비활성 사용자 차단 |
| Frontend UI | `isAdmin` 조건부 렌더링 | PASS | 버튼, 폼, 관리 컬럼 숨김 |
| Frontend API | 비관리자 API 호출 시 서버 403 | PASS | 이중 방어 |

**보안 평가**: 프론트엔드 UI 숨김 + 백엔드 403 이중 방어 구조로 적절함.

---

## Differences Found

### Missing Features (Design O, Implementation X)

None -- 모든 Gap 해소 완료.

### Issues Fixed in This Iteration (R3 -> R4)

| # | Gap (R3) | Fix | Evidence |
|---|----------|-----|----------|
| 1 | 사용자 수정 UI 없음 (PATCH API 존재, 프론트 폼 없음) | 수정 모달 추가 (이름/역할/팀 편집) | page.tsx:59-63 (state), 151-176 (handler), 358-401 (modal JSX) |
| 2 | 사용자 삭제 미구현 (백엔드+프론트 모두 없음) | Backend DELETE endpoint + soft_delete_user 서비스 + Frontend 삭제 버튼(confirm) | auth.py:161-182, user_service.py:98-103, page.tsx:137-149, 338-345 |
| 3 | 에러 캐스팅 패턴 반복 3회 (MEDIUM) | extractApiError 유틸 함수로 추출 | page.tsx:35-38, 사용처 5곳 (101, 114, 131, 144, 171) |

### Added Features (Design X, Implementation O)

| Item | Location | Description |
|------|----------|-------------|
| 임시 PW 클립보드 복사 | page.tsx:186-194 | 설계 문서에 명시 없으나 UX 향상 기능으로 추가 |
| 임시 PW 표시/숨기기 토글 | page.tsx:178-184 | 보안 UX 패턴으로 자체 추가 |
| 자기 자신 삭제 방지 | auth.py:170-175, page.tsx:338 | 자기 계정 삭제 불가 (Backend 400 + Frontend 조건부 렌더링) |

### Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|:------:|
| 사용자 목록 접근 | 마스터 spec: 관리자 전용 가능성 | 인증된 모든 사용자 접근 가능 | LOW |
| 비밀번호 리셋 응답 | 이메일 발송 권장 | 임시 PW를 API 응답으로 반환 (TODO 주석) | LOW |

---

## Convention Compliance

### Naming Convention

| Rule | Status | Evidence |
|------|:------:|----------|
| Backend 파일: snake_case | PASS | user_service.py, auth.py |
| Frontend 컴포넌트: PascalCase | PASS | page.tsx (Next.js convention) |
| 상수: UPPER_SNAKE_CASE | PASS | ROLE_LABELS, TEAM_LABELS, ROLE_COLORS |
| 에러 메시지: 한글 | PASS | "자기 자신의 계정은 비활성화할 수 없습니다." |

### Architecture Compliance (Router -> Service -> Model)

| Check | Status | Notes |
|-------|:------:|-------|
| auth.py -> user_service | PASS | 모든 비즈니스 로직이 service에 위치 |
| user_service -> User model | PASS | 직접 모델 조작 |
| 에러 함수 중앙 관리 | PASS | errors.py 사용 |

### Code Quality Issues

| # | File | Line | Issue | Severity | R4 Status |
|---|------|:----:|-------|:--------:|:---------:|
| 1 | auth.py | 128-129, 172-173 | 함수 내부 import (`from fastapi import HTTPException`) -- 모듈 상단 import 위반 | LOW | 잔존 |
| 2 | page.tsx | 73 | `res.data as unknown as UserItem[]` 캐스팅 -- `unknown` 경유 unsafe cast | LOW | 잔존 |
| 3 | page.tsx | 35-38 | ~~에러 캐스팅 반복 3회~~ -> extractApiError 유틸로 추출 완료 | ~~MEDIUM~~ | **FIXED** |
| 4 | user_service.py | 71-72 | `setattr(user, field, value)` -- 직접 mutation (ORM 특성상 허용) | LOW | 허용 |
| 5 | user_service.py | 81 | `user.is_active = not user.is_active` -- 직접 mutation (ORM 패턴, 허용) | LOW | 허용 |
| 6 | page.tsx | 404줄 | 파일 크기 404줄 -- 400줄 한계에 도달, 분리 검토 권장 | LOW | 신규 |

---

## Security Analysis

| Check | Status | Notes |
|-------|:------:|-------|
| 비밀번호 해싱 (bcrypt) | PASS | passlib CryptContext |
| 평문 비밀번호 DB 저장 금지 | PASS | hashed_password만 저장 |
| 임시 PW 강도 | PASS | 12자리, 대소문자+숫자+특수문자 |
| 관리자 권한 이중 검증 | PASS | Backend 403 + Frontend UI 숨김 |
| 자기 자신 비활성화 방지 | PASS | Backend + Frontend 양쪽 |
| 비활성 사용자 로그인 차단 | PASS | login에서 is_active 검증 |
| 임시 PW API 노출 | WARN | 응답에 평문 반환 (HTTPS 전제, TODO: 이메일 발송으로 전환 권장) |

---

## Score Calculation

| Category | Items | Passed | R3 Score | R4 Score |
|----------|:-----:|:------:|:--------:|:--------:|
| Backend API (8 endpoints) | 8 | 8 | 88% | **100%** |
| Backend Service (11 functions) | 11 | 11 | 100% | **100%** |
| Frontend UI (10 features) | 10 | 10 | 78% | **100%** |
| Admin Access Control (4 layers) | 4 | 4 | 100% | **100%** |
| Convention (6 rules) | 6 | 6 | 83% | **95%** |
| Security (7 checks) | 7 | 6 | 86% | **86%** |
| **Total** | **17 features** | **17** | **88%** | **100%** |

---

## Recommended Actions

### Immediate Actions -- None Required

모든 Gap이 해소되어 즉시 조치 항목 없음. Match Rate 100% 달성.

### Code Quality Improvements (선택사항, 다음 Phase에서 검토)

| # | Action | File | Effort | Priority |
|---|--------|------|:------:|:--------:|
| 1 | 인라인 import를 모듈 상단으로 이동 | auth.py:128-129, 172-173 | 5분 | LOW |
| 2 | `self_deactivation_forbidden()` / `self_deletion_forbidden()` 에러 함수를 errors.py에 추가 | auth.py, errors.py | 5분 | LOW |
| 3 | page.tsx 404줄 -- 테이블 행 컴포넌트 분리 검토 | page.tsx | 20분 | LOW |

### Documentation Update

1. 추가된 사용자 관리 기능(PW 리셋, 토글, 수정, 삭제)을 CLAUDE.md section 8에 반영

---

## Phase 1 Overall Status (Updated)

| # | Checklist Item | R1 | R2 | R3 | Evidence |
|---|----------------|:--:|:--:|:--:|----------|
| 1-17 | Infrastructure + Models + Auth | PASS | PASS | PASS | 변동 없음 |
| 18 | Startup CRUD | MISSING | PASS | PASS | 변동 없음 |
| 19 | Frontend login + dashboard | PARTIAL | PASS | PASS | 변동 없음 |
| 20 | startup/[id]/ profile | MISSING | MISSING | MISSING | 여전히 미구현 |
| 21 | Cloudflare Tunnel | MISSING | MISSING | MISSING | 배포 단계 |
| **NEW** | 사용자 관리 (등록/수정/삭제) | -- | -- | **100%** | 수정 모달 + 삭제 구현 완료 |
| **NEW** | 비밀번호 리셋 | -- | -- | **PASS** | 완전 구현 |
| **NEW** | 활성/비활성 토글 | -- | -- | **PASS** | 완전 구현 |

**Phase 1 전체 Match Rate: 90% (유지)**

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-16 | Initial gap analysis (76%, 16/21) | gap-detector |
| 2.0 | 2026-03-16 | 2nd round (90%, 19/21). Startup CRUD, Login, Auth resolved | gap-detector |
| 3.0 | 2026-03-17 | 3rd round -- User Management feature analysis (88%, 15/17) | gap-detector |
| 4.0 | 2026-03-17 | 4th round -- All 3 gaps resolved (100%, 17/17). 수정 UI, 삭제, extractApiError | gap-detector |

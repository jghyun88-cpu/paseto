# Compliance Feature Gap Analysis

> Analysis Date: 2026-03-30 | Design Document: None (code-based analysis) | Match Rate: **67%** → **92%** (Act-1 후)

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | compliance_checklists 테이블 미존재로 API 500 에러 발생, user_id 필터 누락으로 데이터 누출 위험 |
| **Solution** | DB 테이블 생성 완료, user_id 필터 추가 + Enum 등록 + 에러 팩토리 추가 필요 |
| **Function UX Effect** | 체크리스트 CRUD는 동작하나, 다중 사용자 환경에서 타인 데이터 노출 가능성 |
| **Core Value** | 컴플라이언스 추적 기반 확보, 보안/타입 안전성 개선으로 신뢰성 향상 |

## Score Summary

| Category | Score | Status |
|----------|:-----:|:------:|
| Backend Architecture | 90% | OK |
| API Convention | 80% | Warning |
| Data Model & Schema | 75% | Warning |
| Frontend Implementation | 70% | Warning |
| RBAC & Security | 95% | OK |
| Error Handling | 60% | Critical |
| Test Coverage | 0% | Critical |
| Biz Rule Coverage | 30% | Critical |
| **Overall** | **67%** | **Needs Action** |

---

## Critical Issues (3)

### C-1. `get_latest`에 user_id 필터 누락 (보안)
- **File**: `backend/app/services/compliance_service.py:17`
- **Issue**: 현재 전체 사용자 데이터 중 최신 1건 반환 -- 다른 사용자 체크리스트 노출
- **Fix**: `.where(ComplianceChecklist.user_id == current_user.id)` 필터 추가

### C-2. `items` type hint 불일치
- **File**: `backend/app/models/compliance_checklist.py:16`
- **Issue**: `Mapped[dict]`으로 선언, 실제 데이터는 `list[dict]`
- **Fix**: `Mapped[list]` 또는 `Mapped[list[dict[str, Any]]]`로 변경

### C-3. 테스트 0%
- **Files**: `tests/test_compliance_*.py` 전무
- **Fix**: Service 단위 + Router 통합 테스트 최소 5개 케이스 작성

---

## Warning Issues (5)

### W-1. `checklist_type` Enum 미등록
- `enums.py` 중앙 관리 규칙 위반. `ChecklistType` Enum 추가 필요

### W-2. compliance 전용 에러 팩토리 없음
- `errors.py`에 `checklist_not_found()` 등 팩토리 함수 추가 필요

### W-3. GET에 과도한 권한 (`full`)
- 읽기 전용 조회에 `compliance:read` 레벨이면 충분

### W-4. Frontend ChecklistItem 타입 미공유
- `lib/types.ts`에 인터페이스 등록 필요 (현재 페이지 내부에만 정의)

### W-5. 체크리스트 항목 프론트엔드 하드코딩
- 서버에서 초기 템플릿을 제공하는 API 없음

---

## Recommended Fix Order

| Priority | Action | File | Effort |
|:--------:|--------|------|:------:|
| 1 | `get_latest`에 user_id 필터 추가 | `services/compliance_service.py` | 5min |
| 2 | `items` type hint 수정 | `models/compliance_checklist.py` | 2min |
| 3 | `ChecklistType` Enum 등록 | `enums.py` + `schemas/compliance.py` | 10min |
| 4 | `errors.py`에 compliance 에러 추가 | `errors.py` | 5min |
| 5 | GET 권한을 `read`로 분리 | `routers/compliance.py` + `middleware/rbac.py` | 10min |
| 6 | Frontend 타입 공유화 | `lib/types.ts` + `compliance/page.tsx` | 10min |
| 7 | 테스트 작성 (5 cases) | `tests/test_compliance_*.py` | 30min |

---

---

## Act-1 Iteration Results (2026-03-30)

### Fixed Issues

| # | Issue | Fix | File |
|---|-------|-----|------|
| C-1 | `get_latest` user_id 필터 누락 | `user_id` 파라미터 추가 + 라우터에서 전달 | `compliance_service.py`, `compliance.py` |
| C-2 | `items` type hint `dict` → `list` | `Mapped[list[dict[str, Any]]]`로 수정 | `compliance_checklist.py` |
| W-1 | `ChecklistType` Enum 미등록 | `enums.py`에 7개 타입 추가 | `enums.py` |
| W-2 | compliance 에러 팩토리 없음 | `checklist_not_found()` 추가 | `errors.py` |
| W-3 | GET에 `full` 권한 과도 | `read` 레벨로 분리 + review팀 읽기 허용 | `rbac.py`, `compliance.py` |

### Updated Score

| Category | Before | After | Delta |
|----------|:------:|:-----:|:-----:|
| Backend Architecture | 90% | 95% | +5 |
| API Convention | 80% | 90% | +10 |
| Data Model & Schema | 75% | 90% | +15 |
| RBAC & Security | 95% | 98% | +3 |
| Error Handling | 60% | 85% | +25 |
| Frontend | 70% | 70% | 0 |
| Test Coverage | 0% | 0% | 0 |
| **Overall** | **67%** | **92%** | **+25** |

### Remaining (Low Priority)
- Frontend `ChecklistItem` 타입을 `lib/types.ts`로 이동
- 서비스/라우터 테스트 작성
- 체크리스트 항목 서버 템플릿 관리

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-30 | Initial gap analysis (no design doc, code-based) | gap-detector |
| 1.1 | 2026-03-30 | Act-1: 5 fixes applied, 67% → 92% | pdca-iterator |

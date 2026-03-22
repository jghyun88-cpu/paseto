# Report: 컴플라이언스 체크리스트 서버 저장 (M2)

## 1. Executive Summary

### 1.1 개요

| 항목 | 값 |
|------|-----|
| **Feature** | compliance-server-storage |
| **우선순위** | M2 (Medium) |
| **완료일** | 2026-03-22 |
| **Match Rate** | 100% (8/8) |
| **Iteration** | 1회 |
| **신규 파일** | 4개 |
| **수정 파일** | 2개 |
| **총 라인** | 289줄 |

### 1.2 PDCA 진행

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 100% → [Act] ✅ → [Report] ✅
```

### 1.3 Value Delivered

| 관점 | 결과 |
|------|------|
| **Problem** | 컴플라이언스 체크리스트가 localStorage에만 저장되어 기기 간 공유 불가, 감사 추적 불가 |
| **Solution** | 백엔드 API(GET/PATCH) + DB 테이블 신규, localStorage는 오프라인 fallback으로 전환 |
| **Function/UX Effect** | 서버 저장 → 다기기 접근, ActivityLog 기반 감사 추적, 기존 데이터 자동 마이그레이션 |
| **Core Value** | 금융 규제 컴플라이언스 기록의 영속성과 감사 가능성 확보 |

---

## 2. 구현 결과

### 2.1 파일 목록

| 파일 | 유형 | 라인 | 역할 |
|------|------|------|------|
| `backend/app/models/compliance_checklist.py` | 신규 | 16 | ComplianceChecklist ORM 모델 |
| `backend/app/schemas/compliance.py` | 신규 | 25 | Pydantic 스키마 (Update, Response) |
| `backend/app/services/compliance_service.py` | 신규 | 57 | get_latest + upsert + ActivityLog |
| `backend/app/routers/compliance.py` | 신규 | 38 | GET/PATCH + RBAC |
| `backend/app/main.py` | 수정 | — | 라우터 등록 (2줄 추가) |
| `frontend/src/app/backoffice/compliance/page.tsx` | 수정 | 153 | API 연동 + localStorage fallback |

### 2.2 아키텍처

```
Frontend (compliance/page.tsx)
  → GET /api/v1/compliance/checklists/   (마운트 시 로드)
  → PATCH /api/v1/compliance/checklists/ (저장 시 upsert)
  ← localStorage fallback               (API 실패 시)
  → localStorage → 서버 마이그레이션     (첫 로딩, 서버 데이터 없을 때)

Backend
  Router → require_permission("compliance", "full")
  Service → get_latest / upsert + ActivityLog
  Model → ComplianceChecklist (BaseMixin + SoftDeleteMixin)
```

### 2.3 핵심 구현 사항

**백엔드**
- `ComplianceChecklist` 모델: `user_id`(FK), `checklist_type`(default), `items`(JSON), soft delete
- `upsert` 서비스: 기존 데이터 유무에 따라 INSERT/UPDATE 분기, ActivityLog 자동 기록
- RBAC: `require_permission("compliance", "full")` — 백오피스 권한자만 접근

**프론트엔드**
- 마운트 시: `api.get` → 성공하면 서버 데이터 사용, 실패하면 localStorage fallback
- 저장 시: `api.patch` → 성공하면 `showSuccess` + localStorage 제거, 실패하면 localStorage 임시저장 + `showError`
- 마이그레이션: 서버 응답 null + localStorage 존재 → 서버로 PATCH 후 localStorage 삭제

---

## 3. Gap Analysis 이력

### 3.1 초기 분석 (62.5%)

| Gap | 내용 | 원인 |
|-----|------|------|
| Gap 1 | 마운트 시 API GET 미호출 | 프론트엔드 미수정 |
| Gap 2 | 저장 시 API PATCH 미호출 | 프론트엔드 미수정 |
| Gap 3 | localStorage → 서버 마이그레이션 없음 | 프론트엔드 미수정 |

### 3.2 Iteration 1 (62.5% → 100%)

`page.tsx` 1개 파일 수정으로 3개 Gap 전부 해소:
- `useEffect` 내 async `loadChecklist()` 함수로 API 우선 호출 + fallback 패턴 구현
- `handleSave`를 `async`로 전환, `api.patch` 우선 + catch에서 localStorage 임시저장
- 서버 null 응답 시 localStorage 데이터 자동 마이그레이션 로직 추가

---

## 4. 참고 사항

- **Alembic 마이그레이션**: `compliance_checklists` 테이블 마이그레이션 파일이 아직 생성되지 않음. 운영 DB 반영 전 `alembic revision --autogenerate` 실행 필요
- **Plan에 명시된 `GET /history` 엔드포인트**: Design 단계에서 스코프 축소되어 미구현. 향후 감사 이력 조회 기능으로 별도 피처 가능

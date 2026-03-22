# Design: 컴플라이언스 체크리스트 서버 저장 (M2)

## 아키텍처

```
Frontend (compliance/page.tsx)
  → GET /api/v1/compliance/checklists/  (로드)
  → PATCH /api/v1/compliance/checklists/ (저장)
  ← localStorage fallback (API 실패 시)
  → 첫 로딩 시 localStorage → 서버 마이그레이션

Backend
  Router → require_permission("compliance", "full")
  Service → CRUD + ActivityLog
  Model → ComplianceChecklist (BaseMixin + SoftDeleteMixin)
```

## 백엔드

### 1. 모델: `ComplianceChecklist`
- `user_id`: UUID FK (최종 수정자)
- `checklist_type`: String (기본값 "default", 향후 확장용)
- `items`: JSON (체크리스트 항목 배열)
- BaseMixin (id, created_at, updated_at) + SoftDeleteMixin (is_deleted)

### 2. 스키마
- `ComplianceChecklistUpdate`: items 배열 수신
- `ComplianceChecklistResponse`: items + user_id + updated_at 반환

### 3. 라우터: `/api/v1/compliance/checklists/`
- `GET /` — 최신 체크리스트 조회 (없으면 빈 응답)
- `PATCH /` — 체크리스트 upsert (없으면 생성, 있으면 수정)
- RBAC: `require_permission("compliance", "full")`

### 4. 서비스
- `get_latest(db, checklist_type)` → 최신 1건 조회
- `upsert(db, data, user)` → 없으면 INSERT, 있으면 UPDATE + ActivityLog

## 프론트엔드

### compliance/page.tsx 변경
1. 마운트 시: API GET → 성공하면 사용, 실패하면 localStorage fallback
2. 저장 시: API PATCH → 성공하면 "저장 완료", 실패하면 localStorage에 임시 저장 + 에러 표시
3. 첫 로딩 시 localStorage에 데이터가 있고 서버에 없으면 → 서버로 마이그레이션

## 파일 목록
- `backend/app/models/compliance_checklist.py` (신규)
- `backend/app/schemas/compliance.py` (신규)
- `backend/app/services/compliance_service.py` (신규)
- `backend/app/routers/compliance.py` (신규)
- `backend/app/main.py` (라우터 등록)
- `frontend/src/app/backoffice/compliance/page.tsx` (수정)

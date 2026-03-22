# Plan: 컴플라이언스 체크리스트 서버 저장 (M2)

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 컴플라이언스 체크리스트가 브라우저 localStorage에만 저장되어, 기기 변경 시 유실되고 감사 추적 불가 |
| **Solution** | 백엔드 API + DB 테이블 신규 생성으로 서버 저장 전환, localStorage는 오프라인 fallback으로만 유지 |
| **Function/UX Effect** | 다기기 접근 가능, 감사 이력 추적, 데이터 영속성 보장 |
| **Core Value** | 규제 컴플라이언스 요구사항 충족, 감사 대응 가능 |

## 배경

현재 `backoffice/compliance/page.tsx`:
- 체크리스트 항목을 `localStorage.setItem("compliance_checklist", ...)` 으로 저장
- 브라우저/기기 변경 시 데이터 유실
- 누가 언제 체크했는지 감사 추적 불가
- 금융 규제 환경에서 컴플라이언스 기록이 클라이언트에만 존재하는 것은 리스크

## 구현 계획

### 1. 백엔드
1. **모델**: `ComplianceChecklist` 테이블 생성
   - `id`, `user_id`, `checklist_type`, `items` (JSONB), `checked_at`, `created_at`, `updated_at`, `is_deleted`
2. **스키마**: `ComplianceChecklistCreate`, `ComplianceChecklistResponse`
3. **서비스**: CRUD + 이력 조회
4. **라우터**: `/api/v1/compliance/checklists/`
   - `GET /` — 현재 체크리스트 조회
   - `PATCH /` — 체크리스트 업데이트
   - `GET /history` — 변경 이력 조회
5. **RBAC**: `require_permission("compliance", "full")`
6. **Alembic 마이그레이션**

### 2. 프론트엔드
1. `compliance/page.tsx`에서 localStorage → API 호출로 전환
2. 저장 시 `api.patch("/compliance/checklists/", data)`
3. 로딩 시 `api.get("/compliance/checklists/")`
4. 오프라인 fallback: API 실패 시 localStorage 사용, 온라인 복귀 시 동기화

## 영향 범위
- 백엔드: 모델 1개, 스키마 1개, 서비스 1개, 라우터 1개, 마이그레이션 1개
- 프론트엔드: `compliance/page.tsx` 1개 파일

## 위험 요소
- 기존 localStorage 데이터 마이그레이션 필요 (첫 로딩 시 서버로 업로드)
- JSONB 스키마 버전 관리 필요

## 검증 계획
1. 다른 브라우저/기기에서 동일 데이터 접근 확인
2. 변경 이력 조회 확인
3. RBAC 권한 검증 (backoffice만 접근)

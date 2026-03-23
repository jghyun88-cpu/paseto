# fund-lp-management Planning Document

> **Summary**: 조합/LP 마스터데이터 관리 기능 — 조합등록, LP목록/등록 페이지 및 사이드바 메뉴 재구성
>
> **Project**: eLSA (딥테크 액셀러레이터 업무운영시스템)
> **Author**: jghyu
> **Date**: 2026-03-21
> **Status**: Completed (구현 완료 후 등록)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 액셀러레이터의 3대 마스터데이터(스타트업, LP, 조합) 중 LP와 조합의 등록/관리 UI가 부재하여, 조합 결성 및 LP 관리를 시스템에서 수행할 수 없음 |
| **Solution** | 조합등록(상세 폼), LP목록(검색/테이블), LP등록(폼) 3개 신규 페이지 + 사이드바 메뉴 재구성 + Fund 백엔드 모델 확장 |
| **Function/UX Effect** | 스타트업 등록과 동일한 UX 패턴으로 LP/조합을 등록하고, 조합현황에서 등록된 조합 목록을 즉시 확인 가능 |
| **Core Value** | 조합 결성부터 LP 출자 관리까지 시스템 내에서 일원화하여 데이터 정합성과 업무 효율성 확보 |

---

## 1. Overview

### 1.1 Purpose

액셀러레이터 운영에서 스타트업, LP, 조합은 3대 마스터데이터이다. 스타트업 CRUD는 이미 완성되어 있으나, 조합 등록과 LP 개별 관리 기능이 없어 이를 구현한다.

### 1.2 Background

- 기존 조합현황 페이지는 조회만 가능, 등록 기능 없음
- 기존 LP 관리 페이지는 조합별 필터만 가능, 스타트업 목록과 다른 UX
- 사용자(BHV 운영OS) 참고 이미지 기반으로 조합등록 폼 요구

### 1.3 Related Documents

- CLAUDE.md §8 (API 설계 컨벤션)
- 마스터 스펙 §24 (Fund + FundLP + FundInvestment)
- BHV 운영OS 조합등록 화면 (참고 이미지)

---

## 2. Scope

### 2.1 In Scope

- [x] 사이드바 메뉴 재구성 (조합등록, LP목록, LP등록 추가)
- [x] 조합등록 페이지 (`/backoffice/funds/new`) — BHV 이미지 기반
- [x] LP목록 페이지 리스타일 — 스타트업 목록과 동일한 UX
- [x] LP등록 페이지 (`/backoffice/funds/lp/new`) — 스타트업 등록과 동일한 UX
- [x] Fund 백엔드 모델 확장 (17개 신규 컬럼)
- [x] 전체 LP 조회 API (`GET /funds/lps/all`)
- [x] Alembic 마이그레이션

### 2.2 Out of Scope

- 조합 상세/수정 페이지 (향후 구현)
- LP 상세/수정 페이지 (향후 구현)
- LP를 독립 마스터 엔티티로 분리 (현재 FundLP 모델 활용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 조합관리 메뉴에 조합등록, LP목록, LP등록 하위메뉴 추가 | High | Done |
| FR-02 | 조합등록 폼: 기본정보, GP/운용인력(동적 5개), 납입/수익, 주요일자(6개), 보수(4개), 투자의무(동적 5개), 출자자(동적 30개), 기타 | High | Done |
| FR-03 | 조합 등록 후 조합현황 목록에 표시 | High | Done |
| FR-04 | LP목록: 스타트업 목록과 동일한 검색/테이블/등록버튼 UX | High | Done |
| FR-05 | LP등록: 조합 선택 후 LP 정보 입력, 약정/납입 금액 | High | Done |
| FR-06 | Fund 모델에 조합코드, 계정유형, 날짜 6종, 보수 4종 등 확장 | High | Done |
| FR-07 | 전체 LP 조회 API (조합 무관하게 전체 LP 목록) | Medium | Done |
| FR-08 | Fund soft delete (is_deleted + DELETE 엔드포인트 + 목록 필터) | High | Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| UX 일관성 | 스타트업 등록/목록과 동일한 레이아웃 패턴 | 시각적 비교 |
| 데이터 정합성 | 출자자 등록 시 Fund committed_amount 자동 증가 | API 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] 3개 신규 페이지 생성 (조합등록, LP목록, LP등록)
- [x] 사이드바 메뉴 반영
- [x] 백엔드 모델/스키마/서비스/라우터 확장
- [x] Alembic 마이그레이션 파일 생성
- [x] TypeScript 빌드 에러 없음 (신규 파일 기준)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 기존 Fund API 응답 형태 변경으로 기존 페이지 영향 | Medium | Low | 신규 필드 모두 nullable, 기존 응답 호환 |
| Alembic 마이그레이션 충돌 | Medium | Medium | 모든 신규 컬럼 nullable로 추가 |

---

## 6. Architecture Considerations

### 6.1 Project Level

- **Dynamic** (FastAPI + Next.js 14 풀스택)

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| LP 모델 구조 | FundLP(기존) 활용 | 독립 LP 엔티티 분리는 향후 과제 |
| 조합 확장 필드 저장 | DB 컬럼 추가 | GP, 투자의무는 JSON Text 필드로 저장 |
| 전체 LP 조회 | `/funds/lps/all` | fund_id 없이 전체 FundLP 조회 |

---

## 7. Implementation Summary

### 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `frontend/src/lib/menu-data.ts` | Edit | 조합등록, LP목록, LP등록 메뉴 추가 |
| `frontend/src/app/backoffice/funds/page.tsx` | Edit | 조합등록 버튼 추가 |
| `frontend/src/app/backoffice/funds/new/page.tsx` | New | 조합등록 폼 (BHV 스타일) |
| `frontend/src/app/backoffice/funds/lp/page.tsx` | Rewrite | LP목록 (스타트업 목록 스타일) |
| `frontend/src/app/backoffice/funds/lp/new/page.tsx` | New | LP등록 폼 |
| `backend/app/models/fund.py` | Edit | Fund 모델 17개 컬럼 추가 |
| `backend/app/schemas/fund.py` | Rewrite | FundCreate/Update/Response 확장 |
| `backend/app/services/fund_service.py` | Rewrite | create() 함수 신규 필드 매핑 |
| `backend/app/services/fund_lp_service.py` | Edit | get_all_lps() 추가 |
| `backend/app/routers/funds.py` | Edit | GET /funds/lps/all 엔드포인트 |
| `backend/alembic/versions/b2c3d4e5f6g7_...py` | New | 마이그레이션 |

---

## 8. Next Steps

1. [x] Plan 문서 작성
2. [ ] Design 문서 작성 (필요 시)
3. [ ] Gap Analysis 실행 (`/pdca analyze fund-lp-management`)
4. [ ] Docker 재빌드 + Alembic 마이그레이션 실행
5. [ ] 실 화면 동작 테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-21 | 구현 완료 후 Plan 등록 | jghyu |

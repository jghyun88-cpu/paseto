# 단계별 문서 첨부 확장 Planning Document

> **Summary**: 기존 DocumentsTab 재사용 컴포넌트를 심사·백오피스·OI 화면에 확장 배치하여 전 파이프라인 문서 관리 완성
>
> **Project**: eLSA (딥테크 액셀러레이터 운영시스템)
>
> **Date**: 2026-03-25

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 문서 첨부 기능이 소싱(IR/기타)과 보육(멘토링/보고서/PoC)에만 구현되어 있어, 심사(DD/법무), 백오피스(계약), OI(PoC/보고서) 단계에서 문서 관리 불가 |
| **Solution** | 이미 구현된 `DocumentsTab` 컴포넌트를 3개 화면에 추가 배치 (allowedCategories prop 활용) |
| **Function UX Effect** | 각 팀이 자기 단계에 필요한 문서만 카테고리별로 업로드/조회 가능, 단일 기업 ID 기반 데이터룸 완성 |
| **Core Value** | 마스터 스펙 §26 데이터룸 원칙 실현 — 소싱부터 사후관리까지 동일 기업 ID + 동일 데이터룸 |

---

## 1. Context

### 1.1 Purpose

DocumentCategory Enum 8개 카테고리(dd, contract, ir, mentoring, poc, report, legal, other)가 전 파이프라인에서 사용 가능하도록 DocumentsTab을 미배치 화면 3곳에 추가한다.

### 1.2 Background

- **이미 구현**: `DocumentsTab` 컴포넌트 (allowedCategories prop), Document 모델, `/documents/` API CRUD
- **이미 배치**: 소싱 딜 상세 (`ir`, `other`), 보육 상세 (`mentoring`, `report`, `poc`)
- **미배치**: 심사 파이프라인 상세, OI PoC 상세, 백오피스 계약 목록

### 1.3 Related Documents

- 마스터 스펙 §26 (데이터룸)
- `backend/app/models/document.py` — Document 모델
- `frontend/src/components/DocumentsTab.tsx` — 재사용 컴포넌트

---

## 2. Scope

### 2.1 In Scope

- [ ] **심사 파이프라인 상세** (`/review/pipeline/[id]`) — 문서 탭 추가 (dd, ir, legal)
- [ ] **OI PoC 상세** (`/oi/poc/[id]`) — 문서 섹션 추가 (poc, report)
- [ ] **백오피스 계약 목록** (`/backoffice/contracts`) — 계약 상세 진입 + 문서 기능 또는 목록 내 문서 링크 (contract, legal)

### 2.2 Out of Scope

- 새 API 엔드포인트 (기존 `/documents/` API 그대로 사용)
- Document 모델 변경
- 카테고리 Enum 추가

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 심사 파이프라인 상세 페이지에 탭 구조(기본정보/문서/AI분석) 도입, 문서 탭에 `DocumentsTab` (dd, ir, legal) 배치 | High | Pending |
| FR-02 | OI PoC 상세 페이지 하단에 `DocumentsTab` (poc, report) 섹션 추가 | High | Pending |
| FR-03 | 백오피스 계약 목록에서 개별 계약 클릭 시 해당 스타트업의 문서 조회 가능 (contract, legal) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Consistency | 기존 소싱/보육의 DocumentsTab UX와 동일한 패턴 |
| Performance | 기존 `/documents/` API 재사용 — 추가 부하 없음 |

---

## 4. Acceptance Criteria

### 4.1 Definition of Done

- [ ] 심사 파이프라인 상세에서 DD/IR/법무 문서 업로드·조회·다운로드·삭제 가능
- [ ] OI PoC 상세에서 PoC/보고서 문서 업로드·조회 가능
- [ ] 백오피스 계약에서 계약/법무 문서 접근 가능
- [ ] 기존 소싱/보육 문서 탭 정상 동작 유지 (회귀 없음)
- [ ] 빌드 성공

---

## 5. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 심사 상세 페이지 레이아웃 복잡도 증가 | Medium | Low | 탭 구조 도입으로 깔끔하게 분리 |
| PoC 상세 페이지에 startup_id 미보유 | Low | Medium | poc.startup_id 활용 |

---

## 6. Technical Approach

### 6.1 Architecture Decision

기존 `DocumentsTab` 컴포넌트를 **그대로 재사용**. 새 컴포넌트/API 없음.

### 6.2 단계별 카테고리 매핑 (최종)

```
화면                          allowedCategories              비고
───────────────────────────── ────────────────────────────── ───────────
소싱 딜 상세                  ["ir", "other"]                ✅ 완료
보육 상세                     ["mentoring", "report", "poc"] ✅ 완료
심사 파이프라인 상세 (FR-01)  ["dd", "ir", "legal"]          신규
OI PoC 상세 (FR-02)           ["poc", "report"]              신규
백오피스 계약 (FR-03)         ["contract", "legal"]          신규
```

### 6.3 변경 파일 목록

```
frontend/src/app/
├── review/pipeline/[id]/page.tsx   # [수정] 탭 구조 + DocumentsTab 추가
├── oi/poc/[id]/page.tsx            # [수정] 하단에 DocumentsTab 섹션 추가
└── backoffice/contracts/page.tsx   # [수정] 계약 행 클릭 → 문서 보기 또는 별도 상세 페이지
```

### 6.4 구현 순서

```
Step 1: /review/pipeline/[id] — 탭 구조 도입 + DocumentsTab (dd, ir, legal)
        기존 컨텐츠를 "기본정보" 탭으로 래핑, "문서" 탭 추가

Step 2: /oi/poc/[id] — 하단에 DocumentsTab (poc, report) 섹션 추가
        poc.startup_id를 사용하여 해당 스타트업의 문서 표시

Step 3: /backoffice/contracts — 계약 목록에서 스타트업별 문서 접근
        계약 항목에 startup_id가 있으면 DocumentsTab (contract, legal) 표시
```

---

## 7. Implementation Estimate

| Step | Item | Complexity |
|------|------|:----------:|
| 1 | 심사 파이프라인 상세 탭 구조 + 문서 탭 | Low |
| 2 | OI PoC 상세 문서 섹션 | Low |
| 3 | 백오피스 계약 문서 접근 | Low-Medium |

**총 변경**: Frontend 3파일 수정, Backend 변경 없음

---

## 8. Next Steps

1. [ ] 승인 후 Step 1 구현 시작 (심사 파이프라인 상세)
2. [ ] Step 2 구현 (OI PoC 상세)
3. [ ] Step 3 구현 (백오피스 계약)
4. [ ] 전체 빌드 검증

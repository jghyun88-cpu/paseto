# fund-lp-management Gap Analysis

> **Feature**: fund-lp-management (조합/LP 마스터데이터 관리)
> **Date**: 2026-03-21
> **Plan**: docs/01-plan/features/fund-lp-management.plan.md
> **Analyzer**: gap-detector + manual fix

---

## Overall Match Rate

| Category | Items | Matching | Rate |
|----------|:-----:|:--------:|:----:|
| FR Requirements (7) | 7 | 7 | 100% |
| Frontend-Backend Field Mapping | 9 | 9 | 100% |
| Status Values (4) | 4 | 4 | 100% |
| Convention | 10 | 9 | 90% |
| **Overall** | | | **95%** |

---

## 1차 분석 결과 (수정 전): 79%

### 발견된 Gap 5개

| # | Severity | Issue | Status |
|---|----------|-------|:------:|
| 1 | Critical | `funds/page.tsx` FundItem 인터페이스 필드명 불일치 (total_size/committed 등) | Fixed |
| 2 | Critical | STATUS 값 불일치 (fundraising→forming, harvesting→winding_down 등) | Fixed |
| 3 | Medium | formation_date 필수/선택 충돌 (백엔드 required, 프론트 null 전송) | Fixed |
| 4 | Medium | LP 검색 범위 (UI: LP명+담당자, 백엔드: LP명만) | Fixed |
| 5 | Medium | FundLPResponse.fund_name 선언만 있고 미사용 | Fixed |

### 수정 내역

1. **funds/page.tsx**: `total_size→total_amount`, `committed→committed_amount`, `deployed→deployed_amount`, `remaining→remaining_amount`, `vintage_year` 제거, `fund_code`/`formation_date` 추가
2. **STATUS_LABELS/COLORS**: `fundraising→forming`, `harvesting→winding_down`, `closed→dissolved`
3. **FundCreate.formation_date**: `date` → `date | None = None`, Fund 모델도 nullable 변경
4. **fund_lp_service.get_all_lps**: `lp_name` + `contact_name` OR 조건 검색
5. **FundLPResponse**: `fund_name` 필드 제거 (클라이언트 사이드 조인으로 해결)

---

## 2차 분석 결과 (수정 후): 95%

### 잔여 Minor Issues

| # | Severity | Issue | Action |
|---|----------|-------|--------|
| 1 | Low | `funds/new/page.tsx` 443줄 (400줄 초과) | 향후 공통 폼 컴포넌트 추출 |
| 2 | Low | SectionTitle/Field 등 헬퍼 컴포넌트 중복 (2곳) | 향후 리팩토링 |

---

## FR 검증 결과

| FR | Requirement | Status |
|----|-------------|:------:|
| FR-01 | 메뉴 재구성 (조합등록, LP목록, LP등록) | ✅ |
| FR-02 | 조합등록 폼 (8개 섹션, 동적 행) | ✅ |
| FR-03 | 조합 등록 후 목록 표시 | ✅ |
| FR-04 | LP목록 (검색/테이블/등록버튼) | ✅ |
| FR-05 | LP등록 (조합 선택 + LP 정보) | ✅ |
| FR-06 | Fund 모델 17개 컬럼 확장 | ✅ |
| FR-07 | 전체 LP 조회 API | ✅ |

---

## Verdict

Match Rate **95%** >= 90% threshold. Feature ready for report.

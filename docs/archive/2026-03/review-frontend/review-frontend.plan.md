# Plan: 심사팀 Frontend (Phase 3 — Frontend)

> **Feature**: review-frontend
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 3 Frontend — 심사팀 6페이지

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 심사 Backend API 11개가 완성되었으나 UI가 없어 심사원이 실제 업무에 사용할 수 없다. 서류심사·인터뷰·DD·투자메모·IC 결정을 수동(엑셀/이메일)으로 진행 중 |
| **Solution** | 6개 페이지 구현: 심사 파이프라인 대시보드, 서류심사 5축(radar chart), 구조화 인터뷰 8축, DD 10항목 체크리스트, 투자메모 9섹션 에디터, IC 안건 관리 |
| **Function UX Effect** | 5축 radar chart로 평가 결과 즉시 시각화, DD 항목별 토글로 수집 진행률 실시간 확인, IC 결정 시 DealStage 자동 전환으로 후속 프로세스 즉시 연결 |
| **Core Value** | 심사 전 과정을 단일 UI에서 진행 → 팀 간 정보 비대칭 해소, radar chart 기반 정량 비교로 투자 판단 품질 향상 |

---

## 1. 목표 및 범위

### 1.1 목표
Backend API 11개 (reviews 4 + investment-memos 4 + ic-decisions 3)에 대응하는 Frontend 6페이지를 구현하여 심사팀이 실제 업무를 수행할 수 있게 한다.

### 1.2 범위

| 포함 | 제외 |
|------|------|
| 심사 파이프라인 대시보드 | 심사원 개인 대시보드 (Phase 8) |
| 서류심사 5축 폼 + radar chart | AI 자동 채점 |
| 구조화 인터뷰 8축 폼 | 인터뷰 녹음/영상 연동 |
| DD 10항목 체크리스트 | DD 문서 자동 분류/OCR |
| 투자메모 9섹션 에디터 | 리치 텍스트 에디터 (Phase 후기) |
| IC 안건 목록 + 결정 기록 | IC 회의 일정 캘린더 연동 |

### 1.3 완료 기준
- 6개 페이지 모두 렌더링 + API 연동 정상 동작
- 서류심사 → radar chart 실시간 시각화
- DD 체크리스트 PATCH → 진행률 표시
- 투자메모 생성/수정 + status 변경 가능
- IC 결정 POST → 목록 반영
- RBAC: review팀 외 접근 시 권한 없음 처리

---

## 2. 기술 요구사항

### 2.1 신규 페이지 (6개)

| # | 페이지 | 경로 | 핵심 UI | API 연동 |
|---|--------|------|---------|----------|
| 1 | 심사 파이프라인 | `/review/pipeline` | 단계별 카드 + 진행률 바 | GET /reviews/?startup_id= |
| 2 | 서류심사 폼 | `/review/document` | 5축 슬라이더 + radar chart | POST /reviews/ + GET |
| 3 | 구조화 인터뷰 | `/review/interview` | 8축 평가 + 총평 | POST /reviews/ + GET |
| 4 | DD 체크리스트 | `/review/dd` | 10항목 토글 + 이슈 메모 | PATCH /reviews/{id} |
| 5 | 투자메모 작성 | `/review/memo/new` | 9섹션 textarea + proposed_terms JSON | POST /investment-memos/ |
| 6 | IC 안건 관리 | `/review/ic` | 안건 목록 + 결정 폼 모달 | GET/POST /ic-decisions/ |

### 2.2 신규 컴포넌트

| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| RadarChart | `components/charts/RadarChart.tsx` | recharts 기반 5축 radar (재사용) |
| ScoreSlider | `components/forms/ScoreSlider.tsx` | 1-5 범위 슬라이더 + 레이블 |
| DDChecklist | `components/forms/DDChecklist.tsx` | 10항목 토글 체크리스트 |
| MemoEditor | `components/forms/MemoEditor.tsx` | 9섹션 textarea 그룹 |
| ICDecisionModal | `components/forms/ICDecisionModal.tsx` | IC 결정 입력 모달 |
| ReviewPipelineCard | `components/review/PipelineCard.tsx` | 심사 상태 요약 카드 |

### 2.3 Types 추가 (`lib/types.ts`)

```typescript
// Review 관련 타입
interface ReviewItem {
  id: string;
  startup_id: string;
  reviewer_id: string;
  review_type: "document" | "interview" | "dd";
  team_score: number | null;
  problem_score: number | null;
  solution_score: number | null;
  market_score: number | null;
  traction_score: number | null;
  number_literacy: number | null;
  customer_experience: number | null;
  tech_moat: number | null;
  execution_plan: number | null;
  feedback_absorption: number | null;
  cofounder_stability: number | null;
  dd_checklist: Record<string, string> | null;
  risk_log: string | null;
  overall_verdict: string;
  started_at: string;
  completed_at: string | null;
}

interface MemoItem {
  id: string;
  startup_id: string;
  author_id: string;
  version: number;
  overview: string;
  team_assessment: string;
  market_assessment: string;
  tech_product_assessment: string;
  traction: string;
  risks: string;
  value_add_points: string;
  proposed_terms: Record<string, unknown>;
  post_investment_plan: string;
  status: "draft" | "submitted" | "ic_ready";
  created_at: string;
  updated_at: string;
}

interface ICDecisionItem {
  id: string;
  startup_id: string;
  memo_id: string;
  decision: string;
  conditions: string | null;
  monitoring_points: string | null;
  attendees: string[];
  decided_at: string;
  notes: string | null;
}
```

### 2.4 기존 패턴 준수

기존 Sourcing 페이지와 동일한 패턴 적용:

| 패턴 | 적용 방식 |
|------|----------|
| "use client" | 모든 페이지 |
| useEffect + useState | 데이터 페칭 |
| api.get/post/patch | axios 인스턴스 사용 |
| useSearchParams | `?startup_id=` 전달 |
| Tailwind + shadcn/ui | 스타일링 |
| router.push | 페이지 전환 |
| 로딩/에러 상태 | isLoading + try-catch |

---

## 3. 페이지별 상세

### 3.1 심사 파이프라인 (`/review/pipeline`)
- 심사 단계별 스타트업 카드 목록: DEEP_REVIEW → INTERVIEW → DUE_DILIGENCE → IC_PENDING → IC_REVIEW
- 각 카드: 기업명, 심사 유형, 최신 verdict, reviewer
- 카드 클릭 → 해당 심사 상세 이동

### 3.2 서류심사 (`/review/document?startup_id=`)
- 5축 슬라이더 (team, problem, solution, market, traction): 1-5
- 실시간 radar chart 연동 (recharts RadarChart)
- overall_verdict 라디오 (proceed / concern / reject)
- 딥테크 심화 6필드 (접을 수 있는 섹션)
- 제출 → POST /reviews/ (review_type: "document")

### 3.3 구조화 인터뷰 (`/review/interview?startup_id=`)
- 8축 평가 (6축 슬라이더 + 나머지 2축은 인터뷰 8축에서 number_literacy~cofounder_stability)
- overall_verdict 선택
- 제출 → POST /reviews/ (review_type: "interview")

### 3.4 DD 체크리스트 (`/review/dd?startup_id=`)
- 10항목 (법인등기, 주주구조, IP귀속, 재무제표, 소송이력, 인허가, 핵심계약, 노무, 세무, 기술감정)
- 각 항목: pending / completed / issue 토글
- 이슈 항목 클릭 시 메모 입력
- 진행률 바 (completed 수 / 10)
- 전체 completed 시 "DD 완료" 뱃지 자동 표시
- PATCH /reviews/{id} (dd_checklist 업데이트)

### 3.5 투자메모 (`/review/memo/new?startup_id=`)
- 9섹션 textarea (overview ~ post_investment_plan)
- proposed_terms: 투자금액, 밸류에이션, 투자구조(select) 입력
- 상태 변경: draft → submitted → ic_ready (버튼)
- 버전 표시 (자동 증가)
- POST /investment-memos/ + PATCH 상태 변경

### 3.6 IC 안건 관리 (`/review/ic`)
- 안건 목록 테이블: 기업명, 메모 버전, 결정 상태, 날짜
- "새 결정" 버튼 → ICDecisionModal 열기
- 모달: startup_id(검색 select), memo_id(select), decision(5가지), conditions, attendees, notes
- POST /ic-decisions/ → 목록 자동 갱신

---

## 4. 구현 순서

```
Step 1: lib/types.ts에 ReviewItem, MemoItem, ICDecisionItem 타입 추가
Step 2: 공통 컴포넌트 (ScoreSlider, RadarChart)
Step 3: /review/document — 서류심사 5축 + radar chart
Step 4: /review/interview — 구조화 인터뷰 8축
Step 5: /review/dd — DD 10항목 체크리스트
Step 6: /review/memo/new — 투자메모 9섹션
Step 7: /review/ic — IC 안건 + 결정 모달
Step 8: /review/pipeline — 파이프라인 대시보드 (목록 + 라우팅)
Step 9: menu-data.ts에 심사팀 메뉴 추가
```

---

## 5. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Backend Reviews API (4 endpoints) | ✅ 구현 완료 |
| Backend InvestmentMemos API (4 endpoints) | ✅ 구현 완료 |
| Backend ICDecisions API (3 endpoints) | ✅ 구현 완료 |
| recharts | ✅ 설치됨 (v2.14.1) |
| shadcn/ui Button | ✅ 설치됨 |
| lib/api.ts (axios 인스턴스) | ✅ 구현 완료 |
| DashboardLayout + AuthGuard | ✅ 구현 완료 |
| lib/types.ts (기존 타입) | ✅ 존재, 확장 필요 |

---

## 6. 파일 목록 (예상 ~15파일)

### 페이지 (6개)
```
frontend/src/app/review/pipeline/page.tsx
frontend/src/app/review/document/page.tsx
frontend/src/app/review/interview/page.tsx
frontend/src/app/review/dd/page.tsx
frontend/src/app/review/memo/new/page.tsx
frontend/src/app/review/ic/page.tsx
```

### 컴포넌트 (6개)
```
frontend/src/components/charts/RadarChart.tsx
frontend/src/components/forms/ScoreSlider.tsx
frontend/src/components/forms/DDChecklist.tsx
frontend/src/components/forms/MemoEditor.tsx
frontend/src/components/forms/ICDecisionModal.tsx
frontend/src/components/review/PipelineCard.tsx
```

### 수정 (2개)
```
frontend/src/lib/types.ts (ReviewItem, MemoItem, ICDecisionItem 추가)
frontend/src/lib/menu-data.ts (심사팀 메뉴 추가)
```

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| recharts RadarChart 커스터마이징 | 5축 레이블 한글 표시 | recharts CustomLabel 사용 |
| DD 10항목 빈번한 PATCH | 네트워크 부하 | 변경 즉시가 아닌 "저장" 버튼 클릭 시 일괄 PATCH |
| 투자메모 9섹션 긴 텍스트 | UX 복잡 | 각 섹션 접기/펼치기 아코디언 |
| IC 결정 startup/memo 선택 | 관계 데이터 로딩 | startup 선택 → memo 목록 동적 로드 |

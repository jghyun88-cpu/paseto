# Design: 심사팀 Frontend (Phase 3 — Frontend)

> **Feature**: review-frontend
> **Plan Reference**: `docs/01-plan/features/review-frontend.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. TypeScript 타입 (`lib/types.ts` 추가)

```typescript
/** 심사 (서류/인터뷰/DD) */
export interface ReviewItem {
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
  tech_type: string | null;
  scalability_score: number | null;
  process_compatibility: number | null;
  sample_test_status: string | null;
  certification_stage: string | null;
  purchase_lead_time_months: number | null;
  started_at: string;
  completed_at: string | null;
}

/** 투자메모 */
export interface MemoItem {
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

/** IC 결정 */
export interface ICDecisionItem {
  id: string;
  startup_id: string;
  memo_id: string;
  decision: string;
  conditions: string | null;
  monitoring_points: string | null;
  attendees: string[];
  contract_assignee_id: string | null;
  program_assignee_id: string | null;
  decided_at: string;
  notes: string | null;
}

/** DD 체크리스트 항목 상태 */
export type DDStatus = "pending" | "completed" | "issue";

/** DD 10항목 키 */
export const DD_ITEMS = [
  "법인등기", "주주구조", "IP귀속", "재무제표", "소송이력",
  "인허가", "핵심계약", "노무", "세무", "기술감정",
] as const;
```

---

## 2. 공통 컴포넌트 설계

### 2.1 ScoreSlider (`components/forms/ScoreSlider.tsx`)

기존 screening/new의 슬라이더 패턴을 재사용 가능하도록 추출.

```
Props:
  label: string          — "팀 역량" 등
  value: number          — 1~5
  onChange: (v: number) => void
  color?: string         — accent 색상 (기본 blue-600)

UI: label + 값 표시 + range input + 1~5 눈금
```

### 2.2 RadarChart (`components/charts/RadarChart.tsx`)

recharts 기반 5축 레이더 차트.

```
Props:
  data: { axis: string; score: number }[]   — 5항목
  maxScore?: number                         — 기본 5

UI: recharts <RadarChart> + <PolarGrid> + <PolarAngleAxis> + <Radar>
크기: 300x250, 반응형
색상: fill="#3b82f6" opacity={0.3}, stroke="#2563eb"
```

### 2.3 DDChecklist (`components/forms/DDChecklist.tsx`)

```
Props:
  checklist: Record<string, string>     — {"법인등기": "completed", ...}
  onChange: (key: string, status: DDStatus) => void
  disabled?: boolean

UI: 10행 리스트
  각 행: [아이콘] 항목명 | [3-way 토글: pending/completed/issue] | [이슈 시 메모 입력]
  상단: 진행률 바 (completed 수 / 10)
```

### 2.4 MemoEditor (`components/forms/MemoEditor.tsx`)

```
Props:
  sections: Record<string, string>  — {overview: "...", team_assessment: "...", ...}
  onChange: (key: string, value: string) => void
  readOnly?: boolean

UI: 9개 섹션 아코디언
  각 섹션: 제목(한글 레이블) + textarea (rows=4, 자동 확장)
  섹션 레이블: overview→"투자 개요", team_assessment→"팀 평가", ...
```

### 2.5 ICDecisionModal (`components/forms/ICDecisionModal.tsx`)

```
Props:
  open: boolean
  onClose: () => void
  onSubmit: (data: ICDecisionCreate) => Promise<void>
  startups: {id: string; company_name: string}[]   — select 옵션
  memos: {id: string; version: number; startup_id: string}[]

UI: 모달 오버레이
  - startup 선택 (select)
  - memo 선택 (startup 선택 시 필터)
  - decision 라디오 (approved/conditional/on_hold/incubation_first/rejected)
  - conditions textarea
  - attendees 텍스트 (쉼표 구분 → 배열 변환)
  - notes textarea
  - 제출/취소 버튼
```

### 2.6 PipelineCard (`components/review/PipelineCard.tsx`)

```
Props:
  startup: {id: string; company_name: string; ceo_name: string; industry: string}
  reviewCount: number
  latestVerdict: string | null
  onClick: () => void

UI: 카드 (border + shadow)
  기업명(bold) + CEO명 + 산업 태그
  심사 N건 | 최신 판정: proceed/concern/reject (색상 코딩)
```

---

## 3. 페이지 설계

### 3.1 서류심사 (`/review/document`)

```
경로: frontend/src/app/review/document/page.tsx
쿼리: ?startup_id=UUID

레이아웃:
┌────────────────────────────────────────────┐
│ ← 뒤로   서류심사 (5축 평가)                │
├──────────────────┬─────────────────────────┤
│ 5축 슬라이더      │  RadarChart (실시간)     │
│ · 팀 역량         │                         │
│ · 문제 정의       │    ◆ 5축 레이더          │
│ · 솔루션          │                         │
│ · 시장성          │                         │
│ · 트랙션          │                         │
├──────────────────┴─────────────────────────┤
│ overall_verdict: ○ proceed ○ concern ○ rej │
├────────────────────────────────────────────┤
│ ▶ 딥테크 심화 (접기/펼치기)                  │
│   tech_type / scalability / compatibility  │
│   sample_test / certification / lead_time  │
├────────────────────────────────────────────┤
│ [제출]  [취소]                               │
└────────────────────────────────────────────┘

API: POST /api/v1/reviews/ (review_type: "document")
State: scores(5개) + verdict + deeptech(6개) + loading + error
```

### 3.2 구조화 인터뷰 (`/review/interview`)

```
경로: frontend/src/app/review/interview/page.tsx
쿼리: ?startup_id=UUID

레이아웃:
┌────────────────────────────────────────────┐
│ ← 뒤로   구조화 인터뷰 (8축 평가)           │
├────────────────────────────────────────────┤
│ 6축 슬라이더 (ScoreSlider 재사용)            │
│ · 숫자 리터러시    · 고객 경험               │
│ · 기술 해자        · 실행 계획               │
│ · 피드백 흡수력    · 공동창업자 안정성        │
├────────────────────────────────────────────┤
│ overall_verdict: ○ proceed ○ concern ○ rej │
├────────────────────────────────────────────┤
│ [제출]  [취소]                               │
└────────────────────────────────────────────┘

API: POST /api/v1/reviews/ (review_type: "interview")
```

### 3.3 DD 체크리스트 (`/review/dd`)

```
경로: frontend/src/app/review/dd/page.tsx
쿼리: ?startup_id=UUID

레이아웃:
┌────────────────────────────────────────────┐
│ ← 뒤로   DD 체크리스트                      │
├────────────────────────────────────────────┤
│ ████████░░ 7/10 완료 (70%)                  │
├────────────────────────────────────────────┤
│ ✅ 법인등기     [completed ▼]               │
│ ✅ 주주구조     [completed ▼]               │
│ ⚠️ IP귀속      [issue ▼]  메모: ...입력...  │
│ ⬜ 재무제표     [pending ▼]                  │
│ ...                                         │
├────────────────────────────────────────────┤
│ risk_log textarea                           │
│ overall_verdict: ○ proceed ○ concern ○ rej │
├────────────────────────────────────────────┤
│ [저장]  [취소]                               │
└────────────────────────────────────────────┘

동작:
1. 페이지 진입 시 GET /reviews/?startup_id=X&review_type=dd
2. 기존 DD가 있으면 로드, 없으면 빈 체크리스트로 생성 (POST)
3. "저장" 클릭 시 PATCH /reviews/{id} (dd_checklist 전체)
4. 전항목 completed → Backend 자동화 #3 작동 (completed_at 설정)
```

### 3.4 투자메모 (`/review/memo/new`)

```
경로: frontend/src/app/review/memo/new/page.tsx
쿼리: ?startup_id=UUID

레이아웃:
┌────────────────────────────────────────────┐
│ ← 뒤로   투자메모 작성  v1 (draft)          │
├────────────────────────────────────────────┤
│ MemoEditor (9섹션 아코디언)                  │
│ ▼ 투자 개요                                 │
│   [textarea]                                │
│ ▶ 팀 평가 (접힌 상태)                        │
│ ▶ 시장 평가                                 │
│ ... (총 9개)                                │
├────────────────────────────────────────────┤
│ 투자 조건 (proposed_terms)                   │
│ 투자금액: [input number]  원                 │
│ 밸류에이션: [input number]  원               │
│ 투자구조: [select: common_stock/rcps/safe..] │
├────────────────────────────────────────────┤
│ [임시저장(draft)] [제출(submitted)] [취소]    │
└────────────────────────────────────────────┘

API:
- POST /investment-memos/ (신규)
- PATCH /investment-memos/{id} (수정/상태변경)
```

### 3.5 IC 안건 관리 (`/review/ic`)

```
경로: frontend/src/app/review/ic/page.tsx

레이아웃:
┌────────────────────────────────────────────┐
│ IC 안건 관리                  [+ 새 결정]    │
├────────────────────────────────────────────┤
│ 기업명      | 메모 버전 | 결정    | 날짜     │
│ 테스트딥테크 | v1       | approved| 03.16   │
│ AI바이오    | v2        | on_hold | 03.15   │
│ ...                                         │
└────────────────────────────────────────────┘
  [+ 새 결정] → ICDecisionModal 열기

API:
- GET /ic-decisions/?startup_id= (목록, 전체 or 필터)
- POST /ic-decisions/ (새 결정)
- GET /startups/?page_size=100 (startup select 데이터)
- GET /investment-memos/?startup_id= (memo select 데이터)
```

### 3.6 심사 파이프라인 (`/review/pipeline`)

```
경로: frontend/src/app/review/pipeline/page.tsx

레이아웃:
┌────────────────────────────────────────────┐
│ 심사 파이프라인                              │
├─────────┬─────────┬─────────┬──────────────┤
│ 심층검토  │ 인터뷰   │ DD      │ IC 대기      │
│ (3건)    │ (2건)   │ (1건)   │ (2건)        │
├─────────┼─────────┼─────────┼──────────────┤
│ [카드]   │ [카드]   │ [카드]  │ [카드]        │
│ [카드]   │ [카드]   │         │ [카드]        │
│ [카드]   │         │         │              │
└─────────┴─────────┴─────────┴──────────────┘

카드 클릭 → /startup/{id}로 이동

COLUMNS:
- deep_review (심층검토)
- interview (인터뷰)
- due_diligence (DD)
- ic_pending (IC 대기)
- ic_review (IC 심의 중)

API: GET /startups/?page_size=200 → current_deal_stage로 그룹핑
패턴: 기존 sourcing/pipeline과 동일 (KanbanBoard 재사용 가능하나 읽기 전용)
```

---

## 4. 구현 순서

```
Step 1: lib/types.ts 타입 추가
        — ReviewItem, MemoItem, ICDecisionItem, DD_ITEMS

Step 2: components/forms/ScoreSlider.tsx
        — 재사용 가능한 1-5 슬라이더

Step 3: components/charts/RadarChart.tsx
        — recharts 5축 레이더

Step 4: /review/document/page.tsx
        — 서류심사 5축 폼 + RadarChart 연동

Step 5: /review/interview/page.tsx
        — 구조화 인터뷰 6축 폼

Step 6: components/forms/DDChecklist.tsx + /review/dd/page.tsx
        — DD 10항목 체크리스트 + PATCH 연동

Step 7: components/forms/MemoEditor.tsx + /review/memo/new/page.tsx
        — 투자메모 9섹션 에디터

Step 8: components/forms/ICDecisionModal.tsx + /review/ic/page.tsx
        — IC 안건 목록 + 결정 모달

Step 9: components/review/PipelineCard.tsx + /review/pipeline/page.tsx
        — 심사 파이프라인 대시보드

Step 10: menu-data.ts 확인 (이미 심사팀 메뉴 등록됨)
```

---

## 5. API 연동 매핑

| 페이지 | HTTP | Endpoint | 용도 |
|--------|------|----------|------|
| document | POST | /reviews/ | 서류심사 생성 |
| interview | POST | /reviews/ | 인터뷰 생성 |
| dd | GET | /reviews/?startup_id=X&review_type=dd | 기존 DD 로드 |
| dd | POST | /reviews/ | DD 신규 생성 |
| dd | PATCH | /reviews/{id} | DD 항목 업데이트 |
| memo/new | POST | /investment-memos/ | 투자메모 생성 |
| memo/new | PATCH | /investment-memos/{id} | 상태 변경 |
| ic | GET | /ic-decisions/?startup_id= | IC 결정 목록 |
| ic | POST | /ic-decisions/ | IC 결정 생성 |
| pipeline | GET | /startups/?page_size=200 | 스타트업 목록 |

---

## 6. 파일 목록 (14파일)

### 신규 페이지 (6개)
```
frontend/src/app/review/document/page.tsx
frontend/src/app/review/interview/page.tsx
frontend/src/app/review/dd/page.tsx
frontend/src/app/review/memo/new/page.tsx
frontend/src/app/review/ic/page.tsx
frontend/src/app/review/pipeline/page.tsx
```

### 신규 컴포넌트 (6개)
```
frontend/src/components/forms/ScoreSlider.tsx
frontend/src/components/charts/RadarChart.tsx
frontend/src/components/forms/DDChecklist.tsx
frontend/src/components/forms/MemoEditor.tsx
frontend/src/components/forms/ICDecisionModal.tsx
frontend/src/components/review/PipelineCard.tsx
```

### 수정 (2개)
```
frontend/src/lib/types.ts (ReviewItem, MemoItem, ICDecisionItem, DD_ITEMS 추가)
frontend/src/lib/menu-data.ts (확인 — 이미 심사팀 메뉴 존재)
```

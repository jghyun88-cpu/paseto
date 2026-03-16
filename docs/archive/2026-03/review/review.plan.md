# Plan: 심사팀 모듈 (Phase 3)

> **Feature**: review
> **Author**: eLSA Dev Team
> **Created**: 2026-03-16
> **Status**: Draft
> **Phase**: Phase 3 — 심사팀 모듈

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 심사 과정이 구두/이메일 기반이라 심사 기준 일관성 부족, 투자메모가 개인별 자유 양식이라 IC 비교 어려움, DD 자료 수집 상태 추적 불가 |
| **Solution** | 서류심사 5축 정량 평가 + 구조화 인터뷰 8축 + DD 10항목 체크리스트 + 투자메모 9섹션 표준 + IC 결과 자동 분기 + 딥테크 심화 6필드 |
| **Function UX Effect** | 심사 파이프라인 진행률 프로그레스바, 5축 radar chart 자동 시각화, DD 10개 전체 수령 시 자동 완료 전환, 투자메모에 이전 심사 데이터 자동 프리필, IC 승인 시 계약+보육 인계 동시 자동 생성 |
| **Core Value** | 심사 기준 표준화로 투자 판단 품질 향상, DD 10항목 100% 수령 없이 IC 상정 불가 → 리스크 차단, IC 결정→후속 프로세스 자동 분기로 인계 지연 제로 |

---

## 1. 목표 및 범위

### 1.1 Phase 3 목표
심사팀의 전체 업무(서류심사 → 인터뷰 → DD → 투자메모 → IC)를 표준화된 디지털 워크플로우로 전환하여, 심사 일관성 + DD 완결성 + IC 결정 자동 분기를 달성한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| Review 3종 (서류/인터뷰/DD) CRUD + 5축 radar | 양식 엔진 범용화 (Phase 2.5) |
| InvestmentMemo 9섹션 + 버전 관리 | 자동 요약 생성 AI (확장) |
| ICDecision 5개 결정 유형 + 자동 분기 | OPS-F01/PRG-F01 자동 생성 (Phase 4/5) |
| DD 10항목 체크리스트 + 자동 완료 감지 | 고급 밸류에이션 모델링 |
| 딥테크 심화 6필드 (§27) | Celery 스케줄 자동화 (Phase 7) |
| 심사 파이프라인 대시보드 | 심사팀→백오피스 인계 자동화 (Phase 4) |

### 1.3 완료 기준
- 서류심사 5축 제출 → radar chart 시각화
- 구조화 인터뷰 8축 제출 + 저장
- DD 10항목 체크리스트 상태 추적 (완료/이슈/미완료)
- DD 10개 전체 수령 → 자동 완료 전환 (자동화 #3)
- 투자메모 9섹션 작성 + draft→submitted→ic_ready 상태 관리
- IC 결정 기록 (5개 유형) + DealStage 자동 전환

---

## 2. 기술 요구사항

### 2.1 Backend 신규 모델 (3개)

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| Review | `models/review.py` | reviewer_id, review_type(document/interview/dd), 5축 점수, 8축 인터뷰, dd_checklist(JSON), 딥테크 6필드, overall_verdict |
| InvestmentMemo | `models/investment_memo.py` | author_id, version, 9개 섹션 텍스트, proposed_terms(JSON), status(draft/submitted/ic_ready) |
| ICDecision | `models/ic_decision.py` | memo_id, decision(ICDecisionType), conditions, attendees(JSON), contract_assignee_id, program_assignee_id |

### 2.2 Backend 신규 API (11개 엔드포인트)

| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/reviews/?startup_id=&type=` | 심사 목록 | review_dd_memo: read |
| GET | `/api/v1/reviews/{id}` | 심사 상세 | review_dd_memo: read |
| POST | `/api/v1/reviews/` | 심사 생성 (서류/인터뷰/DD) | review_dd_memo: full |
| PATCH | `/api/v1/reviews/{id}` | 심사 수정 (DD 항목 업데이트) | review_dd_memo: full |
| GET | `/api/v1/investment-memos/?startup_id=` | 투자메모 목록 | review_dd_memo: read |
| GET | `/api/v1/investment-memos/{id}` | 투자메모 상세 | review_dd_memo: read |
| POST | `/api/v1/investment-memos/` | 투자메모 생성 | review_dd_memo: full |
| PATCH | `/api/v1/investment-memos/{id}` | 투자메모 수정 (상태 변경 포함) | review_dd_memo: full |
| GET | `/api/v1/ic-decisions/?startup_id=` | IC 결정 목록 | ic_decision: read (backoffice) |
| POST | `/api/v1/ic-decisions/` | IC 결정 기록 | ic_decision: write (review) |
| GET | `/api/v1/ic-decisions/{id}` | IC 결정 상세 | ic_decision: read |

### 2.3 Backend 신규 서비스 (3개)

| 서비스 | 핵심 로직 |
|--------|-----------|
| `review_service.py` | 3종 심사 CRUD, DD 체크리스트 자동 완료 감지(#3), radar 데이터 생성 |
| `investment_memo_service.py` | 9섹션 CRUD, 버전 관리, 이전 심사 데이터 프리필, 상태 관리 |
| `ic_decision_service.py` | IC 결정 기록, DealStage 자동 전환, 결정별 분기(approved→CONTRACT, rejected→REJECTED 등) |

### 2.4 Frontend 신규 페이지 (6개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| 심사 파이프라인 | `/review/pipeline` | 단계별 진행률 대시보드 |
| 서류심사 폼 | `/review/document?startup_id=` | 5축 슬라이더 + radar chart |
| 구조화 인터뷰 | `/review/interview?startup_id=` | 8축 평가 폼 |
| DD 체크리스트 | `/review/dd?startup_id=` | 10항목 토글 + 이슈 메모 |
| 투자메모 작성 | `/review/memo/new?startup_id=` | 9섹션 텍스트 에디터 |
| IC 안건 관리 | `/review/ic` | 안건 목록 + 결정 기록 폼 |

### 2.5 Alembic 마이그레이션
```
reviews (FK: startup_id, reviewer_id → users)
  ↓
investment_memos (FK: startup_id, author_id → users)
  ↓
ic_decisions (FK: startup_id, memo_id → investment_memos)
```

---

## 3. 핵심 자동화

### 자동화 #3: DD 자동 완료
INV-F01 10개 항목 전체 수령 → Review(dd).completed_at 자동 설정 + DealStage → IC_PENDING 전환

### 자동화 #4: IC 승인 분기 (Phase 3에서는 DealStage 전환만)
IC 결정에 따른 DealStage 자동 전환:
- approved → CONTRACT
- conditional → CONDITIONAL
- on_hold → ON_HOLD
- incubation_first → INCUBATION_FIRST
- rejected → REJECTED

(OPS-F01/PRG-F01 자동 생성은 Phase 4/5에서 구현)

---

## 4. 딥테크 심화 필드 (§27)

Review 모델에 추가되는 6개 전용 필드:
| 필드 | 타입 | 설명 |
|------|------|------|
| tech_type | str | paper_tech / engineering / mixed |
| scalability_score | int(1-5) | 양산성/스케일업 가능성 |
| process_compatibility | int(1-5) | 고객사 공정 적합성 |
| sample_test_status | str | not_started / in_progress / passed / failed |
| certification_stage | str | 인증/신뢰성 테스트 단계 |
| purchase_lead_time_months | int | 구매전환 리드타임 (월) |

---

## 5. 구현 순서

```
Step 1: Review + InvestmentMemo + ICDecision 모델 생성 + Alembic 마이그레이션
Step 2: review_service 생성 (3종 심사 CRUD + DD 자동 완료 #3)
Step 3: investment_memo_service 생성 (9섹션 + 버전 + 상태)
Step 4: ic_decision_service 생성 (결정 + DealStage 자동 전환 #4)
Step 5: schemas (review, investment_memo, ic_decision)
Step 6: routers (reviews, investment_memos, ic_decisions) + main.py 등록
Step 7: Backend 통합 테스트 (11개 엔드포인트)
Step 8: Frontend 심사 파이프라인 + 서류심사(5축 radar) + 인터뷰(8축)
Step 9: Frontend DD 체크리스트 + 투자메모 + IC 관리
Step 10: 통합 테스트 + Gap 분석
```

---

## 6. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1 (인증 + Startup CRUD) | ✅ 완료 (95%) |
| Phase 2 (소싱팀 — Screening, Handover) | ✅ 완료 (92%) |
| Startup 모델 | ✅ 구현됨 |
| DealFlow 서비스 (move_stage) | ✅ 구현됨 |
| Notification 서비스 | ✅ 구현됨 |
| ActivityLog 서비스 | ✅ 구현됨 |
| RBAC (review_dd_memo, ic_decision) | ✅ 구현됨 |
| recharts (radar chart) | ✅ 설치됨 |

---

## 7. 파일 목록 (예상)

### Backend (신규 ~12파일)
```
backend/app/models/review.py
backend/app/models/investment_memo.py
backend/app/models/ic_decision.py
backend/app/schemas/review.py
backend/app/schemas/investment_memo.py
backend/app/schemas/ic_decision.py
backend/app/services/review_service.py
backend/app/services/investment_memo_service.py
backend/app/services/ic_decision_service.py
backend/app/routers/reviews.py
backend/app/routers/investment_memos.py
backend/app/routers/ic_decisions.py
```

### Frontend (신규 6+페이지)
```
frontend/src/app/review/pipeline/page.tsx
frontend/src/app/review/document/page.tsx
frontend/src/app/review/interview/page.tsx
frontend/src/app/review/dd/page.tsx
frontend/src/app/review/memo/new/page.tsx
frontend/src/app/review/ic/page.tsx
```

### 수정
```
backend/app/models/__init__.py (Review, InvestmentMemo, ICDecision 추가)
backend/app/main.py (3개 라우터 등록)
backend/app/errors.py (review/memo/ic 에러 추가)
```

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Review 모델 필드 수 과다 (20+) | 복잡성 증가 | review_type별 분리 검증 (document/interview/dd) |
| 투자메모 9섹션 긴 텍스트 | 에디터 UX | textarea + 가이드 텍스트로 단순화, Phase 후기에 리치 에디터 검토 |
| IC 결정 자동 분기 복잡도 | DealStage 상태 불일치 | DealStage 상태 머신을 서비스 레이어에서 엄격하게 관리 |
| DD 10항목 수령 추적 | JSON 필드 업데이트 빈번 | PATCH API로 개별 항목 업데이트 지원 |

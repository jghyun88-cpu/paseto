# Gap Analysis: 심사팀 모듈 (review)

> **Feature**: review
> **Design Reference**: `docs/02-design/features/review.design.md`
> **Analyzed**: 2026-03-16
> **Match Rate**: 95%

---

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | review (심사팀 모듈 Phase 3) |
| 분석일 | 2026-03-16 |
| Match Rate | **95%** |
| 설계 항목 수 | 20 |
| 구현 완료 | 19 |
| Gap 항목 | 1 |
| 관련 파일 수 | 12 |

---

## 1. 설계 vs 구현 매칭 상세

### Step 1: 모델 3개 + Alembic 마이그레이션

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|------|------|
| Review 모델 (20+ 필드) | `backend/app/models/review.py` | ✅ Match | 서류5축 + 인터뷰6축 + DD + 딥테크 심화 전체 구현 |
| InvestmentMemo 모델 (9섹션) | `backend/app/models/investment_memo.py` | ✅ Match | 9개 필수 섹션 + version + status |
| ICDecision 모델 | `backend/app/models/ic_decision.py` | ✅ Match | ICDecisionType Enum 사용, attendees JSON |
| Alembic 마이그레이션 | `backend/alembic/versions/bccabceb7251_phase3_review_memo_ic.py` | ✅ Match | 3개 테이블 생성 마이그레이션 |

### Step 2: 스키마 3개

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|------|------|
| ReviewCreate/Update/Response | `backend/app/schemas/review.py` | ✅ Match | Field(ge=1, le=5) 검증 포함 |
| MemoCreate/Update/Response | `backend/app/schemas/investment_memo.py` | ✅ Match | 9섹션 + status |
| ICDecisionCreate/Response | `backend/app/schemas/ic_decision.py` | ✅ Match | - |

### Step 3: 서비스 3개

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|------|------|
| review_service (CRUD + DD 자동완료 #3) | `backend/app/services/review_service.py` | ✅ Match | DD 전항목 completed → completed_at + DealStage IC_PENDING |
| investment_memo_service (CRUD + 버전관리) | `backend/app/services/investment_memo_service.py` | ✅ Match | version=latest+1 자동 산정 |
| ic_decision_service (결정 + DealStage #4) | `backend/app/services/ic_decision_service.py` | ✅ Match | 5개 decision→stage 매핑 완료 |

### Step 4: 라우터 3개 + main.py + errors.py

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|------|------|
| Reviews API (4 endpoints) | `backend/app/routers/reviews.py` | ✅ Match | GET list, GET detail, POST, PATCH |
| InvestmentMemos API (4 endpoints) | `backend/app/routers/investment_memos.py` | ✅ Match | GET list, GET detail, POST, PATCH |
| ICDecisions API (3 endpoints) | `backend/app/routers/ic_decisions.py` | ✅ Match | GET list, GET detail, POST |
| main.py 라우터 등록 | `backend/app/main.py` | ✅ Match | 3개 라우터 등록, prefix/tags 설정 |
| errors.py 에러 함수 | `backend/app/errors.py` | ✅ Match | review_not_found, memo_not_found, ic_decision_not_found |

### Step 5: Backend 통합 테스트

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|------|------|
| 11개 엔드포인트 통합 테스트 | - | ❌ **Gap** | 테스트 파일 미작성 |

---

## 2. 자동화 로직 검증

| 자동화 | 설계 | 구현 상태 | 비고 |
|--------|------|----------|------|
| #3: DD 10항목 전체 completed → 자동완료 | PATCH reviews 시 dd_checklist 전항목 completed → completed_at + DealStage IC_PENDING | ✅ 구현 | `review_service.py:86-96` |
| #4: IC 결정 → DealStage 자동 전환 | POST ic-decisions 시 decision별 stage 전환 | ✅ 구현 | `ic_decision_service.py:17-23, 70-76` |

---

## 3. RBAC 검증

| API | 설계 권한 | 구현 권한 | 상태 |
|-----|----------|----------|------|
| Reviews CRUD | review_dd_memo: read/full | review_dd_memo: read/full | ✅ Match |
| InvestmentMemos CRUD | review_dd_memo: read/full | review_dd_memo: read/full | ✅ Match |
| ICDecisions GET | ic_decision: read | ic_decision: read | ✅ Match |
| ICDecisions POST | ic_decision: write | ic_decision: write | ✅ Match |

---

## 4. Gap 목록

### GAP-1: Backend 통합 테스트 미작성 (Severity: MEDIUM)

- **설계**: Step 5에서 11개 엔드포인트 통합 테스트 명시
- **현황**: `backend/tests/` 아래 review/memo/ic 관련 테스트 파일 없음
- **영향**: 기능 동작 검증 증거 부재, 회귀 방지 불가
- **권장 조치**: pytest + httpx 기반 테스트 작성 (11개 엔드포인트)

---

## 5. 결론

| 지표 | 값 |
|------|-----|
| **Match Rate** | **95%** (19/20 항목 통과) |
| 모델 완성도 | 100% (3/3) |
| 스키마 완성도 | 100% (3/3) |
| 서비스 완성도 | 100% (3/3, 자동화 #3 #4 포함) |
| 라우터 완성도 | 100% (3/3 + main.py + errors.py) |
| 테스트 완성도 | 0% (0/1) |
| RBAC 일치율 | 100% |

**판정**: Match Rate 95% >= 90% 기준 충족. 테스트 보완 권장.

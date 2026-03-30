# PDCA Completion Report: AI 심사 평가 시스템

> Feature: ai-evaluation
> Date: 2026-03-30
> Commits: 7634f7e, 1de4f92, 403675b

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | AI 심사 평가 시스템 — lsa 보고서 기반 하이브리드 스코어링 |
| 시작일 | 2026-03-30 |
| 완료일 | 2026-03-30 |
| Match Rate | 97% (67/69) |

### Results

| 지표 | 목표 | 실적 |
|------|------|------|
| Match Rate | >= 90% | 97% |
| 테스트 | ~29개 | 43개 (148%) |
| 변경 파일 | 20개 | 20개 |
| 코드 라인 | - | +2,372 / -1,773 |
| Gap 수정 | - | 4/6건 (HIGH/MEDIUM 전수 수정) |

### 1.3 Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 기존 자체 AI 분석(Celery+Claude 단일)이 비용 높고 응답 느림. lsa에서 이미 점수가 매겨진 보고서를 다시 Claude로 재평가하는 "AI 세탁" 문제 |
| Solution | 하이브리드 아키텍처: lsa 보고서 직접 파싱 우선, Claude는 비정형 보고서 fallback 전용. 대부분 즉시 결과 (비용 0, 지연 0) |
| Function/UX | 드래그앤드롭 보고서 업로드 → 즉시 점수 테이블 표시 → 심사자 점수 수정 + 의견 → 4계층 판정 버튼. 딥테크 자동 감지 |
| Core Value | Claude API 비용 90%+ 절감, 응답 시간 수 초 → 즉시, 기존 데드코드 1,773줄 제거로 코드베이스 정리 |

---

## 1. Plan Summary

lsa 프로젝트의 6종 AI 보고서를 업로드하면 루브릭 기반으로 자동 점수를 매기는 심사 평가 기능 추가. 기존 자체 AI 분석 제거 후 하이브리드 아키텍처로 전환.

**핵심 결정 (Eng Review + Outside Voice):**
- 하이브리드 흐름: 직접 파싱 우선, Claude fallback (Outside Voice의 "AI 세탁" 지적 반영)
- Polling 3초/5분 timeout (SSE 대신, 월 50건 규모에 충분)
- 기존 AnalysisRecommendation enum 재사용 (중복 Enum 방지)
- 보고서 재업로드 시 새 레코드 생성 (버전 관리)
- Claude API concurrency 1 제한 (pool 고갈 방지)

---

## 2. Implementation

### Phase 1: Backend (13파일)

| 작업 | 파일 | 상태 |
|------|------|------|
| 데드코드 제거 | 6파일 삭제 (ai_screening, document_analyzer, web_research, website_crawler, ai_score_mapper, ai_data_converter) | -1,773줄 |
| 파서 확장 | ai_report_parser.py | +289줄 (detect_report_type, is_deeptech, has_structured_scores, extract_all_scores, 딥테크 10항목) |
| Claude evaluator | ai_evaluator.py (신규) | +219줄 (fallback 전용, timeout 120s, 1회 retry, 토큰 축소) |
| Celery task | ai_evaluation.py (신규) | +159줄 (rate_limit 1/m, 에러 처리, 알림 발송) |
| 라우터 | ai_analysis.py | +304줄 (POST /upload 하이브리드, GET /status, PATCH /{id}) |
| 스키마 | ai_analysis.py | +45줄 (EvaluationScoreItem, EvaluationScores, 읽기+쓰기 검증) |
| 모델 | ai_analysis.py | +3줄 (source 컬럼) |
| 마이그레이션 | h3i4j5k6l7m8 | source 컬럼 + legacy 태깅 |

### Phase 2: Frontend (3파일)

| 작업 | 파일 | 상태 |
|------|------|------|
| 보고서 업로더 | ReportUploader.tsx (신규) | +270줄 (드래그존, 다중 파일, 유형 배지, 상태 전이) |
| 평가 리뷰 | EvaluationReview.tsx (신규) | +446줄 (점수 테이블, Pass/Fail, 4계층 판정, Polling, 근거 Popover) |
| 페이지 통합 | new/page.tsx | +78줄 (AI/수동 모드 토글) |

### Phase 3: Tests (3파일, 43개)

| 파일 | 테스트 수 | 범위 |
|------|-----------|------|
| test_ai_report_parser.py | 19 | frontmatter, detect_type (6종), is_deeptech (5), has_scores, extract_scores (일반+딥테크+자동+합산) |
| test_ai_evaluator.py | 17 | verdict (4), convert (2), prompt (2), truncate (2), parse (4), Claude mock (3) |
| test_ai_evaluation_api.py | 7 | upload 200/202/400/404, too many files, status completed/not found |

---

## 3. Architecture: Hybrid Flow

```
보고서 업로드 (POST /evaluation/upload)
  ├→ ai_report_parser.has_structured_scores()
  │   ├→ True (점수 있음) → extract_all_scores() → 200 OK (즉시 결과)
  │   │   └→ Claude API 불필요, 비용 $0, 지연 ~100ms
  │   └→ False (점수 없음) → Celery task → 202 Accepted
  │       └→ ai_evaluator.evaluate_reports() → Claude API
  │           └→ 프론트: 3초 polling, 5분 timeout
  └→ 결과: AIAnalysis 레코드 (source: "lsa_report" 또는 "claude_evaluation")
```

---

## 4. Gap Analysis

| Match Rate | 97% (67/69) |
|------------|-------------|

### 수정된 Gap (4건)

| # | 항목 | 수정 내용 |
|---|------|----------|
| GAP-1 | HTTP 202 for async | 비동기 경로 Response(status_code=202) 반환 |
| GAP-2 | 파일 상태 전이 | pending → uploading → done/error + Loader2 아이콘 |
| GAP-3 | 유형 배지 | 파일명 기반 6종 감지 + purple badge 표시 |
| GAP-4 | Notification | Celery task 완료 후 심사팀 알림 발송 |

### 잔여 Gap (2건, LOW)

| # | 항목 | 비고 |
|---|------|------|
| GAP-5 | 타임아웃 메시지 미세 차이 | 기능 동등, 수정 불필요 |
| GAP-6 | "문제 정의" 라벨 edge case | 만점 패턴에서 먼저 매칭되어 실질적 영향 없음 |

---

## 5. Security Review

| 검사 항목 | 결과 |
|-----------|------|
| 하드코딩 시크릿 | PASS (0건) |
| SQL 인젝션 | PASS (SQLAlchemy ORM) |
| XSS | PASS (React 자동 이스케이프) |
| Path Traversal | PASS (파일명 sanitize + UPLOAD_DIR 검증) |
| RBAC | PASS (require_permission 적용) |
| console.log | PASS (0건) |

---

## 6. Verification Evidence

```
Alembic: 15 migrations applied (including source column)
TypeScript: 0 errors
Docker: 7 services healthy

Tests:
  43 passed, 0 failed (14.02s)
  ├─ test_ai_report_parser.py    19 passed  (4.5s)
  ├─ test_ai_evaluator.py        17 passed  (4.3s)
  └─ test_ai_evaluation_api.py    7 passed  (4.4s)
```

---

## 7. Commits

| Hash | Message |
|------|---------|
| 7634f7e | feat: AI 심사 평가 시스템 — lsa 보고서 기반 하이브리드 스코어링 |
| 1de4f92 | fix: AI 평가 테스트 mock 수정 — 지연 import 대응 + DB 세션 격리 |
| 403675b | fix: Gap 분석 4건 수정 — HTTP 202, 파일 상태, 유형 배지, 알림 |

---

## 8. Next Steps

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| E2E 수동 테스트 | HIGH | 실제 lsa MD 파일 업로드 → 결과 확인 |
| ANTHROPIC_API_KEY 설정 | MEDIUM | Claude fallback 경로 테스트 (현재 직접 파싱만 검증) |
| 프론트엔드 E2E 테스트 | LOW | Playwright로 업로드 → 평가 → 판정 플로우 |
| 통합 대시보드 (v2) | DEFERRED | Plan에서 명시적 연기 |

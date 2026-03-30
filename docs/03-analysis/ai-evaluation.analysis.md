# Gap Analysis: AI 심사 평가 시스템

> Feature: ai-evaluation
> Date: 2026-03-30
> Plan: ~/.claude/plans/tidy-swimming-clover.md

## Match Rate: 97% (67/69)

Gap 4건 수정 후 최종 Match Rate.

## Matched Items (67/69)

### Phase 1: Backend
- 1.1 데드코드 6파일 제거 (6/6)
- 1.2 ai_report_parser.py 확장 (7/7): detect_report_type, is_deeptech, has_structured_scores, extract_all_scores, 딥테크 10항목, 6종 매핑
- 1.3 ai_evaluator.py (6/6): evaluate_reports, calculate_verdict, convert_scores, truncation, JSON 파싱, 부분 결과
- 1.4 tasks/ai_evaluation.py (5/5): Celery task, rate_limit, 에러 처리, 알림 발송
- 1.5 routers/ai_analysis.py (10/10): POST upload 하이브리드, GET status, PATCH verdict, 파일 검증, 경로 보안, 버전 관리, HTTP 202
- 1.6 schemas/ai_analysis.py (7/7): ScoreItem, Scores, UploadResponse, StatusResponse, source, 읽기 검증
- 1.7 models/ai_analysis.py (1/1): source 컬럼
- 1.8 Alembic 마이그레이션 (1/1): source + legacy 태깅
- Enum 재사용 (1/1): AnalysisRecommendation

### Phase 2: Frontend
- ReportUploader.tsx (7/7): 드래그존, 파일선택, 다중 파일, MD/PDF, FormData, 상태 전이, 유형 배지
- EvaluationReview.tsx (11/11): Pass/Fail, 점수 테이블, Override, 근거 Popover, 총점, 판정 배지, 의견, 4계층 버튼, 확인 모달, Polling, 스켈레톤
- 페이지 통합 (3/3): 모드 토글, AI 경로, 전환 링크

### Phase 3: Tests
- test_ai_report_parser.py: 19 tests
- test_ai_evaluator.py: 17 tests
- test_ai_evaluation_api.py: 7 tests
- Total: 43 tests (plan target: ~29)

### Key Decisions
- 하이브리드 흐름: 직접 파싱 → Claude fallback
- Polling 3초/5분 timeout (SSE 아님)
- AnalysisRecommendation 재사용 (새 Enum 없음)
- 보고서 버전 관리: 새 레코드 생성
- Celery rate_limit: 1/m

## Remaining Gaps (2건, Low)

| # | 항목 | 심각도 | 비고 |
|---|------|--------|------|
| GAP-5 | 타임아웃 메시지 미세 차이 | LOW | "문제 발생" vs "문제가 발생했습니다" — 기능 동등 |
| GAP-6 | "문제 정의" 라벨 매칭 edge case | LOW | 일부 보고서에서 "문제 정의 명확성" 사용 시 간이 패턴 미매칭 가능 |

## Test Results

```
43 passed, 0 failed (14.02s)
├─ test_ai_report_parser.py    19 passed
├─ test_ai_evaluator.py        17 passed
└─ test_ai_evaluation_api.py    7 passed
```

## Verification

- Alembic: 15 migrations applied (source 컬럼 포함)
- TypeScript: 0 errors
- Docker: 모든 서비스 정상 기동

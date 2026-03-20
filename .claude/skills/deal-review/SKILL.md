---
name: deal-review
description: 투자 심사 풀 사이클을 자동으로 실행합니다 (스크리닝 → IR 분석 → 투자 메모 → 멘토 매칭)
argument-hint: "[기업명 또는 지원서 경로]"
allowed-tools: Read, Glob, Grep, Bash, Task, WebSearch, WebFetch
---

# 투자 심사 풀 사이클

대상: $ARGUMENTS

## 실행 절차

### Phase 1: 스크리닝 (Gate 1)

1. 대상 기업의 지원서를 `ai-agent/data/applications/` 에서 검색합니다
2. `application-screener` 에이전트를 호출하여 스크리닝을 실행합니다
3. 결과를 `ai-agent/reports/screening/` 에 저장합니다
4. **Gate 1 판단:**
   - 80점 이상 → Phase 2 자동 진행
   - 70-79점 → 사용자에게 진행 여부 확인
   - 69점 이하 → 중단, 결과만 보고

### Phase 2: 종합 분석 (Gate 2)

1. 3개 에이전트를 **병렬 실행**합니다:
   - `ir-analyst`: IR 자료 심층 분석
   - `market-researcher`: 시장/경쟁 환경 검증
   - `financial-analyst`: 재무/밸류에이션 검증
2. 3개 결과를 종합하여 IR 분석 보고서를 작성합니다
3. 교차 검증으로 불일치 사항을 식별합니다
4. 결과를 `ai-agent/reports/analysis/` 에 저장합니다
5. **Gate 2 판단:**
   - 투자 매력도 4-5 → Phase 3 자동 진행
   - 투자 매력도 3 → 사용자에게 진행 여부 확인
   - 투자 매력도 1-2 → 중단, 결과만 보고

### Phase 3: 투심위 자료 준비

1. 스크리닝 + IR 분석 결과를 통합하여 투자 검토 메모를 작성합니다
   - Investment Thesis, 리스크 매트릭스, 기대 수익 시나리오
   - `ai-agent/reports/investment-committee/` 에 저장
2. **병렬로** `mentor-matcher` 에이전트를 실행하여 멘토 매칭합니다
   - `ai-agent/reports/mentoring/` 에 저장

### Phase 4: 최종 패키지 구성

1. 모든 산출물의 핵심 내용을 요약합니다
2. 패키지 인덱스를 작성하여 `ai-agent/reports/deal-package/` 에 저장합니다
3. 다음 단계 체크리스트를 포함합니다

### 결과 보고

사용자에게 다음을 보고합니다:
- 각 단계 결과 요약 (점수, 매력도, 핵심 포인트)
- Gate 통과/중단 여부 및 사유
- 전체 산출물 경로 목록
- 핵심 투심위 논의 포인트 (3-5개)
- 다음 단계 권고

---

## Gate에서 중단되는 경우

중단 시에도 해당 단계까지의 결과는 모두 저장됩니다:
- Gate 1 중단: 스크리닝 보고서만 저장
- Gate 2 중단: 스크리닝 + IR 분석 보고서 저장

중단 사유를 명확히 보고하며, 사용자가 원하면 Gate를 override하여 다음 단계를 진행할 수 있습니다.

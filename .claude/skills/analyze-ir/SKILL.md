---
name: analyze-ir
description: IR 자료(투자 제안서)를 다각도로 종합 분석합니다
argument-hint: [파일경로 또는 기업명]
allowed-tools: Read, Glob, Grep, Bash, Task, WebSearch, WebFetch
user-invocable: true
---

# IR 종합 분석 실행

대상: $ARGUMENTS

## 실행 절차

### 1단계: IR 자료 확인 및 로드

IR 자료를 찾습니다:
- `$ARGUMENTS`가 파일 경로이면 해당 파일을 직접 읽습니다
- 기업명이면 `ai-agent/data/applications/` 및 `ai-agent/data/portfolio/` 하위에서 IR 관련 파일을 검색합니다
- PDF 파일인 경우 Read 도구로 읽습니다
- 관련 첨부 파일(재무제표, 부속 자료)이 같은 폴더에 있으면 함께 로드합니다

### 2단계: 분석 프레임워크 로드

다음 참조 파일을 로드합니다:
- `.claude/skills/analyze-ir/analysis-framework.md` - 분석 프레임워크
- `.claude/skills/analyze-ir/question-bank.md` - 질문 뱅크
- `.claude/rules/investment-criteria.md` - 투자 심사 기준
- `ai-agent/data/reference/evaluation-criteria.md` - 산업별 평가 포인트

### 3단계: 다중 에이전트 병렬 분석

다음 3개 에이전트를 **병렬**로 실행합니다:

**에이전트 1: ir-analyst**
- IR 덱의 구조, 비즈니스 모델, 팀, SWOT 분석
- 투자 매력도 평가 (5점 척도)

**에이전트 2: market-researcher**
- 시장 규모(TAM/SAM/SOM) 주장 독립 검증
- 경쟁 환경 조사
- 시장 트렌드 및 "Why Now" 분석

**에이전트 3: financial-analyst**
- 재무 현황 분석 (번레이트, 런웨이)
- 단위 경제학 검증
- 추정 재무 가정의 합리성 평가
- 시나리오 분석

각 에이전트에게 IR 자료의 관련 부분과 참조 기준을 함께 전달합니다.

### 4단계: 결과 종합

3개 에이전트의 분석 결과를 종합하여 다음을 작성합니다:

**종합 분석 보고서 구성:**
1. Executive Summary (투자 매력도 + 핵심 인사이트 3줄)
2. 비즈니스 분석 (ir-analyst 결과 기반)
3. 시장 분석 (market-researcher 결과 기반)
4. 팀 분석 (ir-analyst 결과 기반)
5. 재무 분석 (financial-analyst 결과 기반)
6. SWOT 분석 (종합)
7. 리스크 분석 (3개 에이전트 리스크 통합)
8. 핵심 질문 10개 (question-bank.md 참고하여 맞춤 생성)
9. 유사 기업/투자 레퍼런스
10. 종합 의견 및 권고

**교차 검증 포인트:**
- 기업 주장 시장 규모 vs market-researcher 조사 결과
- 기업 제시 재무 추정 vs financial-analyst 검증 결과
- 경쟁 우위 주장 vs 실제 경쟁 환경

### 5단계: 보고서 저장

`.claude/rules/reporting-standards.md`의 "IR 분석 보고서" 형식을 따릅니다.

저장 경로: `ai-agent/reports/analysis/{기업명}_ir_analysis_{YYYY-MM-DD}.md`

### 6단계: 결과 요약 보고

사용자에게 다음을 보고합니다:

```
## IR 분석 결과 요약

| 항목 | 결과 |
|------|------|
| 기업명 | |
| 투자 매력도 | X/5 (등급) |
| 시장 규모 검증 | 주장 대비 적정/과대/과소 |
| 재무 건전성 | 양호/주의/위험 |

### 핵심 인사이트
1.
2.
3.

### SWOT 요약
| 강점 | 약점 |
|------|------|
| | |
| **기회** | **위협** |
| | |

### 투심위 핵심 질문 (Top 3)
1.
2.
3.

📄 상세 보고서: ai-agent/reports/analysis/{파일명}
```

---
name: portfolio-report
description: 포트폴리오 기업 종합 현황 보고서를 생성합니다
argument-hint: [기간: monthly/quarterly 또는 기업명]
allowed-tools: Read, Glob, Grep, Bash, Task
user-invocable: true
---

# 포트폴리오 보고서 생성

대상/기간: $ARGUMENTS (기본값: monthly)

## 실행 절차

### 1단계: 보고 범위 결정

`$ARGUMENTS`를 분석합니다:
- `monthly` 또는 미지정: 전체 포트폴리오 월간 보고
- `quarterly`: 전체 포트폴리오 분기 보고
- 기업명: 해당 기업만 상세 보고

### 2단계: 데이터 수집

`ai-agent/data/portfolio/` 디렉토리에서 데이터를 수집합니다:
- 각 기업 폴더의 최신 KPI 데이터
- 이전 보고서 (추세 비교용)

데이터가 없는 기업은 "[데이터 미제출]"로 표기합니다.

### 3단계: 에이전트 실행

`portfolio-reporter` 에이전트를 호출하여 분석을 수행합니다.

전달 컨텍스트:
- 수집된 KPI 데이터
- 이전 보고서 (있는 경우)
- 보고 기간 정보

### 4단계: 보고서 저장

저장 경로:
- 월간 전체: `ai-agent/reports/portfolio/monthly_{YYYY-MM-DD}.md`
- 분기 전체: `ai-agent/reports/portfolio/quarterly_{Q}_{YYYY}.md`
- 개별 기업: `ai-agent/reports/portfolio/{기업명}_{YYYY-MM-DD}.md`

### 5단계: 결과 요약 보고

```
## 포트폴리오 현황 요약

| 지표 | 현재 | 전기 대비 |
|------|------|----------|
| 포트폴리오사 수 | N사 | |
| 총 MRR 합산 | 원 | % |
| 평균 런웨이 | 개월 | |
| 위험 기업 | N사 | |

### 성과 하이라이트 (Top 3)
1. [기업명] - [성과]
2. [기업명] - [성과]
3. [기업명] - [성과]

### 관심 필요 (Attention)
1. 🔴 [기업명] - [사유]
2. 🟡 [기업명] - [사유]

### 액션 아이템
- [ ] [구체적 액션]
- [ ] [구체적 액션]

📄 상세 보고서: ai-agent/reports/portfolio/{파일명}
```

## 비교 보고 모드

두 기간의 보고서를 비교하는 경우:
- 기간 간 KPI 변동량 산출
- 개선/악화 기업 분류
- 트렌드 변화 포인트 식별

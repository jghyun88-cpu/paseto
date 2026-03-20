---
name: mentor-match
description: 포트폴리오 스타트업에 적합한 멘토를 매칭합니다
argument-hint: "[기업명]"
allowed-tools: Read, Glob, Grep, Task
---

# 멘토 매칭 프로세스

대상 기업: $ARGUMENTS

## 실행 절차

### 1. 스타트업 현황 파악

1. `ai-agent/data/portfolio/{기업명}/kpi_*.md` 에서 최신 KPI 보고서를 읽습니다
   - "도움이 필요한 사항" 섹션 추출
   - 현재 단계, 팀 현황, 리스크 자가진단 확인
2. `ai-agent/reports/screening/` 또는 `ai-agent/reports/analysis/` 에서 기존 분석 결과 참조
   - 팀 역량 평가, 약점 영역 파악

### 2. 멘토 DB 로드

1. `ai-agent/data/reference/mentor-database.md` 를 로드합니다
2. 활성 멘토만 필터링합니다
3. 현재 멘토링 부하 확인 (3건 이하만 추천 대상)

### 3. mentor-matcher 에이전트 실행

`mentor-matcher` 에이전트를 호출하여 매칭을 수행합니다:
- 스타트업 니즈와 멘토 프로필 비교
- 5가지 기준으로 매칭 점수 산출
- 상위 3명 추천

### 4. 저장

- `ai-agent/reports/mentoring/{기업명}_matching_{날짜}.md` 에 저장합니다

### 5. 결과 요약 보고

사용자에게 다음을 보고합니다:
- 추천 멘토 3인 (이름, 직함, 매칭 점수)
- 각 멘토의 핵심 매칭 근거
- 제안 멘토링 주제
- 저장 경로

---

## 주의사항

- 멘토의 현재 가용성을 반드시 확인합니다
- 동일 멘토에게 과도한 멘토링 부하가 집중되지 않도록 합니다
- 이전 매칭 이력을 참조하여 중복 매칭을 방지합니다
- 스타트업의 미공개 재무 정보는 매칭 보고서에 포함하지 않습니다

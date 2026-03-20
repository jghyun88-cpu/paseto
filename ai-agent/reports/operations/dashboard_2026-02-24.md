---
제목: LSA 운영 대시보드
작성일: 2026-02-24
작성자: analytics (자동 생성)
기밀등급: 내부용
---

# LSA 운영 대시보드

> 자동 생성일: 2026-02-24 | 시스템 v1.0

---

## 1. 시스템 현황

| 구성 요소 | 수량 |
|-----------|------|
| 에이전트 | 9개 |
| 스킬 | 9개 |
| 규칙 | 7개 |
| 훅 | 3개 |
| 에이전트 목록 | application-screener, deal-coordinator, financial-analyst, ir-analyst, lp-report-writer, market-researcher, mentor-matcher, portfolio-reporter, risk-monitor |

## 2. 펀드 현황

| 지표 | 수치 |
|------|------|
| 펀드 규모 | 50억원 |
| 투자 집행액 | 11.5억원 |
| 포트폴리오사 | 4사 |

## 3. 포트폴리오 건강도

| 기업명 | 상태 | MRR | 런웨이 | 성장률 | 데이터 나이 |
|--------|------|-----|--------|--------|-----------|
| aimedic | 🟢 양호 | 2,400만원 | 13.5개월 | N/A | 0일 |
| edufit | 🟡 주의 | 680만원 | 8.4개월 | N/A | 0일 |
| foodlink | 🟡 주의 | N/A | 8.1개월 | N/A | 0일 |
| greenlogi | 🟡 주의 | 1,200만원 | 8.1개월 | N/A | 0일 |

### 상태 분포
- 🟢 양호: 1사
- 🟡 주의: 3사
- 🔴 긴급: 0사

## 4. 보고서 생성 통계

| 유형 | 생성 수 | 최근 보고서 |
|------|---------|-----------|
| screening | 1건 | aimedic_screening_2026-02-25.md |
| analysis | 1건 | aimedic_ir_analysis_2026-02-25.md |
| portfolio | 0건 | 없음 |
| lp | 1건 | H2-2025_2026-02-25.md |
| investment-committee | 1건 | aimedic_memo_2026-02-25.md |
| risk | 1건 | 2026-02-25_alert.md |
| mentoring | 0건 | 없음 |
| **총계** | **5건** | 총 86.2KB |

## 5. 로그 현황

| 로그 유형 | 엔트리 수 |
|-----------|----------|
| 감사 로그 (audit) | 0건 |
| 세션 로그 (session) | 0건 |
| 파이프라인 로그 (pipeline) | 0건 |
| 검증 로그 (validation) | 0건 |

## 6. 데이터 최신성

| 데이터 | 최신 여부 | 비고 |
|--------|----------|------|
| aimedic KPI | ✅ 최신 | 0일 전 |
| edufit KPI | ✅ 최신 | 0일 전 |
| foodlink KPI | ✅ 최신 | 0일 전 |
| greenlogi KPI | ✅ 최신 | 0일 전 |

## 7. 권장 액션

- 긴급 사항 없음



---
_본 대시보드는 `node scripts/analytics.mjs dashboard` 로 자동 생성됩니다._

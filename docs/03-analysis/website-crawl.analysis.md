# website-crawl Gap Analysis Report

> **Feature**: website-crawl
> **Date**: 2026-03-26
> **Match Rate**: 88% → Act 단계 권장

---

## Overall Match Rate: 88%

| Category | Score | Status |
|----------|:-----:|:------:|
| Design S4 Function Signatures | 83% | Warning |
| Design S10.3 Constants | 100% | Pass |
| Design S10.4 ai_screening.py 수정 | 95% | Pass |
| Design S10.5 _discover_subpages | 100% | Pass |
| Design S10.6 _extract_text | 100% | Pass |
| Plan FR-01~FR-10 | 80% | Warning |
| Design S6 Error Handling | 75% | Warning |
| Design S7 Security | 86% | Warning |
| Design S2.3 Dependencies | 100% | Pass |
| Standard S5-6 JSON Schema | 60% | Fail |
| Convention Compliance | 98% | Pass |
| **Weighted Average** | **88%** | **Warning** |

---

## Missing Features (8 items)

| # | Item | Source | Impact |
|---|------|--------|--------|
| 1 | `_classify_page()` 별도 함수 | Design S4 | Low (인라인 처리됨, 기능적 동등) |
| 2 | FR-08: URL 미등록 시 Tavily 기반 공식사이트 탐색 | Plan S3.1 | Medium |
| 3 | FR-09: robots.txt 준수 | Plan S3.1 / Design S7 | Medium |
| 4 | SSL 오류 시 `verify=False` 재시도 | Design S6 | Low |
| 5 | `ir_cross_validation` 블록 | Standard S5-6 | High |
| 6 | `findings.team_members` (리스트) vs 현재 `team_info` (문자열) | Standard S5-6 | Medium |
| 7 | `website_health.last_updated` | Standard S5-6 | Low |
| 8 | `website_health.professional_quality` | Standard S5-6 | Low |

---

## 90% 달성을 위한 최소 수정안

1. robots.txt 기본 확인 추가 (~15줄)
2. `findings` 키 이름을 Standard S5-6과 일치시킴 (`team_info` → `team_members`)
3. `ir_cross_validation` 빈 구조 반환 (교차 검증은 LLM 단계에서 수행)

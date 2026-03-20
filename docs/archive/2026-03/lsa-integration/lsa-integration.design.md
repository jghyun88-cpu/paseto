---
feature: lsa-integration
phase: design
created: 2026-03-20
author: AI
status: completed
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | LSA→eLSA 통합 시 경로, MCP 도구명, API 라우트, 점수 체계가 모두 다름 |
| Solution | 5단계 Progressive Embedding + elsa-mcp 서버로 API 브릿지 |
| Function/UX | ai-agent/ 디렉토리에 LSA 데이터 격리, MCP 도구는 elsa_ 접두사 |
| Core Value | 기존 eLSA 기능에 영향 없이 AI 에이전트 기능 추가 |

## 1. 디렉토리 구조

```
elsa/
├── .claude/
│   ├── agents/          # 9개 에이전트
│   ├── skills/          # 9개 스킬
│   ├── rules/           # 7개 규칙 (LSA) + 기존 글로벌 규칙
│   ├── hooks/           # 3개 훅
│   ├── settings.json    # 병합된 설정
│   └── agent-memory/    # LSA + bkit 메모리
├── .mcp.json            # 8개 MCP 서버 (elsa + 7 외부)
├── mcp-servers/
│   └── elsa-mcp/        # TypeScript MCP 서버 (14 도구)
├── ai-agent/
│   ├── data/            # 참조 데이터, 포트폴리오, 멘토DB
│   ├── reports/         # AI 생성 보고서
│   └── logs/            # 감사/세션 로그
└── backend/app/
    ├── models/          # +ai_analysis.py, portfolio_issue.py
    ├── schemas/         # +ai_analysis.py, portfolio_issue.py
    ├── services/        # +ai_*_service.py, ai_score_mapper.py 등
    └── routers/         # +ai_analysis.py, portfolio_issues.py
```

## 2. 경로 치환 규칙

| 원본 (LSA) | 대상 (eLSA) |
|------------|-------------|
| `data/` | `ai-agent/data/` |
| `reports/` | `ai-agent/reports/` |
| `logs/` | `ai-agent/logs/` |
| `mcp__bhv__` | `mcp__elsa__` |
| `bhv_*` 도구명 | `elsa_*` 도구명 |
| `BHV 운영플랫폼` | `eLSA 운영플랫폼` |

## 3. elsa-mcp API 라우트 매핑

| MCP 도구 | eLSA API |
|----------|----------|
| elsa_list_startups | GET /api/v1/startups/ |
| elsa_get_startup | GET /api/v1/startups/{id} |
| elsa_list_screenings | GET /api/v1/screenings/ |
| elsa_list_deals | GET /api/v1/deal-flows/ |
| elsa_list_portfolio | GET /api/v1/startups/?is_portfolio=true |
| elsa_list_kpis | GET /api/v1/kpi-records/?startup_id={id} |
| elsa_submit_ai_analysis | POST /api/v1/ai-analysis/ (NEW) |
| elsa_create_issue | POST /api/v1/portfolio-issues/ (NEW) |

## 4. 새 백엔드 모델

### AIAnalysis
- startup_id, analysis_type, scores(JSON), summary, report_path
- risk_level, recommendation, investment_attractiveness

### PortfolioIssue
- startup_id, issue_type, severity, description
- detected_by, resolved, resolution_note

## 5. 인증: 서비스 계정 토큰

- .env에 ELSA_SERVICE_TOKEN 저장
- elsa-mcp가 Bearer 토큰으로 모든 API 호출
- 폴백: POST /api/v1/auth/service-token

## 6. 점수 체계 변환

- LSA: 8항목 100점 (정량60 + 정성40)
- eLSA: 5항목 0.0~1.0 가중평균
- ai_score_mapper.py가 양방향 변환 처리

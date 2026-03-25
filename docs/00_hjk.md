Ready to code?
                                                                                                                                                                                                          
 Here is Claude's plan:                                                                                                                                                                                   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ LSA → eLSA 통합 계획서                                                                                                                                                                                   
                                                                                                                                                                                                          
 Context                                                                                                                                                                                                  

 문제: LSA(AI 에이전트 시스템)와 eLSA(웹 애플리케이션)가 같은 액셀러레이터 업무 도메인을 다루지만 별도 프로젝트로 분리되어 있음. LSA의 AI 분석 기능(스크리닝, IR 분석, 리스크 모니터링 등)을 eLSA
 프로젝트에 내장하여 단일 시스템으로 운영하고, lsa/ 폴더를 완전히 제거하는 것이 목표.

 핵심 비유: LSA의 "뇌"(AI 에이전트)를 eLSA의 "몸"(웹 플랫폼)에 이식하는 수술. 뇌의 신경(MCP 도구, 파일 경로, 데이터 참조)을 새 몸의 신경계(eLSA API)에 재연결해야 한다.

 ---
 Executive Summary

 ┌───────────┬───────────────────────────────────────────┐
 │   항목    │                   내용                    │
 ├───────────┼───────────────────────────────────────────┤
 │ Feature   │ LSA → eLSA 완전 통합                      │
 ├───────────┼───────────────────────────────────────────┤
 │ 시작일    │ 2026-03-20                                │
 ├───────────┼───────────────────────────────────────────┤
 │ 방식      │ Progressive Embedding (5단계 점진적 이전) │
 ├───────────┼───────────────────────────────────────────┤
 │ 예상 소요 │ 10~15시간                                 │
 └───────────┴───────────────────────────────────────────┘

 Results Target

 ┌───────────────────┬──────┐
 │       지표        │ 목표 │
 ├───────────────────┼──────┤
 │ 이전 에이전트     │ 9/9  │
 ├───────────────────┼──────┤
 │ 이전 스킬         │ 9/9  │
 ├───────────────────┼──────┤
 │ 이전 규칙         │ 7/7  │
 ├───────────────────┼──────┤
 │ 새 API 엔드포인트 │ 3개  │
 ├───────────────────┼──────┤
 │ lsa/ 폴더 제거    │ 가능 │
 └───────────────────┴──────┘

 Value Delivered

 ┌─────────────┬──────────────────────────────────────────────────────────────────────────┐
 │    관점     │                                   내용                                   │
 ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
 │ Problem     │ 두 시스템 분리로 인한 데이터 이중관리, BHV 중간 레이어 의존성            │
 ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
 │ Solution    │ LSA 전체를 eLSA에 내장, elsa-mcp로 직접 연동, 단일 프로젝트              │
 ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
 │ Function/UX │ Claude Code에서 /screen-application 등 9개 스킬이 eLSA 컨텍스트에서 동작 │
 ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
 │ Core Value  │ 단일 시스템에서 웹 UI + AI 분석이 통합 운영됨                            │
 └─────────────┴──────────────────────────────────────────────────────────────────────────┘

 ---
 YAGNI Review

 1차 포함 (In Scope)

 - 9개 에이전트, 9개 스킬, 7개 규칙 전체 이전
 - elsa-mcp 서버 구축 (bhv-mcp 대체)
 - 새 API 3개 (ai-analysis, portfolio-issues, service-token)
 - 데이터/보고서 → ai-agent/ 이전
 - 외부 MCP 7개 연동 설정
 - 훅 + settings.json 병합
 - 통합 레이어 (score_mapper, report_parser, data_converter)

 연기 (Out of Scope)

 - 스크립트 13개 이전 (pipeline.mjs, batch-screen.sh 등) → 에이전트/스킬 동작 확인 후 추가
 - eLSA 프론트엔드에 AI 보고서 뷰어 UI 추가 → 별도 피처로 진행
 - 포트폴리오 데이터 DB 마이그레이션 (file→PostgreSQL) → 현재는 파일 유지

 ---
 구현 계획

 Phase 1: .claude/ 아티팩트 이전 (agents/skills/rules/hooks)

 1-1. 에이전트 9개 이전

 ┌────────────────────────────────────────┬────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
 │             Source (lsa/)              │          Destination (elsa/)           │                         수정 사항                          │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/application-screener.md │ .claude/agents/application-screener.md │ 경로: data/ → ai-agent/data/, reports/ → ai-agent/reports/ │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/ir-analyst.md           │ .claude/agents/ir-analyst.md           │ 경로 + mcp__bhv__* → mcp__elsa__*                          │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/market-researcher.md    │ .claude/agents/market-researcher.md    │ 경로만 수정                                                │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/financial-analyst.md    │ .claude/agents/financial-analyst.md    │ 경로만 수정                                                │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/portfolio-reporter.md   │ .claude/agents/portfolio-reporter.md   │ 경로 + mcp__bhv__* → mcp__elsa__*                          │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/lp-report-writer.md     │ .claude/agents/lp-report-writer.md     │ 경로만 수정                                                │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/risk-monitor.md         │ .claude/agents/risk-monitor.md         │ 경로 + mcp__bhv__* → mcp__elsa__*                          │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/mentor-matcher.md       │ .claude/agents/mentor-matcher.md       │ 경로만 수정                                                │
 ├────────────────────────────────────────┼────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ .claude/agents/deal-coordinator.md     │ .claude/agents/deal-coordinator.md     │ 경로 + mcp__bhv__* → mcp__elsa__* (가장 많은 수정)         │
 └────────────────────────────────────────┴────────────────────────────────────────┴────────────────────────────────────────────────────────────┘

 경로 치환 규칙 (모든 에이전트/스킬에 적용):
 - data/ → ai-agent/data/
 - reports/ → ai-agent/reports/
 - logs/ → ai-agent/logs/
 - mcp__bhv__ → mcp__elsa__
 - bhv_ 도구명 → elsa_ 도구명

 1-2. 스킬 9개 이전

 각 스킬 디렉토리 전체를 elsa/.claude/skills/로 복사 후 경로 수정:
 - screen-application/ (SKILL.md + scoring-criteria.md + templates/)
 - analyze-ir/ (SKILL.md + analysis-framework.md + question-bank.md)
 - deal-review/ (SKILL.md)
 - investment-memo/ (SKILL.md + memo-template.md)
 - lp-report/ (SKILL.md + report-template.md)
 - market-scan/ (SKILL.md)
 - mentor-match/ (SKILL.md)
 - portfolio-report/ (SKILL.md + report-template.md)
 - risk-alert/ (SKILL.md)

 1-3. 규칙 7개 이전 (수정 불필요)

 lsa/.claude/rules/ → elsa/.claude/rules/로 그대로 복사:
 - evaluation-rubric.md, investment-criteria.md, reporting-standards.md
 - compliance.md, data-handling.md, quality-assurance.md, batch-config.md

 주의: eLSA의 기존 .claude/rules/에는 글로벌 규칙(agents-v2.md, coding-style.md 등)이 있으므로 충돌 없음 (다른 파일명).

 1-4. 훅 3개 이전 + settings.json 병합

 훅 파일을 elsa/.claude/hooks/로 복사:
 - audit-log.sh — 경로를 ai-agent/logs/audit.log로 수정
 - validate-report.sh — 경로를 ai-agent/reports/로 수정
 - auto-sync-hook.sh — sync-to-bhv.py → sync-to-elsa.py 경로 수정 (스크립트 연기이므로 비활성화 가능)

 settings.json 병합: LSA의 훅 등록 + 스킬 권한을 eLSA settings에 추가.

 1-5. 에이전트 메모리 이전

 lsa/.claude/agent-memory/ 하위 디렉토리를 elsa/.claude/agent-memory/로 복사.
 기존 bkit 에이전트 메모리(gap-detector, report-generator)와 충돌 없음.

 ---
 Phase 2: elsa-mcp 서버 구축

 2-1. 프로젝트 구조

 elsa/mcp-servers/elsa-mcp/
 ├── package.json
 ├── tsconfig.json
 └── src/
     ├── index.ts          # MCP 서버 진입점
     ├── client.ts         # eLSA REST API 클라이언트
     └── tools/
         ├── startups.ts   # elsa_list_startups, elsa_get_startup, elsa_search_startups
         ├── screenings.ts # elsa_list_screenings, elsa_get_screening
         ├── pipeline.ts   # elsa_list_deals, elsa_get_deal, elsa_get_deal_timeline
         ├── portfolio.ts  # elsa_list_portfolio, elsa_get_portfolio, elsa_list_kpis
         └── write.ts      # elsa_submit_ai_analysis, elsa_update_screening, elsa_add_deal_note

 2-2. BHV → eLSA API 라우트 매핑

 ┌─────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────────┐
 │        MCP 도구         │          BHV 라우트 (기존)           │            eLSA 라우트 (신규)            │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_list_startups      │ GET /api/v1/sourcing/startups        │ GET /api/v1/startups/                    │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_get_startup        │ GET /api/v1/sourcing/startups/{id}   │ GET /api/v1/startups/{id}                │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_list_screenings    │ GET /api/v1/screening/screenings     │ GET /api/v1/screenings/                  │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_list_deals         │ GET /api/v1/pipeline/deals           │ GET /api/v1/deal-flows/                  │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_get_deal           │ GET /api/v1/pipeline/deals/{id}      │ GET /api/v1/deal-flows/{id}              │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_list_portfolio     │ GET /api/v1/portfolio/companies      │ GET /api/v1/startups/?is_portfolio=true  │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_list_kpis          │ GET /api/v1/portfolio/{id}/kpis      │ GET /api/v1/kpi-records/?startup_id={id} │
 ├─────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 │ elsa_submit_ai_analysis │ POST /api/v1/integration/ai-analysis │ POST /api/v1/ai-analysis/ (NEW)          │
 └─────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────────┘

 2-3. 인증: 서비스 계정 전용 토큰

 1. eLSA에 시스템 사용자 생성: ai-agent@system (role: admin)
 2. 장기 유효 JWT 토큰 발급 (또는 만료 없음)
 3. .env에 ELSA_SERVICE_TOKEN 저장
 4. elsa-mcp client.ts에서 이 토큰으로 모든 API 호출

 2-4. 새 eLSA Backend 엔드포인트 3개

 1) POST /api/v1/ai-analysis/ — AI 분석 결과 저장
 # backend/app/models/ai_analysis.py (새 모델)
 class AIAnalysis(Base, BaseMixin):
     startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"))
     analysis_type: Mapped[str]     # "screening" | "ir_analysis" | "risk_alert" | "market_scan"
     scores: Mapped[dict]           # JSON - 100점 루브릭 상세
     summary: Mapped[str]           # 요약문
     report_path: Mapped[str]       # ai-agent/reports/ 내 경로
     risk_level: Mapped[str | None] # "low" | "medium" | "high" | "critical"
     recommendation: Mapped[str | None] # "pass" | "conditional" | "hold" | "decline"

 2) GET/POST /api/v1/portfolio-issues/ — 포트폴리오 이슈 추적
 # backend/app/models/portfolio_issue.py (새 모델)
 class PortfolioIssue(Base, BaseMixin):
     startup_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("startups.id"))
     issue_type: Mapped[str]       # "cash_runway" | "key_person" | "customer_churn" | "dev_delay" | "legal"
     severity: Mapped[str]         # "low" | "medium" | "high" | "critical"
     description: Mapped[str]
     detected_by: Mapped[str]      # "ai-agent" | "manual"
     resolved: Mapped[bool] = mapped_column(default=False)

 3) POST /api/v1/auth/service-token — 서비스 계정 토큰 발급
 # backend/app/routers/auth.py에 추가
 @router.post("/service-token")
 async def create_service_token(
     data: ServiceTokenRequest,  # service_key 필드
     db: AsyncSession = Depends(get_db)
 ):
     # SERVICE_KEY 검증 → 장기 유효 JWT 반환

 2-5. Alembic 마이그레이션

 새 테이블 2개 추가: ai_analyses, portfolio_issues

 2-6. .mcp.json 생성

 {
   "mcpServers": {
     "elsa": {
       "command": "node",
       "args": ["mcp-servers/elsa-mcp/dist/index.js"],
       "env": { "ELSA_API_URL": "http://localhost:8000", "ELSA_SERVICE_TOKEN": "${ELSA_SERVICE_TOKEN}" }
     },
     "filesystem": {
       "command": "npx", "args": ["-y", "@anthropic-ai/mcp-filesystem", "./ai-agent/data", "./ai-agent/reports"]
     },
     "notion": { "...기존 LSA 설정 그대로..." },
     "google-sheets": { "...기존 LSA 설정 그대로..." },
     "slack": { "...기존 LSA 설정 그대로..." },
     "database": { "...기존 LSA 설정 그대로..." },
     "hubspot-crm": { "...기존 LSA 설정 그대로..." },
     "email": { "...기존 LSA 설정 그대로..." },
     "google-calendar": { "...기존 LSA 설정 그대로..." }
   }
 }

 ---
 Phase 3: 데이터/보고서 이전

 3-1. ai-agent/ 디렉토리 생성 및 데이터 복사

 elsa/ai-agent/
 ├── data/
 │   ├── applications/          # lsa/data/applications/ 전체
 │   │   ├── batch-2025-H2/
 │   │   ├── batch-2026-H1/
 │   │   └── batch-2026-S/
 │   ├── portfolio/             # lsa/data/portfolio/ 전체 (4사 KPI)
 │   ├── fund/                  # lsa/data/fund/
 │   ├── market-research/       # lsa/data/market-research/
 │   ├── reference/             # lsa/data/reference/ (멘토DB, 벤치마크)
 │   ├── templates/             # lsa/data/templates/
 │   ├── batch-config/          # lsa/data/batch-config/
 │   └── feedback/              # lsa/data/feedback/
 ├── reports/                   # lsa/reports/ 전체
 │   ├── screening/
 │   ├── analysis/
 │   ├── portfolio/
 │   ├── lp/
 │   ├── investment-committee/
 │   ├── mentoring/
 │   ├── deal-package/
 │   ├── risk/
 │   └── operations/
 └── logs/                      # lsa/logs/ 전체
     ├── audit.log
     └── session.log

 id_map.json, sync_log.json: 단일 시스템이므로 불필요. 이전하지 않음.

 3-2. 통합 레이어 이전

 ┌────────────────────────────────────┬────────────────────────────────────────────────┬───────────────────────────────────────────┐
 │               Source               │                  Destination                   │                 수정 사항                 │
 ├────────────────────────────────────┼────────────────────────────────────────────────┼───────────────────────────────────────────┤
 │ lsa/integration/score_mapper.py    │ elsa/backend/app/services/ai_score_mapper.py   │ import 경로 수정, eLSA 5점 척도 변환 추가 │
 ├────────────────────────────────────┼────────────────────────────────────────────────┼───────────────────────────────────────────┤
 │ lsa/integration/markdown_parser.py │ elsa/backend/app/services/ai_report_parser.py  │ import 경로 수정                          │
 ├────────────────────────────────────┼────────────────────────────────────────────────┼───────────────────────────────────────────┤
 │ lsa/integration/data_converter.py  │ elsa/backend/app/services/ai_data_converter.py │ BHV → eLSA 필드명 수정                    │
 ├────────────────────────────────────┼────────────────────────────────────────────────┼───────────────────────────────────────────┤
 │ lsa/integration/identity_mapper.py │ 이전하지 않음                                  │ 단일 시스템이므로 ID 매핑 불필요          │
 └────────────────────────────────────┴────────────────────────────────────────────────┴───────────────────────────────────────────┘

 ---
 Phase 4: 훅/설정 병합 + 경로 전체 검증

 4-1. settings.json 병합

 LSA의 settings.json에서 아래 항목을 eLSA settings에 추가:
 - PostToolUse 훅 (Write → audit-log + auto-sync + validate-report)
 - PostToolUse 훅 (Edit → audit-log)
 - Notification 훅 (idle_prompt, permission_prompt)
 - Stop 훅 (session-log)
 - 9개 스킬 권한 (screen-application, analyze-ir 등)

 4-2. 경로 전체 일괄 검증

 모든 이전된 파일에서 다음 패턴을 검색하여 누락된 경로 수정 확인:
 - data/ → ai-agent/data/
 - reports/ → ai-agent/reports/
 - logs/ → ai-agent/logs/
 - bhv → elsa (MCP 도구명)

 ---
 Phase 5: 통합 테스트 + lsa/ 삭제 검증

 5-1. 에이전트 단위 테스트

 각 에이전트가 eLSA 컨텍스트에서 정상 동작하는지 확인:
 1. 파일 참조 경로가 ai-agent/로 올바르게 해석되는지
 2. MCP 도구(elsa_*)가 eLSA API에 정상 연결되는지
 3. 보고서가 ai-agent/reports/에 정상 저장되는지

 5-2. 스킬 End-to-End 테스트 (최소 3개)

 1. /screen-application — 지원서 스크리닝 → 보고서 생성 → AI 분석 DB 저장
 2. /portfolio-report — eLSA DB에서 포트폴리오 조회 → 보고서 생성
 3. /risk-alert — KPI 데이터 조회 → 리스크 분석 → 이슈 생성

 5-3. 삭제 전 체크리스트

 - 9개 에이전트 → elsa/.claude/agents/ 존재
 - 9개 스킬 → elsa/.claude/skills/ 존재
 - 7개 규칙 → elsa/.claude/rules/ 존재
 - 3개 훅 → elsa/.claude/hooks/ 존재 (경로 수정 완료)
 - settings.json → 훅 등록 + 스킬 권한 병합 완료
 - .mcp.json → 8개 MCP 서버 설정 완료
 - elsa-mcp 서버 → 빌드 + 동작 확인
 - ai-agent/ → 데이터 + 보고서 + 로그 이전 완료
 - 통합 레이어 → backend/app/services/ 이전 완료
 - 새 API 3개 → 엔드포인트 등록 + 마이그레이션 완료
 - 에이전트에 lsa/ 경로 참조 없음
 - 3개 이상 스킬 E2E 테스트 통과
 - 기존 eLSA 기능 정상 동작 (프론트엔드, API, 인증)

 ---
 핵심 수정 대상 파일

 신규 생성

 ┌──────────────────────────────────────────────────────┬──────────────────────────────────┐
 │                         파일                         │               설명               │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/.mcp.json                                       │ MCP 서버 8개 설정                │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/mcp-servers/elsa-mcp/                           │ eLSA API용 MCP 서버 (TypeScript) │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/models/ai_analysis.py               │ AI 분석 결과 모델                │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/models/portfolio_issue.py           │ 포트폴리오 이슈 모델             │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/routers/ai_analysis.py              │ AI 분석 API 라우터               │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/routers/portfolio_issues.py         │ 포트폴리오 이슈 라우터           │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/services/ai_analysis_service.py     │ AI 분석 서비스                   │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/services/portfolio_issue_service.py │ 이슈 서비스                      │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/services/ai_score_mapper.py         │ 점수 변환                        │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/services/ai_report_parser.py        │ 보고서 파싱                      │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/services/ai_data_converter.py       │ 데이터 변환                      │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/schemas/ai_analysis.py              │ Pydantic 스키마                  │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ elsa/backend/app/schemas/portfolio_issue.py          │ Pydantic 스키마                  │
 └──────────────────────────────────────────────────────┴──────────────────────────────────┘

 기존 수정

 ┌─────────────────────────────────────┬───────────────────────────────┐
 │                파일                 │           수정 내용           │
 ├─────────────────────────────────────┼───────────────────────────────┤
 │ elsa/backend/app/main.py            │ 새 라우터 2개 등록            │
 ├─────────────────────────────────────┼───────────────────────────────┤
 │ elsa/backend/app/models/__init__.py │ 새 모델 2개 import            │
 ├─────────────────────────────────────┼───────────────────────────────┤
 │ elsa/backend/app/routers/auth.py    │ service-token 엔드포인트 추가 │
 ├─────────────────────────────────────┼───────────────────────────────┤
 │ elsa/.claude/settings.json          │ 훅 + 스킬 권한 병합           │
 └─────────────────────────────────────┴───────────────────────────────┘

 복사 (경로 수정 포함)

 ┌─────────────────┬──────────────┐
 │      항목       │     수량     │
 ├─────────────────┼──────────────┤
 │ 에이전트 (.md)  │ 9개          │
 ├─────────────────┼──────────────┤
 │ 스킬 (디렉토리) │ 9개          │
 ├─────────────────┼──────────────┤
 │ 규칙 (.md)      │ 7개          │
 ├─────────────────┼──────────────┤
 │ 훅 (.sh)        │ 3개          │
 ├─────────────────┼──────────────┤
 │ 에이전트 메모리 │ 5개 디렉토리 │
 ├─────────────────┼──────────────┤
 │ 데이터 파일     │ ~50개        │
 ├─────────────────┼──────────────┤
 │ 보고서 파일     │ ~30개        │
 └─────────────────┴──────────────┘

 ---
 리스크 평가

 ┌──────────────────────────┬──────┬──────┬──────────────────────────────────────────┐
 │          리스크          │ 확률 │ 영향 │                   대응                   │
 ├──────────────────────────┼──────┼──────┼──────────────────────────────────────────┤
 │ 에이전트 경로 참조 누락  │ 높음 │ 중간 │ 일괄 검색으로 data/, reports/ 패턴 확인  │
 ├──────────────────────────┼──────┼──────┼──────────────────────────────────────────┤
 │ elsa-mcp 인증 실패       │ 중간 │ 높음 │ service-token 엔드포인트 + .env 설정     │
 ├──────────────────────────┼──────┼──────┼──────────────────────────────────────────┤
 │ eLSA API 응답 형식 차이  │ 높음 │ 중간 │ data_converter.py가 형식 변환 처리       │
 ├──────────────────────────┼──────┼──────┼──────────────────────────────────────────┤
 │ 훅 스크립트 Windows 경로 │ 중간 │ 낮음 │ Git Bash 기반 실행 확인                  │
 ├──────────────────────────┼──────┼──────┼──────────────────────────────────────────┤
 │ bkit 플러그인 충돌       │ 낮음 │ 낮음 │ 파일명 중복 없음 확인 완료               │
 ├──────────────────────────┼──────┼──────┼──────────────────────────────────────────┤
 │ 새 API 엔드포인트 누락   │ 중간 │ 높음 │ Phase 2에서 먼저 구축 후 에이전트 테스트 │
 └──────────────────────────┴──────┴──────┴──────────────────────────────────────────┘

 ---
 검증 방법

 1. Phase 1 완료 후: elsa/.claude/agents/, skills/, rules/ 파일 존재 확인
 2. Phase 2 완료 후: elsa-mcp npm run build 성공 + Docker에서 eLSA backend 실행 → MCP 도구 호출 테스트
 3. Phase 3 완료 후: ai-agent/data/, reports/ 파일 존재 확인
 4. Phase 4 완료 후: grep으로 lsa/ 경로 참조 0건 확인
 5. Phase 5 완료 후: /screen-application, /portfolio-report, /risk-alert 3개 스킬 E2E 통과
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

 Claude has written up a plan and is ready to execute. Would you like to proceed?

 ❯ 1. Yes, clear context (15% used) and auto-accept edits
   2. Yes, auto-accept edits
   3. Yes, manually approve edits
   4. Type here to tell Claude what to change

 ctrl-g to edit in Notepad · ~\.claude\plans\moonlit-wishing-koala.md
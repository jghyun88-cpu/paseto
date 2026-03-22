from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.rate_limit import limiter

from app.routers import auth as auth_router
from app.routers import startups as startups_router
from app.routers import deal_flows as deal_flows_router
from app.routers import screenings as screenings_router
from app.routers import handovers as handovers_router
from app.routers import reviews as reviews_router
from app.routers import investment_memos as memos_router
from app.routers import ic_decisions as ic_router
from app.routers import contracts as contracts_router
from app.routers import cap_table as cap_table_router
from app.routers import funds as funds_router
from app.routers import lps as lps_router
from app.routers import incubations as incubations_router
from app.routers import mentoring_sessions as mentoring_sessions_router
from app.routers import kpi_records as kpi_records_router
from app.routers import demo_days as demo_days_router
from app.routers import investor_meetings as investor_meetings_router
from app.routers import mentors as mentors_router
from app.routers import partner_demands as partner_demands_router
from app.routers import poc_projects as poc_projects_router
from app.routers import follow_on_investments as follow_on_router
from app.routers import exit_records as exit_records_router
from app.routers import government_programs as gov_programs_router
from app.routers import meetings as meetings_router
from app.routers import notifications as notifications_router
from app.routers import dashboard as dashboard_router
from app.routers import team_kpis as team_kpis_router
from app.routers import sop_templates as sop_router
from app.routers import forms as forms_router
from app.routers import job_descriptions as jd_router
from app.routers import ai_analysis as ai_analysis_router
from app.routers import portfolio_issues as portfolio_issues_router
from app.routers import ksic as ksic_router
from app.routers import compliance as compliance_router

app = FastAPI(
    title="eLSA — 딥테크 액셀러레이터 운영시스템",
    description="소싱→심사→투자→보육→수요기업연결→회수 전주기 운영 API",
    version="0.1.0",
)

# Rate Limiter 등록
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 설정 — CORS_ORIGINS 환경변수로 관리 (쉼표 구분)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# 라우터 등록
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["인증"])
app.include_router(startups_router.router, prefix="/api/v1/startups", tags=["스타트업"])
app.include_router(deal_flows_router.router, prefix="/api/v1/deal-flows", tags=["딜플로우"])
app.include_router(screenings_router.router, prefix="/api/v1/screenings", tags=["스크리닝"])
app.include_router(handovers_router.router, prefix="/api/v1/handovers", tags=["인계"])
app.include_router(reviews_router.router, prefix="/api/v1/reviews", tags=["심사"])
app.include_router(memos_router.router, prefix="/api/v1/investment-memos", tags=["투자메모"])
app.include_router(ic_router.router, prefix="/api/v1/ic-decisions", tags=["IC결정"])
app.include_router(contracts_router.router, prefix="/api/v1/contracts", tags=["계약"])
app.include_router(cap_table_router.router, prefix="/api/v1/cap-table", tags=["CapTable"])
app.include_router(funds_router.router, prefix="/api/v1/funds", tags=["조합"])
app.include_router(lps_router.router, prefix="/api/v1/lps", tags=["LP"])
app.include_router(incubations_router.router, prefix="/api/v1/incubations", tags=["보육"])
app.include_router(mentoring_sessions_router.router, prefix="/api/v1/mentoring-sessions", tags=["멘토링"])
app.include_router(kpi_records_router.router, prefix="/api/v1/kpi-records", tags=["KPI"])
app.include_router(demo_days_router.router, prefix="/api/v1/demo-days", tags=["데모데이"])
app.include_router(investor_meetings_router.router, prefix="/api/v1/investor-meetings", tags=["투자자미팅"])
app.include_router(mentors_router.router, prefix="/api/v1/mentors", tags=["멘토"])
app.include_router(partner_demands_router.router, prefix="/api/v1/partner-demands", tags=["파트너수요"])
app.include_router(poc_projects_router.router, prefix="/api/v1/poc-projects", tags=["PoC"])
app.include_router(follow_on_router.router, prefix="/api/v1/follow-on-investments", tags=["후속투자"])
app.include_router(exit_records_router.router, prefix="/api/v1/exit-records", tags=["회수"])
app.include_router(gov_programs_router.router, prefix="/api/v1/government-programs", tags=["정부사업"])
app.include_router(meetings_router.router, prefix="/api/v1/meetings", tags=["회의"])
app.include_router(notifications_router.router, prefix="/api/v1/notifications", tags=["알림"])
app.include_router(dashboard_router.router, prefix="/api/v1/dashboard", tags=["대시보드"])
app.include_router(team_kpis_router.router, prefix="/api/v1/team-kpis", tags=["팀KPI"])
app.include_router(sop_router.router, prefix="/api/v1/sop", tags=["SOP"])
app.include_router(forms_router.router, prefix="/api/v1/forms", tags=["양식"])
app.include_router(jd_router.router, prefix="/api/v1/jd", tags=["직무기술서"])
app.include_router(ai_analysis_router.router, prefix="/api/v1/ai-analysis", tags=["AI분석"])
app.include_router(portfolio_issues_router.router, prefix="/api/v1/portfolio-issues", tags=["포트폴리오이슈"])
app.include_router(ksic_router.router, prefix="/api/v1/ksic", tags=["표준산업분류"])
app.include_router(compliance_router.router, prefix="/api/v1/compliance", tags=["컴플라이언스"])


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "eLSA Backend"}


@app.get("/api/v1")
async def api_root():
    """API 루트"""
    return {"message": "eLSA API v1", "docs": "/docs"}

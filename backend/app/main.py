from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from app.routers import incubations as incubations_router
from app.routers import mentoring_sessions as mentoring_sessions_router
from app.routers import kpi_records as kpi_records_router
from app.routers import demo_days as demo_days_router
from app.routers import investor_meetings as investor_meetings_router
from app.routers import mentors as mentors_router

app = FastAPI(
    title="eLSA — 딥테크 액셀러레이터 운영시스템",
    description="소싱→심사→투자→보육→수요기업연결→회수 전주기 운영 API",
    version="0.1.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(incubations_router.router, prefix="/api/v1/incubations", tags=["보육"])
app.include_router(mentoring_sessions_router.router, prefix="/api/v1/mentoring-sessions", tags=["멘토링"])
app.include_router(kpi_records_router.router, prefix="/api/v1/kpi-records", tags=["KPI"])
app.include_router(demo_days_router.router, prefix="/api/v1/demo-days", tags=["데모데이"])
app.include_router(investor_meetings_router.router, prefix="/api/v1/investor-meetings", tags=["투자자미팅"])
app.include_router(mentors_router.router, prefix="/api/v1/mentors", tags=["멘토"])


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "eLSA Backend"}


@app.get("/api/v1")
async def api_root():
    """API 루트"""
    return {"message": "eLSA API v1", "docs": "/docs"}

"""데모용 시드 데이터 — 5개 딜 (각 다른 DealStage) + 스크리닝 + 인계문서

킬러 데모 시나리오: "AI 반도체 스타트업 A사"가 파이프라인을 흐르는 모습.

실행: docker compose exec backend python scripts/seed_demo_data.py
주의: seed.py(사용자 생성)를 먼저 실행해야 합니다.
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.database import async_session_maker
from app.enums import DealStage, SourcingChannel
from app.models.deal_flow import DealFlow
from app.models.handover import HandoverDocument
from app.models.review import Review
from app.models.screening import Screening
from app.models.startup import Startup
from app.models.user import User

NOW = datetime.utcnow()


# --- 데모 스타트업 5개 (각 다른 파이프라인 단계) ---

DEMO_STARTUPS = [
    {
        "company_name": "뉴로칩 반도체",
        "ceo_name": "김태호",
        "industry": "AI 반도체",
        "stage": "Seed",
        "one_liner": "NPU 기반 저전력 AI 추론 칩 개발",
        "sourcing_channel": SourcingChannel.UNIVERSITY_LAB,
        "current_deal_stage": DealStage.DEEP_REVIEW,
        "problem_definition": "모바일/엣지 디바이스에서 LLM 추론 시 기존 GPU 대비 전력 소모가 10배 이상",
        "solution_description": "커스텀 NPU 아키텍처로 1W 미만에서 7B 파라미터 모델 추론 가능",
        "team_size": 8,
        "is_fulltime": True,
        "location": "대전 유성구",
    },
    {
        "company_name": "퀀텀머티리얼즈",
        "ceo_name": "박지영",
        "industry": "양자소재",
        "stage": "Pre-A",
        "one_liner": "상온 초전도 소재 합성 플랫폼",
        "sourcing_channel": SourcingChannel.CORPORATE_OI,
        "current_deal_stage": DealStage.IC_REVIEW,
        "problem_definition": "양자컴퓨팅 상용화의 최대 병목은 극저온 냉각 비용",
        "solution_description": "AI 기반 소재 탐색으로 임계온도 200K 이상 초전도체 후보 발견",
        "team_size": 12,
        "is_fulltime": True,
        "location": "서울 관악구",
    },
    {
        "company_name": "바이오센스 AI",
        "ceo_name": "이수민",
        "industry": "바이오 진단",
        "stage": "Seed",
        "one_liner": "멀티모달 AI 기반 조기 암 진단 플랫폼",
        "sourcing_channel": SourcingChannel.VC_CVC_ANGEL,
        "current_deal_stage": DealStage.FIRST_SCREENING,
        "problem_definition": "암 조기 발견율이 30% 미만 — 기존 단일 바이오마커 검사의 한계",
        "solution_description": "혈액+영상+유전체 멀티모달 분석으로 stage 1 암 탐지율 85% 달성",
        "team_size": 6,
        "is_fulltime": True,
        "location": "서울 강남구",
    },
    {
        "company_name": "그린퓨전에너지",
        "ceo_name": "최준혁",
        "industry": "핵융합 에너지",
        "stage": "Pre-seed",
        "one_liner": "소형 토카막 기반 분산형 핵융합 발전",
        "sourcing_channel": SourcingChannel.PUBLIC_PROGRAM,
        "current_deal_stage": DealStage.INBOUND,
        "problem_definition": "탄소중립 달성을 위한 안정적 기저 전력원 부재",
        "solution_description": "고온 초전도 자석 + AI 플라즈마 제어로 소형 핵융합 실증 목표",
        "team_size": 4,
        "is_fulltime": False,
        "location": "대전 유성구",
    },
    {
        "company_name": "스페이스로직",
        "ceo_name": "정하은",
        "industry": "우주 통신",
        "stage": "Seed",
        "one_liner": "LEO 위성 기반 저지연 IoT 통신 솔루션",
        "sourcing_channel": SourcingChannel.PORTFOLIO_REFERRAL,
        "current_deal_stage": DealStage.INTERVIEW,
        "problem_definition": "해양/오지 IoT 디바이스가 통신 사각지대에 놓여있음",
        "solution_description": "자체 LEO 위성 컨스텔레이션으로 99.9% 글로벌 커버리지 + 50ms 이하 지연",
        "team_size": 15,
        "is_fulltime": True,
        "location": "서울 서초구",
    },
]


async def seed_demo() -> None:
    async with async_session_maker() as db:
        # 사용자 조회 (seed.py로 미리 생성)
        sourcing_user = (await db.execute(
            select(User).where(User.email == "sourcing@winlsa.com")
        )).scalar_one_or_none()
        review_user = (await db.execute(
            select(User).where(User.email == "review@winlsa.com")
        )).scalar_one_or_none()

        if not sourcing_user or not review_user:
            print("ERROR: seed.py를 먼저 실행하세요 (사용자 데이터 필요)")
            return

        created_startups = 0
        created_flows = 0
        created_screenings = 0
        created_handovers = 0
        created_reviews = 0

        for data in DEMO_STARTUPS:
            # 중복 체크
            existing = (await db.execute(
                select(Startup).where(Startup.company_name == data["company_name"])
            )).scalar_one_or_none()
            if existing:
                print(f"  SKIP: {data['company_name']} (이미 존재)")
                continue

            startup_id = uuid.uuid4()
            startup = Startup(
                id=startup_id,
                company_name=data["company_name"],
                ceo_name=data["ceo_name"],
                industry=data["industry"],
                stage=data["stage"],
                one_liner=data["one_liner"],
                sourcing_channel=data["sourcing_channel"],
                current_deal_stage=data["current_deal_stage"],
                problem_definition=data.get("problem_definition"),
                solution_description=data.get("solution_description"),
                team_size=data.get("team_size"),
                is_fulltime=data.get("is_fulltime", False),
                location=data.get("location"),
            )
            db.add(startup)
            await db.flush()
            created_startups += 1

            # DealFlow 이력 생성 — 현재 stage까지의 경로
            stage_path = _get_stage_path(data["current_deal_stage"])
            base_time = NOW - timedelta(days=len(stage_path) * 3)
            for i, stage in enumerate(stage_path):
                flow = DealFlow(
                    id=uuid.uuid4(),
                    startup_id=startup_id,
                    stage=stage,
                    moved_at=base_time + timedelta(days=i * 3),
                    moved_by=sourcing_user.id,
                    notes=f"데모 데이터 — {stage.value} 단계 이동",
                )
                db.add(flow)
                created_flows += 1

            # FIRST_SCREENING 이상이면 스크리닝 생성
            if _stage_index(data["current_deal_stage"]) >= 1:
                is_pass = _stage_index(data["current_deal_stage"]) >= 2
                screening = Screening(
                    id=uuid.uuid4(),
                    startup_id=startup_id,
                    screener_id=sourcing_user.id,
                    fulltime_commitment=5 if is_pass else 3,
                    problem_clarity=5 if is_pass else 3,
                    tech_differentiation=5 if is_pass else 3,
                    market_potential=4 if is_pass else 2,
                    initial_validation=4 if is_pass else 2,
                    legal_clear=True,
                    strategy_fit=4 if is_pass else 2,
                    recommendation="pass" if is_pass else "review",
                    overall_score=32.0 if is_pass else 20.0,
                    risk_notes=f"{data['company_name']} — 기술 리스크: 중간, 시장 리스크: 낮음",
                    handover_memo=f"{data['company_name']} 심사팀 인계 메모: {data['one_liner']}",
                )
                db.add(screening)
                created_screenings += 1

                # 인계문서 (sourcing → review)
                handover = HandoverDocument(
                    id=uuid.uuid4(),
                    startup_id=startup_id,
                    from_team="sourcing",
                    to_team="review",
                    handover_type="sourcing_to_review",
                    content={
                        "screening_results": {
                            "grade": "pass" if _stage_index(data["current_deal_stage"]) >= 2 else "review",
                            "overall_score": 75.0 if _stage_index(data["current_deal_stage"]) >= 2 else 45.0,
                            "risk_notes": f"{data['company_name']} 리스크 분석",
                        },
                        "company_overview": {
                            "name": data["company_name"],
                            "ceo": data["ceo_name"],
                            "industry": data["industry"],
                            "stage": data["stage"],
                            "one_liner": data["one_liner"],
                        },
                        "handover_memo": f"{data['one_liner']} — 심사 진행 요청",
                        "key_risks": ["기술 상용화 일정", "초기 시장 규모"],
                    },
                    created_by=sourcing_user.id,
                    acknowledged_by=review_user.id if _stage_index(data["current_deal_stage"]) >= 2 else None,
                    acknowledged_at=NOW - timedelta(days=2) if _stage_index(data["current_deal_stage"]) >= 2 else None,
                )
                db.add(handover)
                created_handovers += 1

            # DEEP_REVIEW 이상이면 서류심사 리뷰 생성
            if _stage_index(data["current_deal_stage"]) >= 2:
                review = Review(
                    id=uuid.uuid4(),
                    startup_id=startup_id,
                    reviewer_id=review_user.id,
                    review_type="document",
                    team_score=4,
                    problem_score=4,
                    solution_score=3,
                    market_score=3,
                    traction_score=3,
                    overall_verdict="proceed",
                )
                db.add(review)
                created_reviews += 1

        await db.commit()

        print(f"\n데모 시드 데이터 생성 완료:")
        print(f"  스타트업: {created_startups}개")
        print(f"  딜플로우: {created_flows}건")
        print(f"  스크리닝: {created_screenings}건")
        print(f"  인계문서: {created_handovers}건")
        print(f"  심사리뷰: {created_reviews}건")


# --- 헬퍼 ---

STAGE_ORDER = [
    DealStage.INBOUND,
    DealStage.FIRST_SCREENING,
    DealStage.DEEP_REVIEW,
    DealStage.INTERVIEW,
    DealStage.DUE_DILIGENCE,
    DealStage.IC_PENDING,
    DealStage.IC_REVIEW,
]


def _stage_index(stage: DealStage) -> int:
    try:
        return STAGE_ORDER.index(stage)
    except ValueError:
        return 0


def _get_stage_path(target: DealStage) -> list[DealStage]:
    idx = _stage_index(target)
    return STAGE_ORDER[: idx + 1]


if __name__ == "__main__":
    print("eLSA 데모 시드 데이터 생성 시작...")
    asyncio.run(seed_demo())

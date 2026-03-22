"""심사 서비스 — 3종 심사 CRUD + DD 자동 완료 감지 (#3)"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage
from app.models.review import Review
from app.models.startup import Startup
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewUpdate
from app.services import activity_log_service, deal_flow_service


async def get_by_startup(
    db: AsyncSession,
    startup_id: uuid.UUID,
    review_type: str | None = None,
) -> list[Review]:
    query = select(Review).where(Review.startup_id == startup_id, Review.is_deleted == False)  # noqa: E712
    if review_type:
        query = query.where(Review.review_type == review_type)
    result = await db.execute(query.order_by(Review.started_at.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, review_id: uuid.UUID) -> Review | None:
    result = await db.execute(select(Review).where(Review.id == review_id, Review.is_deleted == False))  # noqa: E712
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, startup: Startup, user: User, data: ReviewCreate,
) -> Review:
    review = Review(
        startup_id=startup.id,
        reviewer_id=user.id,
        review_type=data.review_type,
        team_score=data.team_score,
        problem_score=data.problem_score,
        solution_score=data.solution_score,
        market_score=data.market_score,
        traction_score=data.traction_score,
        number_literacy=data.number_literacy,
        customer_experience=data.customer_experience,
        tech_moat=data.tech_moat,
        execution_plan=data.execution_plan,
        feedback_absorption=data.feedback_absorption,
        cofounder_stability=data.cofounder_stability,
        dd_checklist=data.dd_checklist,
        risk_log=data.risk_log,
        overall_verdict=data.overall_verdict,
        tech_type=data.tech_type,
        scalability_score=data.scalability_score,
        process_compatibility=data.process_compatibility,
        sample_test_status=data.sample_test_status,
        certification_stage=data.certification_stage,
        purchase_lead_time_months=data.purchase_lead_time_months,
    )
    db.add(review)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "review", "review_type": data.review_type, "verdict": data.overall_verdict},
        startup_id=startup.id,
    )
    await db.refresh(review)
    return review


async def update(
    db: AsyncSession, review: Review, data: ReviewUpdate, user: User,
    startup: Startup,
) -> Review:
    """심사 수정 — DD 체크리스트 업데이트 시 자동 완료 감지 (#3)"""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)

    # 자동화 #3: DD 10항목 전체 completed → 자동 완료
    if review.review_type == "dd" and review.dd_checklist:
        all_completed = all(
            v == "completed" for v in review.dd_checklist.values()
        )
        if all_completed and review.completed_at is None:
            review.completed_at = datetime.now(timezone.utc)
            # DealStage → IC_PENDING
            await deal_flow_service.move_stage(
                db, startup, DealStage.IC_PENDING, user,
                notes="DD 10항목 전체 수령 완료 → IC 상정 대기",
            )

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "review", "review_type": review.review_type},
        startup_id=review.startup_id,
    )
    await db.refresh(review)
    return review

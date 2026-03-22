"""AI 분석 서비스"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_analysis import AIAnalysis
from app.schemas.ai_analysis import AIAnalysisCreate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    startup_id: uuid.UUID | None = None,
    analysis_type: str | None = None,
) -> list[AIAnalysis]:
    query = select(AIAnalysis).where(AIAnalysis.is_deleted == False)
    if startup_id:
        query = query.where(AIAnalysis.startup_id == startup_id)
    if analysis_type:
        query = query.where(AIAnalysis.analysis_type == analysis_type)
    query = query.order_by(AIAnalysis.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, analysis_id: uuid.UUID) -> AIAnalysis | None:
    query = select(AIAnalysis).where(
        AIAnalysis.id == analysis_id,
        AIAnalysis.is_deleted == False,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: AIAnalysisCreate, user_id: uuid.UUID | None = None,
) -> AIAnalysis:
    analysis = AIAnalysis(**data.model_dump())
    db.add(analysis)
    await db.flush()
    if user_id:
        await activity_log_service.log(
            db,
            user_id=user_id,
            action_type="ai_analysis_create",
            action_detail={"analysis_type": data.analysis_type, "entity": "ai_analysis"},
            startup_id=data.startup_id,
        )
    await db.refresh(analysis)
    return analysis

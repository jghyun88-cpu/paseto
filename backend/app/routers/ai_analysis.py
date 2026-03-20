"""AI 분석 라우터 — /api/v1/ai-analysis/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.middleware.rbac import require_permission
from app.schemas.ai_analysis import AIAnalysisCreate, AIAnalysisResponse
from app.services import ai_analysis_service

router = APIRouter()


@router.get("/", response_model=list[AIAnalysisResponse])
async def list_analyses(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
    startup_id: uuid.UUID | None = None,
    analysis_type: str | None = None,
) -> list[AIAnalysisResponse]:
    """AI 분석 결과 목록 조회"""
    items = await ai_analysis_service.get_list(db, startup_id, analysis_type)
    return [AIAnalysisResponse.model_validate(a) for a in items]


@router.get("/{analysis_id}", response_model=AIAnalysisResponse)
async def get_analysis(
    analysis_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
) -> AIAnalysisResponse:
    """AI 분석 결과 상세 조회"""
    analysis = await ai_analysis_service.get_by_id(db, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 AI 분석 결과를 찾을 수 없습니다.",
        )
    return AIAnalysisResponse.model_validate(analysis)


@router.post("/", response_model=AIAnalysisResponse, status_code=201)
async def create_analysis(
    data: AIAnalysisCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("startup", "write"))],
) -> AIAnalysisResponse:
    """AI 분석 결과 저장 (에이전트에서 호출)"""
    analysis = await ai_analysis_service.create(db, data, user_id=current_user.id)
    return AIAnalysisResponse.model_validate(analysis)

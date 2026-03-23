"""스크리닝 라우터 — /api/v1/screenings/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.errors import screening_not_found
from app.schemas.screening import ScreeningCreate, ScreeningResponse, ScreeningUpdate
from app.services import screening_service, startup_service

router = APIRouter()


@router.get("", response_model=list[ScreeningResponse])
@router.get("/", response_model=list[ScreeningResponse], include_in_schema=False)
async def list_screenings(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("screening", "read"))],
) -> list[ScreeningResponse]:
    """스타트업의 스크리닝 결과 목록"""
    items = await screening_service.get_by_startup(db, startup_id)
    return [ScreeningResponse.model_validate(s) for s in items]


@router.get("/{screening_id}", response_model=ScreeningResponse)
async def get_screening(
    screening_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("screening", "read"))],
) -> ScreeningResponse:
    """스크리닝 상세 조회"""
    screening = await screening_service.get_by_id(db, screening_id)
    if screening is None:
        raise screening_not_found()
    return ScreeningResponse.model_validate(screening)


@router.post("", response_model=ScreeningResponse, status_code=201)
@router.post("/", response_model=ScreeningResponse, status_code=201, include_in_schema=False)
async def create_screening(
    data: ScreeningCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("screening", "full"))],
) -> ScreeningResponse:
    """스크리닝 제출 (SRC-F02) → 자동 채점 + 인계 트리거"""
    startup = await startup_service.get_by_id(db, data.startup_id)
    if startup is None:
        raise startup_not_found()
    screening = await screening_service.create(
        db, startup, current_user,
        fulltime_commitment=data.fulltime_commitment,
        problem_clarity=data.problem_clarity,
        tech_differentiation=data.tech_differentiation,
        market_potential=data.market_potential,
        initial_validation=data.initial_validation,
        legal_clear=data.legal_clear,
        strategy_fit=data.strategy_fit,
        risk_notes=data.risk_notes,
        handover_memo=data.handover_memo,
        handover_to_review=data.handover_to_review,
    )
    return ScreeningResponse.model_validate(screening)


@router.patch("/{screening_id}", response_model=ScreeningResponse)
async def update_screening(
    screening_id: uuid.UUID,
    data: ScreeningUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("screening", "full"))],
) -> ScreeningResponse:
    """스크리닝 수정 + 점수 재계산"""
    screening = await screening_service.get_by_id(db, screening_id)
    if screening is None:
        raise screening_not_found()
    updated = await screening_service.update(db, screening, data, current_user)
    return ScreeningResponse.model_validate(updated)


@router.delete("/{screening_id}", status_code=204)
async def delete_screening(
    screening_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("screening", "full"))],
) -> None:
    """스크리닝 소프트 삭제"""
    screening = await screening_service.get_by_id(db, screening_id)
    if screening is None:
        raise screening_not_found()
    await screening_service.soft_delete(db, screening, current_user)

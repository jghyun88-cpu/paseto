"""인계 라우터 — /api/v1/handovers/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import handover_not_found, handover_team_mismatch, startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.handover import (
    HandoverResponse,
    HandoverStatsResponse,
    ManualHandoverCreate,
)
from app.services import handover_service

router = APIRouter()


# --- 팀별 acknowledge 권한 매핑 ---

_TEAM_PERMISSIONS: dict[str, tuple[str, str]] = {
    "review":     ("review_dd_memo", "write"),
    "backoffice": ("deal_flow", "write"),
    "incubation": ("deal_flow", "write"),
    "oi":         ("deal_flow", "write"),
    "all":        ("deal_flow", "write"),
}


@router.get("/stats", response_model=HandoverStatsResponse)
async def get_handover_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> HandoverStatsResponse:
    """인계 통계 — 경로별 건수, 평균 확인 시간, 에스컬레이션 비율"""
    data = await handover_service.get_stats(db)
    return HandoverStatsResponse(**data)


@router.get("/")
async def list_handovers(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
    from_team: str | None = None,
    to_team: str | None = None,
    handover_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """인계 목록 조회 (페이지네이션 + 필터)"""
    items, total = await handover_service.get_list(
        db, from_team=from_team, to_team=to_team, handover_type=handover_type,
        page=page, page_size=page_size,
    )
    return {
        "data": [HandoverResponse.model_validate(h) for h in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{handover_id}", response_model=HandoverResponse)
async def get_handover(
    handover_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("deal_flow", "read"))],
) -> HandoverResponse:
    """인계 상세 조회"""
    handover = await handover_service.get_by_id(db, handover_id)
    if handover is None:
        raise handover_not_found()
    return HandoverResponse.model_validate(handover)


@router.post("/manual", response_model=HandoverResponse, status_code=201)
async def create_manual_handover(
    body: ManualHandoverCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "write"))],
) -> HandoverResponse:
    """수동 인계 생성 — 기업 선택 + 경로 선택 + 필수항목 입력"""
    from sqlalchemy import select
    from app.models.startup import Startup

    result = await db.execute(
        select(Startup).where(Startup.id == body.startup_id, Startup.is_deleted == False)  # noqa: E712
    )
    startup = result.scalar_one_or_none()
    if startup is None:
        raise startup_not_found()

    handover = await handover_service.create_manual(
        db,
        startup=startup,
        user=current_user,
        handover_type=body.handover_type,
        content=body.content,
        memo=body.memo,
    )
    return HandoverResponse.model_validate(handover)


@router.post("/{handover_id}/acknowledge", response_model=HandoverResponse)
async def acknowledge_handover(
    handover_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("deal_flow", "write"))],
) -> HandoverResponse:
    """인계 수신 확인 — 수신팀(to_team) 소속 + write 권한 필요"""
    handover = await handover_service.get_by_id(db, handover_id)
    if handover is None:
        raise handover_not_found()

    # 수신팀 소속 검증: to_team이 사용자의 team과 일치해야 함
    to_team = handover.to_team
    if to_team != "all" and current_user.team != to_team:
        raise handover_team_mismatch()

    updated = await handover_service.acknowledge(db, handover, current_user)
    return HandoverResponse.model_validate(updated)

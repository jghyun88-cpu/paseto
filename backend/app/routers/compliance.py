"""컴플라이언스 API 라우터 — /api/v1/compliance/"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.compliance import ComplianceChecklistResponse, ComplianceChecklistUpdate
from app.services import compliance_service

router = APIRouter()


@router.get("/checklists/", response_model=ComplianceChecklistResponse | None)
async def get_checklist(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_permission("compliance", "read"))],
    checklist_type: str = "default",
) -> ComplianceChecklistResponse | None:
    """최신 컴플라이언스 체크리스트 조회"""
    result = await compliance_service.get_latest(db, user.id, checklist_type)
    if result is None:
        return None
    return ComplianceChecklistResponse.model_validate(result)


@router.patch("/checklists/", response_model=ComplianceChecklistResponse)
async def upsert_checklist(
    data: ComplianceChecklistUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_permission("compliance", "full"))],
) -> ComplianceChecklistResponse:
    """체크리스트 저장 (없으면 생성, 있으면 수정)"""
    result = await compliance_service.upsert(db, data, user)
    return ComplianceChecklistResponse.model_validate(result)

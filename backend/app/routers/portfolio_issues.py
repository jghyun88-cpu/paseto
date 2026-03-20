"""포트폴리오 이슈 라우터 — /api/v1/portfolio-issues/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.middleware.rbac import require_permission
from app.schemas.portfolio_issue import (
    PortfolioIssueCreate,
    PortfolioIssueResponse,
    PortfolioIssueUpdate,
)
from app.services import portfolio_issue_service

router = APIRouter()


@router.get("/", response_model=list[PortfolioIssueResponse])
async def list_issues(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
    startup_id: uuid.UUID | None = None,
    resolved: bool | None = None,
) -> list[PortfolioIssueResponse]:
    """포트폴리오 이슈 목록 조회"""
    items = await portfolio_issue_service.get_list(db, startup_id, resolved)
    return [PortfolioIssueResponse.model_validate(i) for i in items]


@router.get("/{issue_id}", response_model=PortfolioIssueResponse)
async def get_issue(
    issue_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
) -> PortfolioIssueResponse:
    """포트폴리오 이슈 상세 조회"""
    issue = await portfolio_issue_service.get_by_id(db, issue_id)
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 이슈를 찾을 수 없습니다.",
        )
    return PortfolioIssueResponse.model_validate(issue)


@router.post("/", response_model=PortfolioIssueResponse, status_code=201)
async def create_issue(
    data: PortfolioIssueCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("startup", "write"))],
) -> PortfolioIssueResponse:
    """포트폴리오 이슈 생성 (리스크 모니터링 에이전트에서 호출)"""
    issue = await portfolio_issue_service.create(db, data, user_id=current_user.id)
    return PortfolioIssueResponse.model_validate(issue)


@router.patch("/{issue_id}", response_model=PortfolioIssueResponse)
async def update_issue(
    issue_id: uuid.UUID,
    data: PortfolioIssueUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "write"))],
) -> PortfolioIssueResponse:
    """포트폴리오 이슈 수정 (해결 처리 등)"""
    issue = await portfolio_issue_service.get_by_id(db, issue_id)
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 이슈를 찾을 수 없습니다.",
        )
    updated = await portfolio_issue_service.update(db, issue, data)
    return PortfolioIssueResponse.model_validate(updated)

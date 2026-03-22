"""포트폴리오 이슈 서비스"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio_issue import PortfolioIssue
from app.schemas.portfolio_issue import PortfolioIssueCreate, PortfolioIssueUpdate
from app.services import activity_log_service


async def get_list(
    db: AsyncSession,
    startup_id: uuid.UUID | None = None,
    resolved: bool | None = None,
) -> list[PortfolioIssue]:
    query = select(PortfolioIssue).where(PortfolioIssue.is_deleted == False)
    if startup_id:
        query = query.where(PortfolioIssue.startup_id == startup_id)
    if resolved is not None:
        query = query.where(PortfolioIssue.resolved == resolved)
    query = query.order_by(PortfolioIssue.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, issue_id: uuid.UUID) -> PortfolioIssue | None:
    query = select(PortfolioIssue).where(
        PortfolioIssue.id == issue_id,
        PortfolioIssue.is_deleted == False,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, data: PortfolioIssueCreate, user_id: uuid.UUID | None = None,
) -> PortfolioIssue:
    issue = PortfolioIssue(**data.model_dump())
    db.add(issue)
    await db.flush()
    if user_id:
        await activity_log_service.log(
            db,
            user_id=user_id,
            action_type="portfolio_issue_create",
            action_detail={"issue_type": data.issue_type, "severity": data.severity, "entity": "portfolio_issue"},
            startup_id=data.startup_id,
        )
    await db.refresh(issue)
    return issue


async def update(
    db: AsyncSession, issue: PortfolioIssue, data: PortfolioIssueUpdate,
) -> PortfolioIssue:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(issue, field, value)
    await db.refresh(issue)
    return issue

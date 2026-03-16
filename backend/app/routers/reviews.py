"""심사 라우터 — /api/v1/reviews/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import startup_not_found
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate
from app.services import review_service, startup_service

router = APIRouter()


@router.get("/", response_model=list[ReviewResponse])
async def list_reviews(
    startup_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("review_dd_memo", "read"))],
    review_type: str | None = None,
) -> list[ReviewResponse]:
    items = await review_service.get_by_startup(db, startup_id, review_type)
    return [ReviewResponse.model_validate(r) for r in items]


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("review_dd_memo", "read"))],
) -> ReviewResponse:
    review = await review_service.get_by_id(db, review_id)
    if review is None:
        from app.errors import review_not_found
        raise review_not_found()
    return ReviewResponse.model_validate(review)


@router.post("/", response_model=ReviewResponse, status_code=201)
async def create_review(
    data: ReviewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("review_dd_memo", "full"))],
) -> ReviewResponse:
    startup = await startup_service.get_by_id(db, data.startup_id)
    if startup is None:
        raise startup_not_found()
    review = await review_service.create(db, startup, current_user, data)
    return ReviewResponse.model_validate(review)


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    data: ReviewUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("review_dd_memo", "full"))],
) -> ReviewResponse:
    review = await review_service.get_by_id(db, review_id)
    if review is None:
        from app.errors import review_not_found
        raise review_not_found()
    startup = await startup_service.get_by_id(db, review.startup_id)
    if startup is None:
        raise startup_not_found()
    updated = await review_service.update(db, review, data, current_user, startup)
    return ReviewResponse.model_validate(updated)

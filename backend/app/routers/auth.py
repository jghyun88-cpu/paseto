"""인증 API 라우터 — POST /login, GET /me, GET /users, POST /register"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import email_already_exists, inactive_user, invalid_credentials
from app.middleware.auth import create_access_token, get_current_active_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """이메일 + 비밀번호 로그인 → JWT 토큰 발급"""
    user = await user_service.authenticate(db, data.email, data.password)
    if user is None:
        raise invalid_credentials()
    if not user.is_active:
        raise inactive_user()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """현재 로그인한 사용자 정보 반환"""
    return UserResponse.model_validate(current_user)


@router.get("/users")
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> dict:
    """사용자 목록"""
    query = select(User).where(User.is_active == True)  # noqa: E712
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.order_by(User.created_at.desc()).offset(offset).limit(page_size))
    users = list(result.scalars().all())

    return {
        "data": [UserResponse.model_validate(u) for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """사용자 등록"""
    existing = await user_service.get_by_email(db, data.email)
    if existing:
        raise email_already_exists()

    user = await user_service.create_user(db, data)
    return UserResponse.model_validate(user)

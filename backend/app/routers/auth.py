"""인증 API 라우터 — POST /login, GET /me"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import inactive_user, invalid_credentials
from app.middleware.auth import create_access_token, get_current_active_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserResponse
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

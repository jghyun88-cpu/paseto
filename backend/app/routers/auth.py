"""인증 API 라우터 — POST /login, GET /me, GET /users, POST /register, PATCH/DELETE /users/{id}"""

import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import email_already_exists, inactive_user, invalid_credentials, permission_denied, user_not_found
from app.middleware.auth import create_access_token, get_current_active_user
from app.models.user import User
from app.config import settings
from app.schemas.auth import LoginRequest, ServiceTokenRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services import user_service

router = APIRouter()


def _require_admin(user: User) -> None:
    """관리자 역할 검증 — 관리자가 아니면 403"""
    if user.role != "admin":
        raise permission_denied()


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


@router.post("/service-token", response_model=TokenResponse)
async def create_service_token(
    data: ServiceTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """서비스 계정 토큰 발급 — MCP 서버용 장기 토큰 (기본 30일)"""
    if not settings.SERVICE_KEY:
        raise invalid_credentials()
    if not hmac.compare_digest(data.service_key, settings.SERVICE_KEY):
        raise invalid_credentials()

    user = await user_service.authenticate(db, data.email, data.password)
    if user is None:
        raise invalid_credentials()
    if not user.is_active:
        raise inactive_user()

    from jose import jwt
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.SERVICE_TOKEN_EXPIRATION_HOURS)
    token = jwt.encode(
        {"sub": str(user.id), "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
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
    """사용자 목록 (비활성·삭제 제외)"""
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
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """사용자 등록 (관리자 전용)"""
    _require_admin(current_user)

    existing = await user_service.get_by_email(db, data.email)
    if existing:
        raise email_already_exists()

    user = await user_service.create_user(db, data)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """사용자 수정 (관리자 전용)"""
    _require_admin(current_user)

    target = await user_service.get_by_id(db, user_id)
    if target is None:
        raise user_not_found()

    updated = await user_service.update_user(db, target, data)
    return UserResponse.model_validate(updated)


@router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """사용자 활성/비활성 토글 (관리자 전용)"""
    _require_admin(current_user)

    target = await user_service.get_by_id(db, user_id)
    if target is None:
        raise user_not_found()

    # 자기 자신을 비활성화하는 것 방지
    if target.id == current_user.id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신의 계정은 비활성화할 수 없습니다.",
        )

    updated = await user_service.toggle_active(db, target)
    return UserResponse.model_validate(updated)


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict:
    """비밀번호 리셋 → 임시 비밀번호 반환 (관리자 전용)"""
    _require_admin(current_user)

    target = await user_service.get_by_id(db, user_id)
    if target is None:
        raise user_not_found()

    temp_password = await user_service.reset_password(db, target)

    # TODO: 실제 이메일 발송 (현재는 임시 비밀번호를 응답으로 반환)
    return {
        "message": f"임시 비밀번호가 생성되었습니다. 사용자({target.email})에게 전달해주세요.",
        "temp_password": temp_password,
        "user_email": target.email,
    }


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> None:
    """사용자 삭제 — soft delete (관리자 전용)"""
    _require_admin(current_user)

    if user_id == current_user.id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신의 계정은 삭제할 수 없습니다.",
        )

    target = await user_service.get_by_id(db, user_id)
    if target is None:
        raise user_not_found()

    await user_service.soft_delete_user(db, target)

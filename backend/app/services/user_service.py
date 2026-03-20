"""사용자 서비스 — 비밀번호 해싱, 인증, CRUD"""

import secrets
import string
import uuid

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_temp_password(length: int = 12) -> str:
    """임시 비밀번호 생성 (영문 대소문자 + 숫자 + 특수문자)"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    """이메일 + 비밀번호 검증 → User 또는 None"""
    user = await get_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    """새 사용자 생성"""
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        team=data.team,
        role_title=data.role_title,
    )
    db.add(user)
    await db.flush()
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user: User, data: UserUpdate) -> User:
    """사용자 정보 수정"""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    await db.commit()
    await db.refresh(user)
    return user


async def toggle_active(db: AsyncSession, user: User) -> User:
    """활성/비활성 토글"""
    user.is_active = not user.is_active
    await db.flush()
    await db.commit()
    await db.refresh(user)
    return user


async def reset_password(db: AsyncSession, user: User) -> str:
    """비밀번호를 임시 비밀번호로 리셋 → 임시 비밀번호 반환"""
    temp_pw = generate_temp_password()
    user.hashed_password = hash_password(temp_pw)
    await db.flush()
    await db.commit()
    await db.refresh(user)
    return temp_pw


async def soft_delete_user(db: AsyncSession, user: User) -> None:
    """사용자 soft delete (is_active=False + 이메일 변경으로 재사용 방지)"""
    user.is_active = False
    if not user.email.startswith("deleted_"):
        user.email = f"deleted_{user.id}_{user.email}"
    await db.flush()
    await db.commit()

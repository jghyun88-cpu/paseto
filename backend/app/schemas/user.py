"""사용자 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    """사용자 응답 — API 반환용"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str
    team: str
    role_title: str | None = None
    is_active: bool


class UserCreate(BaseModel):
    """사용자 생성 요청"""
    name: str
    email: EmailStr
    password: str
    role: str
    team: str
    role_title: str | None = None


class UserUpdate(BaseModel):
    """사용자 수정 요청"""
    name: str | None = None
    role: str | None = None
    team: str | None = None
    role_title: str | None = None
    is_active: bool | None = None

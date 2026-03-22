"""사용자 관련 Pydantic 스키마"""

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# CLAUDE.md RBAC 정의 기준
UserRole = Literal["partner", "analyst", "pm", "oi_manager", "backoffice", "admin"]
UserTeam = Literal["sourcing", "review", "incubation", "oi", "backoffice"]


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
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    team: UserTeam
    role_title: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        """비밀번호 복잡도: 영문 대/소문자 + 숫자 + 특수문자 각 1개 이상"""
        if not re.search(r"[A-Z]", v):
            raise ValueError("비밀번호에 영문 대문자가 1개 이상 포함되어야 합니다.")
        if not re.search(r"[a-z]", v):
            raise ValueError("비밀번호에 영문 소문자가 1개 이상 포함되어야 합니다.")
        if not re.search(r"\d", v):
            raise ValueError("비밀번호에 숫자가 1개 이상 포함되어야 합니다.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("비밀번호에 특수문자가 1개 이상 포함되어야 합니다.")
        return v


class UserUpdate(BaseModel):
    """사용자 수정 요청"""
    name: str | None = None
    role: UserRole | None = None
    team: UserTeam | None = None
    role_title: str | None = None
    is_active: bool | None = None

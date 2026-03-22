"""RBAC 권한 미들웨어 — 마스터 §7, §43 기반 팀별 권한 매트릭스"""

from typing import Annotated

from fastapi import Depends

from app.errors import permission_denied
from app.middleware.auth import get_current_active_user
from app.models.user import User

# 권한 레벨 순서 (숫자가 클수록 높은 권한)
LEVEL_ORDER = {"read": 1, "write": 2, "full": 3, "approve": 4}

# 리소스별 팀 권한 매트릭스 — 마스터 §7
PERMISSIONS: dict[str, dict[str, str]] = {
    "deal_flow": {
        "sourcing": "full", "review": "read", "incubation": "read",
        "oi": "read", "backoffice": "read",
    },
    "screening": {
        "sourcing": "full", "review": "read",
    },
    "review_dd_memo": {
        "review": "full", "incubation": "read", "backoffice": "read",
    },
    "ic_decision": {
        "review": "write", "backoffice": "read",
    },
    "contract": {
        "backoffice": "full",
    },
    "valuation": {
        "review": "full",
    },
    "incubation": {
        "incubation": "full", "review": "read", "sourcing": "read",
        "oi": "read", "backoffice": "read",
    },
    "mentoring": {
        "incubation": "full", "review": "read", "backoffice": "read",
    },
    "kpi": {
        "incubation": "full", "review": "read", "oi": "read", "backoffice": "read",
    },
    "portfolio_grade": {
        "incubation": "full",
    },
    "poc_matching": {
        "incubation": "read", "oi": "full",
    },
    "cap_table": {
        "review": "read", "backoffice": "full",
    },
    "compliance": {
        "backoffice": "full",
    },
    "startup": {
        "sourcing": "full", "review": "read", "incubation": "read",
        "oi": "read", "backoffice": "read",
    },
    "legal_commitment": {
        # partner만 가능 (아래 bypass 로직)
    },
}


# partner가 접근할 수 없는 리소스 (backoffice/admin 전용)
PARTNER_RESTRICTED_RESOURCES = {"compliance", "cap_table"}


def _has_permission(user: User, resource: str, required_level: str) -> bool:
    """사용자가 해당 리소스에 필요한 권한 레벨 이상을 가지는지 확인"""
    # admin은 모든 권한 bypass
    if user.role == "admin":
        return True

    # partner는 비즈니스 리소스만 bypass (compliance, cap_table 등 제외)
    if user.role == "partner":
        return resource not in PARTNER_RESTRICTED_RESOURCES

    team_permissions = PERMISSIONS.get(resource, {})
    user_level = team_permissions.get(user.team)

    if user_level is None:
        return False

    return LEVEL_ORDER.get(user_level, 0) >= LEVEL_ORDER.get(required_level, 0)


def require_permission(resource: str, level: str = "read"):
    """FastAPI 의존성 팩토리: 해당 리소스에 최소 level 권한 필요

    사용법:
        @router.get("/", dependencies=[Depends(require_permission("deal_flow", "read"))])
        async def list_deals(...):
    """

    async def _check(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        if not _has_permission(current_user, resource, level):
            raise permission_denied()
        return current_user

    return _check

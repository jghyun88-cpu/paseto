"""KSIC(표준산업분류) 검색 API"""

import json
import os
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_active_user
from app.models.user import User

router = APIRouter(tags=["KSIC"])

# 앱 시작 시 KSIC 데이터를 메모리에 로드
_ksic_data: list[dict[str, str]] = []


def _load_ksic() -> None:
    global _ksic_data
    if _ksic_data:
        return
    data_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "ksic.json")
    data_path = os.path.normpath(data_path)
    if os.path.exists(data_path):
        with open(data_path, encoding="utf-8") as f:
            _ksic_data = json.load(f)


@router.get("/search")
async def search_ksic(
    _user: Annotated[User, Depends(get_current_active_user)],
    q: str = Query(..., min_length=1, description="코드 또는 업종명 검색"),
) -> list[dict[str, str]]:
    """KSIC 코드/업종명으로 부분 일치 검색 (최대 20건)"""
    _load_ksic()
    query = q.strip().upper()
    results: list[dict[str, str]] = []

    for item in _ksic_data:
        code_match = query in item["code"].upper()
        name_match = q.strip() in item["name"]
        if code_match or name_match:
            results.append(item)
            if len(results) >= 20:
                break

    return results

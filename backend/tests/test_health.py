"""헬스체크 API 테스트"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """헬스체크 엔드포인트 기본 응답"""
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "db" in data
    assert "uptime_seconds" in data
    # SQLite in-memory이므로 DB는 true
    assert data["db"] is True

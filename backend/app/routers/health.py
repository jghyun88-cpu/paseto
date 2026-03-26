"""헬스체크 라우터 — DB/Redis 연결 상태 + 시스템 정보"""

import time
from pathlib import Path

from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings

router = APIRouter()

_start_time = time.time()


async def _get_redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """DB/Redis 연결 상태 확인"""
    db_ok = False
    redis_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        redis = await _get_redis()
        await redis.ping()
        redis_ok = True
        await redis.aclose()
    except Exception:
        pass

    status = "ok" if (db_ok and redis_ok) else "degraded"
    return {
        "status": status,
        "db": db_ok,
        "redis": redis_ok,
        "uptime_seconds": int(time.time() - _start_time),
    }


@router.get("/system-status")
async def system_status(db: AsyncSession = Depends(get_db)):
    """관리자용 시스템 상태 페이지 데이터"""
    uptime = int(time.time() - _start_time)

    # DB 상태
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Redis 상태
    redis_ok = False
    redis_info: dict = {}
    try:
        redis = await _get_redis()
        await redis.ping()
        redis_ok = True
        info = await redis.info("memory")
        redis_info = {"used_memory_human": info.get("used_memory_human", "N/A")}
        await redis.aclose()
    except Exception:
        pass

    # 최근 24시간 에러 건수
    error_count = 0
    today_log = Path("/app/logs/errors") / f"errors-{time.strftime('%Y-%m-%d')}.jsonl"
    if today_log.exists():
        error_count = sum(1 for _ in today_log.open(encoding="utf-8"))

    return {
        "uptime_seconds": uptime,
        "uptime_human": f"{uptime // 3600}h {(uptime % 3600) // 60}m",
        "db": {"connected": db_ok},
        "redis": {"connected": redis_ok, **redis_info},
        "errors_today": error_count,
    }

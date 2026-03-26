"""에러 모니터링 미들웨어 — 500 에러 구조화 JSON 로깅"""

import json
import logging
import time
import traceback
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("elsa.errors")

# 로그 디렉토리 (Docker volume 또는 로컬)
LOG_DIR = Path("/app/logs/errors")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# 분당 에러 카운터 (간단한 인메모리 집계)
_error_counts: list[float] = []
THRESHOLD_PER_MINUTE = 5


class ErrorMonitorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            _log_error(request, exc)
            raise


def _log_error(request: Request, exc: Exception) -> None:
    """500 에러를 구조화 JSON으로 기록"""
    now = time.time()

    # user_id 추출 시도 (JWT 토큰에서)
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.middleware.auth import decode_token
            payload = decode_token(auth_header.split(" ", 1)[1])
            user_id = payload.get("sub")
        except Exception:
            pass

    error_entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "path": str(request.url.path),
        "method": request.method,
        "user_id": user_id,
        "error_type": type(exc).__name__,
        "error_message": str(exc),
        "traceback": traceback.format_exc(),
    }

    # 파일 로깅
    try:
        log_file = LOG_DIR / f"errors-{time.strftime('%Y-%m-%d')}.jsonl"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(error_entry, ensure_ascii=False) + "\n")
    except OSError:
        pass  # 파일 쓰기 실패 시 표준 로거로 폴백

    # 표준 로거
    logger.error(
        "500 에러: %s %s — %s: %s",
        request.method, request.url.path,
        type(exc).__name__, exc,
        exc_info=True,
    )

    # 분당 임계값 경고
    _error_counts.append(now)
    cutoff = now - 60
    _error_counts[:] = [t for t in _error_counts if t > cutoff]
    if len(_error_counts) >= THRESHOLD_PER_MINUTE:
        logger.warning(
            "에러 임계값 초과: 최근 1분간 %d건 (임계값: %d)",
            len(_error_counts), THRESHOLD_PER_MINUTE,
        )

"""
AI 평가 엔진 — Claude fallback 전용

직접 파싱(ai_report_parser)으로 점수를 추출할 수 없는 경우에만 호출.
Claude API로 루브릭 기반 평가를 수행한다.
"""

import json
import logging
from typing import Any

from app.config import settings
from app.services.ai_report_parser import (
    DEEPTECH_ITEMS,
    GENERAL_ITEMS,
)

logger = logging.getLogger(__name__)

# 판정 임계값 (evaluation-rubric.md 기준)
_VERDICT_THRESHOLDS: list[tuple[int, str]] = [
    (80, "pass"),
    (70, "conditional"),
    (50, "hold"),
    (0, "decline"),
]

# Claude 호출 제한
_TIMEOUT_SECONDS = 120
_MAX_RETRIES = 1
_MAX_INPUT_CHARS = 150_000  # 약 50K 토큰


def calculate_verdict(total_score: float) -> str:
    """총점 → 판정 매핑.

    80~100: pass, 70~79: conditional, 50~69: hold, 0~49: decline
    """
    for threshold, verdict in _VERDICT_THRESHOLDS:
        if total_score >= threshold:
            return verdict
    return "decline"


def convert_scores_deeptech_to_general(
    scores: dict[str, Any],
) -> dict[str, Any]:
    """딥테크 10항목 점수를 일반 8항목 100점 만점으로 비례 환산.

    딥테크 전용 항목(TRL, IP/특허)은 공유 항목에 분배.
    """
    if not scores:
        return scores

    deeptech_max = {key: mx for key, _, mx in DEEPTECH_ITEMS}

    converted: dict[str, Any] = {}
    for key, _, gen_max in GENERAL_ITEMS:
        dt_max = deeptech_max.get(key)
        if dt_max and key in scores:
            src = scores[key]
            ratio = src["score"] / dt_max if dt_max > 0 else 0
            converted[key] = {
                "score": round(ratio * gen_max, 1),
                "max": gen_max,
                "rationale": src.get("rationale", ""),
            }

    return converted


def _build_rubric_prompt(is_deeptech: bool) -> str:
    """루브릭 프롬프트 생성."""
    items = DEEPTECH_ITEMS if is_deeptech else GENERAL_ITEMS
    item_lines = "\n".join(
        f"- {label} (만점: {mx}점)" for _, label, mx in items
    )
    type_label = "딥테크 10항목" if is_deeptech else "일반 8항목"

    return f"""당신은 딥테크 액셀러레이터의 투자 심사 전문가입니다.
아래 보고서를 분석하여 {type_label} 루브릭에 따라 점수를 매기세요.

## 평가 항목
{item_lines}

## 출력 형식 (반드시 JSON)
{{
  "items": {{
    "항목키": {{"score": 점수, "max": 만점, "rationale": "근거 (한국어, 2문장 이내)"}},
    ...
  }},
  "total": 총점,
  "summary": "종합 평가 요약 (3문장 이내)"
}}

중요:
- 보고서에 근거가 부족한 항목은 "[자료 부족]"으로 표기하고 보수적 점수 부여
- 총점은 각 항목 점수의 합계
- JSON만 출력하세요 (코드블록 없이)
"""


def _truncate_content(content: str) -> str:
    """토큰 초과 방지를 위한 콘텐츠 축소.

    우선순위: 앞부분(요약/결론) > 항목별 평가 > 뒷부분(부록).
    """
    if len(content) <= _MAX_INPUT_CHARS:
        return content

    # 앞 60% + 뒤 30% (중간 부록 등 제거)
    front = content[: int(_MAX_INPUT_CHARS * 0.6)]
    back = content[-int(_MAX_INPUT_CHARS * 0.3) :]
    return front + "\n\n[... 중간 생략 ...]\n\n" + back


def evaluate_reports(
    report_contents: list[str],
    is_deeptech: bool = False,
) -> dict[str, Any]:
    """Claude API를 사용한 보고서 평가 (동기 호출).

    Args:
        report_contents: 보고서 마크다운 내용 목록
        is_deeptech: True면 딥테크 10항목 루브릭 사용

    Returns:
        {
            "items": {"team": {"score": X, "max": Y, "rationale": "..."}, ...},
            "total": float,
            "summary": str,
            "source": "claude_evaluation",
        }

    Raises:
        RuntimeError: API 키 미설정 또는 호출 실패
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    import anthropic

    combined = "\n\n---\n\n".join(
        _truncate_content(c) for c in report_contents
    )
    rubric_prompt = _build_rubric_prompt(is_deeptech)

    client = anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=_TIMEOUT_SECONDS,
    )

    last_error: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": f"{rubric_prompt}\n\n## 보고서 내용\n\n{combined}",
                    }
                ],
            )
            raw_text = response.content[0].text.strip()
            return _parse_evaluation_response(raw_text, is_deeptech)
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Claude API 호출 실패 (시도 %d/%d): %s",
                attempt + 1,
                _MAX_RETRIES + 1,
                exc,
            )

    # 모든 재시도 실패
    raise RuntimeError(
        f"Claude API 평가 실패 ({_MAX_RETRIES + 1}회 시도): {last_error}"
    )


def _parse_evaluation_response(
    raw_text: str, is_deeptech: bool,
) -> dict[str, Any]:
    """Claude 응답 JSON 파싱. 실패 시 부분 결과 반환."""
    # 코드블록 제거
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Claude 응답 JSON 파싱 실패: %s", exc)
        return {
            "items": {},
            "total": None,
            "summary": f"AI 평가 응답 파싱 실패: {exc}",
            "source": "claude_evaluation",
            "parse_error": True,
        }

    items = data.get("items", {})
    total = data.get("total")

    # 총점이 없으면 항목 합산
    if total is None and items:
        total = sum(item.get("score", 0) for item in items.values())

    return {
        "items": items,
        "total": total,
        "summary": data.get("summary", ""),
        "source": "claude_evaluation",
    }

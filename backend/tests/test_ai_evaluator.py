"""ai_evaluator 단위 테스트 — ~9개"""

import json
from unittest.mock import MagicMock, patch

import pytest
from app.services.ai_evaluator import (
    calculate_verdict,
    convert_scores_deeptech_to_general,
    evaluate_reports,
    _parse_evaluation_response,
    _truncate_content,
    _build_rubric_prompt,
)


# --- calculate_verdict ---


def test_verdict_pass():
    assert calculate_verdict(85) == "pass"
    assert calculate_verdict(80) == "pass"
    assert calculate_verdict(100) == "pass"


def test_verdict_conditional():
    assert calculate_verdict(75) == "conditional"
    assert calculate_verdict(70) == "conditional"
    assert calculate_verdict(79) == "conditional"


def test_verdict_hold():
    assert calculate_verdict(60) == "hold"
    assert calculate_verdict(50) == "hold"
    assert calculate_verdict(69) == "hold"


def test_verdict_decline():
    assert calculate_verdict(49) == "decline"
    assert calculate_verdict(0) == "decline"
    assert calculate_verdict(30) == "decline"


# --- convert_scores_deeptech_to_general ---


def test_convert_scores_deeptech():
    dt_scores = {
        "team": {"score": 10, "max": 12, "rationale": "좋은 팀"},
        "market": {"score": 9, "max": 12, "rationale": "시장 큼"},
    }
    result = convert_scores_deeptech_to_general(dt_scores)
    # team: 10/12 → ratio 0.833 * 15 = 12.5
    assert result["team"]["max"] == 15
    assert abs(result["team"]["score"] - 12.5) < 0.2


def test_convert_empty_scores():
    assert convert_scores_deeptech_to_general({}) == {}


# --- _build_rubric_prompt ---


def test_rubric_prompt_general():
    prompt = _build_rubric_prompt(is_deeptech=False)
    assert "8항목" in prompt
    assert "팀 역량" in prompt
    assert "TRL" not in prompt


def test_rubric_prompt_deeptech():
    prompt = _build_rubric_prompt(is_deeptech=True)
    assert "10항목" in prompt
    assert "기술 성숙도(TRL)" in prompt
    assert "IP/특허" in prompt


# --- _truncate_content ---


def test_truncate_short():
    short = "짧은 내용"
    assert _truncate_content(short) == short


def test_truncate_long():
    long_content = "x" * 200_000
    result = _truncate_content(long_content)
    assert len(result) < len(long_content)
    assert "중간 생략" in result


# --- _parse_evaluation_response ---


def test_parse_valid_json():
    raw = json.dumps({
        "items": {
            "team": {"score": 12, "max": 15, "rationale": "좋은 팀"},
        },
        "total": 78,
        "summary": "좋은 기업",
    })
    result = _parse_evaluation_response(raw, is_deeptech=False)
    assert result["total"] == 78
    assert result["items"]["team"]["score"] == 12
    assert result["source"] == "claude_evaluation"


def test_parse_codeblock_json():
    raw = '```json\n{"items": {}, "total": 50, "summary": "보통"}\n```'
    result = _parse_evaluation_response(raw, is_deeptech=False)
    assert result["total"] == 50


def test_parse_invalid_json():
    raw = "이것은 JSON이 아닙니다"
    result = _parse_evaluation_response(raw, is_deeptech=False)
    assert result["parse_error"] is True
    assert "파싱 실패" in result["summary"]


def test_parse_missing_total():
    """total 없으면 items에서 합산"""
    raw = json.dumps({
        "items": {
            "team": {"score": 12, "max": 15, "rationale": ""},
            "market": {"score": 10, "max": 15, "rationale": ""},
        },
        "summary": "부분 결과",
    })
    result = _parse_evaluation_response(raw, is_deeptech=False)
    assert result["total"] == 22


# --- evaluate_reports (Claude API mock) ---


@patch("app.services.ai_evaluator.settings")
def test_evaluate_no_api_key(mock_settings):
    mock_settings.ANTHROPIC_API_KEY = None
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        evaluate_reports(["보고서 내용"], is_deeptech=False)


@patch("app.services.ai_evaluator.settings")
def test_evaluate_success(mock_settings):
    mock_settings.ANTHROPIC_API_KEY = "test-key"

    mock_response = MagicMock()
    mock_response.content = [
        MagicMock(
            text=json.dumps({
                "items": {"team": {"score": 12, "max": 15, "rationale": "good"}},
                "total": 78,
                "summary": "좋은 기업",
            })
        )
    ]

    with patch("app.services.ai_evaluator.anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.Anthropic.return_value = mock_client

        result = evaluate_reports(["보고서"], is_deeptech=False)
        assert result["total"] == 78
        assert result["source"] == "claude_evaluation"


@patch("app.services.ai_evaluator.settings")
def test_evaluate_retry_on_failure(mock_settings):
    mock_settings.ANTHROPIC_API_KEY = "test-key"

    with patch("app.services.ai_evaluator.anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API Error")
        mock_anthropic.Anthropic.return_value = mock_client

        with pytest.raises(RuntimeError, match="평가 실패"):
            evaluate_reports(["보고서"], is_deeptech=False)

        # 2회 호출 (1 + 1 retry)
        assert mock_client.messages.create.call_count == 2

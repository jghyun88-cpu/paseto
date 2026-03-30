"""ai_report_parser 단위 테스트 — ~15개"""

import pytest
from app.services.ai_report_parser import (
    detect_report_type,
    is_deeptech,
    has_structured_scores,
    extract_all_scores,
    parse_frontmatter,
    parse_screening_report,
)

# --- frontmatter 파싱 ---


def test_parse_frontmatter_valid():
    content = "---\n보고서유형: 스크리닝\n기업명: 테스트\n---\n본문"
    fm = parse_frontmatter(content)
    assert fm["보고서유형"] == "스크리닝"
    assert fm["기업명"] == "테스트"


def test_parse_frontmatter_missing():
    content = "# 보고서\n본문만 있음"
    fm = parse_frontmatter(content)
    assert fm == {}


def test_parse_frontmatter_malformed():
    content = "---\n잘못된형식\n---\n본문"
    fm = parse_frontmatter(content)
    assert isinstance(fm, dict)


# --- detect_report_type ---


def test_detect_report_type_from_frontmatter():
    content = "---\n보고서유형: 스크리닝\n---\n내용"
    assert detect_report_type(content, "report.md") == "screening"


def test_detect_report_type_from_filename():
    assert detect_report_type("그냥 내용", "screening_report_2026.md") == "screening"
    assert detect_report_type("내용", "ir_analysis_테스트.md") == "ir_analysis"
    assert detect_report_type("내용", "risk_alert_급함.md") == "risk_alert"


def test_detect_report_type_from_content():
    content = "# 스크리닝 보고서\n## 기업 분석"
    assert detect_report_type(content, "report.md") == "screening"

    content2 = "# 시장 분석 리포트\n## TAM/SAM"
    assert detect_report_type(content2, "doc.md") == "market_scan"


def test_detect_report_type_unknown():
    assert detect_report_type("아무 내용", "document.md") == "unknown"


def test_detect_report_type_all_six():
    types = {
        "---\n보고서유형: 스크리닝\n---\n내용": "screening",
        "---\n보고서유형: IR분석\n---\n내용": "ir_analysis",
        "---\n보고서유형: 리스크경보\n---\n내용": "risk_alert",
        "---\n보고서유형: 시장분석\n---\n내용": "market_scan",
        "---\n보고서유형: 투자검토서\n---\n내용": "investment_memo",
        "---\n보고서유형: 포트폴리오보고서\n---\n내용": "portfolio_report",
    }
    for content, expected in types.items():
        assert detect_report_type(content) == expected


# --- is_deeptech ---


def test_is_deeptech_heading():
    content = "## 투자 적격성 평가 (딥테크 10축)\n점수..."
    assert is_deeptech(content) is True


def test_is_deeptech_trl_heading():
    content = "### 기술 성숙도(TRL) 평가\nTRL 4..."
    assert is_deeptech(content) is True


def test_is_deeptech_frontmatter():
    content = "---\n분류: 딥테크\n---\n일반 내용"
    assert is_deeptech(content) is True


def test_is_deeptech_false():
    content = "# 일반 스크리닝 보고서\n팀 역량..."
    assert is_deeptech(content) is False


def test_is_deeptech_ip_plus_trl():
    content = "IP/특허 현황: 등록 2건\nTRL 단계: 5"
    assert is_deeptech(content) is True


# --- has_structured_scores ---


def test_has_structured_scores_true():
    content = """
총점 | **78 / 100점**
### 팀 역량 (만점: 15점) → **12점**
### 시장 규모 (만점: 15점) → **10점**
### 트랙션 (만점: 15점) → **11점**
### 비즈니스 모델 (만점: 15점) → **9점**
"""
    assert has_structured_scores(content) is True


def test_has_structured_scores_false():
    content = "# 보고서\n정성적 분석만 있음\n좋은 팀임"
    assert has_structured_scores(content) is False


# --- extract_all_scores ---


def test_extract_all_scores_general():
    content = """
총점 | **78 / 100점**
판정 | 조건부 통과
### 팀 역량 (만점: 15점) → **12점**
### 시장 규모 (만점: 15점) → **10점**
### 트랙션 (만점: 15점) → **11점**
### 비즈니스 모델 (만점: 15점) → **9점**
### 문제 정의 명확성 (만점: 10점) → **8점**
### 솔루션 차별화 (만점: 10점) → **7점**
### 실행력 (만점: 10점) → **8점**
### AC 적합성 (만점: 10점) → **7점**
"""
    result = extract_all_scores(content, deeptech=False)
    assert result["total"] == 78.0
    assert result["decision"] == "조건부 통과"
    assert result["is_deeptech"] is False
    assert "team" in result["items"]
    assert result["items"]["team"]["score"] == 12.0
    assert result["items"]["team"]["max"] == 15


def test_extract_all_scores_deeptech():
    content = """
# 딥테크 10축 평가
총점 | **85 / 100점**
판정 | 통과
기술 성숙도(TRL): 10/12
IP/특허: 8/10
팀 역량: 10/12
시장 규모: 9/12
"""
    result = extract_all_scores(content, deeptech=True)
    assert result["is_deeptech"] is True
    assert "trl" in result["items"]
    assert "ip_patent" in result["items"]
    assert result["items"]["trl"]["score"] == 10.0


def test_extract_all_scores_auto_detect():
    content = """
## 투자 적격성 평가 (딥테크 10축)
총점 | **90 / 100점**
기술 성숙도(TRL): 11/12
"""
    result = extract_all_scores(content)  # deeptech=None → 자동
    assert result["is_deeptech"] is True


def test_extract_all_scores_sum_fallback():
    """총점이 없으면 항목 합산"""
    content = """
팀 역량: 12/15
시장 규모: 10/15
트랙션: 11/15
"""
    result = extract_all_scores(content, deeptech=False)
    assert result["total"] == 33.0  # 12 + 10 + 11

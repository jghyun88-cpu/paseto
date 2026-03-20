"""
LSA 보고서 마크다운에서 구조화된 데이터 추출

지원 보고서 유형:
- 스크리닝 보고서: 8개 항목별 점수 + 총점 + 판정
- IR 분석: 투자매력도, SWOT, 핵심질문
- 리스크 경보: 경보 수준, 리스크 매트릭스
"""

import re
from pathlib import Path
from typing import Optional


def parse_screening_report(content: str) -> dict:
    """스크리닝 보고서에서 점수 및 주요 데이터 추출"""
    result: dict = {
        "total_score": None,
        "decision": None,
        "company_name": None,
        "scores": {},
        "strengths": [],
        "concerns": [],
        "follow_ups": [],
    }

    # 총점 추출: "**총점** | **71.5 / 100점**" 또는 "총점: XX/100"
    total_match = re.search(r'총점[*\s|]*[*]*\s*(\d+\.?\d*)\s*/?\s*100', content)
    if total_match:
        result["total_score"] = float(total_match.group(1))

    # 판정 추출
    decision_match = re.search(r'판정[*\s|]*[*]*\s*(통과|조건부\s*통과|보류|탈락)', content)
    if decision_match:
        result["decision"] = decision_match.group(1).strip()

    # 기업명 추출
    name_match = re.search(r'기업명\s*\|\s*(.+)', content)
    if name_match:
        result["company_name"] = name_match.group(1).strip().rstrip('|').strip()

    # 항목별 점수 추출
    # 패턴: "### 4-1. 팀 역량 (만점: 20점) → **14점**" 또는 "팀 역량: X/15"
    score_patterns = [
        (r'팀\s*역량\s*\(만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "team"),
        (r'시장\s*규모[^\n]*만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "market"),
        (r'트랙션\s*\(만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "traction"),
        (r'비즈니스\s*모델\s*\(만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "biz_model"),
        (r'문제\s*정의[^\n]*만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "problem"),
        (r'솔루션\s*차별화[^\n]*만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "solution"),
        (r'실행력[^\n]*만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "execution"),
        (r'(?:AC|액셀러레이터)\s*적합성[^\n]*만점:\s*(\d+)점\)\s*→\s*\*{0,2}(\d+\.?\d*)점?\*{0,2}', "ac_fit"),
    ]

    for pattern, key in score_patterns:
        match = re.search(pattern, content)
        if match:
            max_score = float(match.group(1))
            score = float(match.group(2))
            result["scores"][key] = {"score": score, "max": max_score}

    # 간이 점수 패턴 (보고서 마다 형식 다를 수 있음)
    # "- 팀 역량: X/15 - [근거]"
    simple_patterns = [
        (r'팀\s*역량:\s*(\d+\.?\d*)/(\d+)', "team"),
        (r'시장\s*규모:\s*(\d+\.?\d*)/(\d+)', "market"),
        (r'트랙션:\s*(\d+\.?\d*)/(\d+)', "traction"),
        (r'비즈니스\s*모델:\s*(\d+\.?\d*)/(\d+)', "biz_model"),
        (r'문제\s*정의:\s*(\d+\.?\d*)/(\d+)', "problem"),
        (r'솔루션\s*차별화:\s*(\d+\.?\d*)/(\d+)', "solution"),
        (r'실행력:\s*(\d+\.?\d*)/(\d+)', "execution"),
        (r'AC\s*적합성:\s*(\d+\.?\d*)/(\d+)', "ac_fit"),
    ]

    for pattern, key in simple_patterns:
        if key not in result["scores"]:
            match = re.search(pattern, content)
            if match:
                result["scores"][key] = {
                    "score": float(match.group(1)),
                    "max": float(match.group(2)),
                }

    # 강점/우려사항 추출 (번호 목록)
    strengths_section = re.search(r'핵심\s*강점[^\n]*\n((?:\d+\..+\n?)+)', content)
    if strengths_section:
        result["strengths"] = [
            line.strip().lstrip("0123456789.").strip()
            for line in strengths_section.group(1).strip().split("\n")
            if line.strip()
        ]

    concerns_section = re.search(r'(?:주요\s*)?우려사항[^\n]*\n((?:\d+\..+\n?)+)', content)
    if concerns_section:
        result["concerns"] = [
            line.strip().lstrip("0123456789.").strip()
            for line in concerns_section.group(1).strip().split("\n")
            if line.strip()
        ]

    return result


def parse_ir_analysis(content: str) -> dict:
    """IR 분석 보고서에서 주요 데이터 추출"""
    result: dict = {
        "investment_attractiveness": None,
        "swot": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
        "key_questions": [],
    }

    # 투자매력도 추출: "투자 매력도: X/5" 또는 "투자 매력도 | **4/5**"
    attr_match = re.search(r'투자\s*매력도[^0-9]*(\d)', content)
    if attr_match:
        result["investment_attractiveness"] = int(attr_match.group(1))

    # SWOT 섹션 추출
    swot_section = re.search(r'SWOT\s*분석(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if swot_section:
        swot_text = swot_section.group(1)
        for label, key in [("강점", "strengths"), ("약점", "weaknesses"),
                           ("기회", "opportunities"), ("위협", "threats")]:
            items = re.findall(rf'{label}[^|]*\|\s*(.+?)(?:\s*\||\n)', swot_text)
            if items:
                result["swot"][key] = [item.strip() for item in items if item.strip()]

    # 핵심 질문 추출
    questions_section = re.search(r'핵심\s*질문[^\n]*\n((?:\d+\..+\n?)+)', content)
    if questions_section:
        result["key_questions"] = [
            line.strip().lstrip("0123456789.").strip()
            for line in questions_section.group(1).strip().split("\n")
            if line.strip() and re.match(r'\d+\.', line.strip())
        ]

    return result


def parse_risk_alert(content: str) -> dict:
    """리스크 경보 보고서에서 주요 데이터 추출"""
    result: dict = {
        "alert_level": None,
        "companies": [],
    }

    # 경보 수준
    if re.search(r'🔴|긴급', content):
        result["alert_level"] = "critical"
    elif re.search(r'🟡|주의', content):
        result["alert_level"] = "warning"
    elif re.search(r'🟢|양호', content):
        result["alert_level"] = "normal"

    # 기업별 경보 추출
    company_alerts = re.findall(
        r'(?:##|###)\s*(?:\d+\.\s*)?(.+?)\s*(?:🔴|🟡|🟢|긴급|주의|양호)',
        content,
    )
    result["companies"] = [name.strip().rstrip('#').strip() for name in company_alerts]

    return result


def parse_frontmatter(content: str) -> dict:
    """마크다운 프론트매터(YAML) 파싱"""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return {}
    frontmatter: dict = {}
    for line in match.group(1).split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            frontmatter[key.strip()] = value.strip()
    return frontmatter


_ALLOWED_REPORT_DIRS = ("ai-agent/reports", "ai-agent\\reports")


def parse_report_file(filepath: str) -> dict:
    """파일 경로에서 보고서 유형을 자동 감지하고 파싱.

    경로 검증: ai-agent/reports/ 하위 파일만 허용.
    """
    path = Path(filepath).resolve()
    if not any(part in str(path) for part in _ALLOWED_REPORT_DIRS):
        raise ValueError(f"허용되지 않는 경로입니다: {filepath}")
    content = path.read_text(encoding="utf-8")
    frontmatter = parse_frontmatter(content)

    report_type = "unknown"
    if "screening" in path.name or "스크리닝" in path.name:
        report_type = "screening"
    elif "ir_analysis" in path.name or "IR" in content[:200]:
        report_type = "ir_analysis"
    elif "risk" in path.name or "리스크" in path.name:
        report_type = "risk_alert"

    parsed: dict = {"type": report_type, "frontmatter": frontmatter, "file": str(path)}

    if report_type == "screening":
        parsed["data"] = parse_screening_report(content)
    elif report_type == "ir_analysis":
        parsed["data"] = parse_ir_analysis(content)
    elif report_type == "risk_alert":
        parsed["data"] = parse_risk_alert(content)
    else:
        parsed["data"] = {}

    return parsed

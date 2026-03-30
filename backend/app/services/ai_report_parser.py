"""
LSA 보고서 마크다운에서 구조화된 데이터 추출

지원 보고서 유형 (6종):
- screening: 스크리닝 보고서 (8항목 / 딥테크 10항목)
- ir_analysis: IR 분석 (투자매력도, SWOT, 핵심질문)
- risk_alert: 리스크 경보 (경보 수준, 리스크 매트릭스)
- market_scan: 시장 분석
- investment_memo: 투자 검토서
- portfolio_report: 포트폴리오 보고서
"""

import re
from pathlib import Path
from typing import Any


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


# --- 6종 보고서 유형 감지 ---

# frontmatter '보고서유형' 필드 → 내부 타입 매핑
_REPORT_TYPE_MAP: dict[str, str] = {
    "스크리닝": "screening",
    "screening": "screening",
    "IR분석": "ir_analysis",
    "ir_analysis": "ir_analysis",
    "ir분석": "ir_analysis",
    "리스크경보": "risk_alert",
    "risk_alert": "risk_alert",
    "시장분석": "market_scan",
    "market_scan": "market_scan",
    "투자검토서": "investment_memo",
    "investment_memo": "investment_memo",
    "포트폴리오보고서": "portfolio_report",
    "portfolio_report": "portfolio_report",
}

# 파일명 기반 fallback 패턴 (정규식)
_FILENAME_PATTERNS: list[tuple[str, str]] = [
    (r"screening|스크리닝", "screening"),
    (r"ir[_-]?analysis|IR[_\s]?분석|심층분석", "ir_analysis"),
    (r"risk[_-]?alert|리스크|위험", "risk_alert"),
    (r"market[_-]?scan|시장[_\s]?분석", "market_scan"),
    (r"investment[_-]?memo|투자[_\s]?검토", "investment_memo"),
    (r"portfolio[_-]?report|포트폴리오", "portfolio_report"),
]

# 일반 8항목 (만점 합계 100)
GENERAL_ITEMS = [
    ("team", "팀 역량", 15),
    ("market", "시장 규모", 15),
    ("traction", "트랙션", 15),
    ("biz_model", "비즈니스 모델", 15),
    ("problem", "문제 정의", 10),
    ("solution", "솔루션 차별화", 10),
    ("execution", "실행력", 10),
    ("ac_fit", "AC 적합성", 10),
]

# 딥테크 10항목 (만점 합계 100)
DEEPTECH_ITEMS = [
    ("team", "팀 역량", 12),
    ("market", "시장 규모", 12),
    ("traction", "트랙션", 10),
    ("biz_model", "비즈니스 모델", 10),
    ("problem", "문제 정의", 8),
    ("solution", "솔루션 차별화", 10),
    ("execution", "실행력", 8),
    ("ac_fit", "AC 적합성", 8),
    ("trl", "기술 성숙도(TRL)", 12),
    ("ip_patent", "IP/특허", 10),
]


def detect_report_type(content: str, filename: str = "") -> str:
    """보고서 유형 감지: frontmatter → 파일명 → 본문 내용 순서로 판별.

    Returns:
        6종 중 하나 또는 "unknown"
    """
    # 1순위: frontmatter '보고서유형' 필드
    fm = parse_frontmatter(content)
    fm_type = fm.get("보고서유형", "").strip()
    if fm_type and fm_type in _REPORT_TYPE_MAP:
        return _REPORT_TYPE_MAP[fm_type]

    # 2순위: 파일명 패턴 매칭
    fname_lower = filename.lower()
    for pattern, rtype in _FILENAME_PATTERNS:
        if re.search(pattern, fname_lower, re.IGNORECASE):
            return rtype

    # 3순위: 본문 내용 헤딩 기반
    first_2k = content[:2000]
    if re.search(r"스크리닝\s*(보고서|평가|결과)", first_2k):
        return "screening"
    if re.search(r"IR\s*분석|투자\s*매력도|심층\s*분석", first_2k):
        return "ir_analysis"
    if re.search(r"리스크\s*(경보|분석|스캔)", first_2k):
        return "risk_alert"
    if re.search(r"시장\s*(분석|조사|리서치)", first_2k):
        return "market_scan"
    if re.search(r"투자\s*(검토|메모|심사)", first_2k):
        return "investment_memo"
    if re.search(r"포트폴리오\s*(보고|현황|리포트)", first_2k):
        return "portfolio_report"

    return "unknown"


def is_deeptech(content: str) -> bool:
    """딥테크 보고서 여부 판별.

    1순위: '투자 적격성 평가 (딥테크 10축)' 또는 유사 헤딩 감지
    2순위: frontmatter '분류' 또는 '유형' 필드
    3순위: 딥테크 전용 항목(TRL, IP/특허) 존재 여부
    """
    # 1순위: 헤딩 기반
    if re.search(r"딥테크\s*(?:10축|10항목|평가)", content):
        return True
    if re.search(r"기술\s*성숙도\s*\(?\s*TRL\s*\)?", content):
        # TRL 헤딩이 있으면 딥테크
        return True

    # 2순위: frontmatter
    fm = parse_frontmatter(content)
    classification = fm.get("분류", fm.get("유형", "")).strip().lower()
    if "딥테크" in classification or "deeptech" in classification:
        return True

    # 3순위: 딥테크 전용 항목 존재
    if re.search(r"IP\s*/?\s*특허|지식재산|특허\s*포트폴리오", content):
        if re.search(r"TRL|기술\s*성숙도", content):
            return True

    return False


def has_structured_scores(content: str) -> bool:
    """보고서에 구조화된 점수가 존재하는지 판별.

    lsa 보고서 대부분은 이미 항목별 점수를 포함하므로
    이 경우 Claude API 없이 직접 파싱으로 결과를 반환할 수 있다.
    """
    # 총점 패턴 존재 여부
    has_total = bool(re.search(r"총점[*\s|]*[*]*\s*\d+\.?\d*\s*/?\s*100", content))

    # 최소 3개 이상 항목별 점수가 있는지
    score_count = 0
    all_items = GENERAL_ITEMS + DEEPTECH_ITEMS[8:]  # 8항목 + TRL, IP
    for _, label, _ in all_items:
        # "항목명 ... X/Y" 또는 "항목명 (만점: Y점) → X점" 패턴
        pattern = rf"{re.escape(label)}[^\n]*\d+\.?\d*\s*/?\s*\d+"
        if re.search(pattern, content):
            score_count += 1

    return has_total and score_count >= 3


def extract_all_scores(
    content: str, deeptech: bool | None = None,
) -> dict[str, Any]:
    """보고서에서 전체 점수를 직접 파싱.

    Args:
        content: 마크다운 본문
        deeptech: True면 딥테크 10항목, False면 일반 8항목,
                  None이면 자동 감지

    Returns:
        {
            "items": {"team": {"score": 14, "max": 15, "rationale": "..."}, ...},
            "total": 78.5,
            "is_deeptech": bool,
            "decision": "통과" | "조건부 통과" | "보류" | "탈락" | None,
        }
    """
    if deeptech is None:
        deeptech = is_deeptech(content)

    items_def = DEEPTECH_ITEMS if deeptech else GENERAL_ITEMS
    result: dict[str, Any] = {
        "items": {},
        "total": None,
        "is_deeptech": deeptech,
        "decision": None,
    }

    for key, label, max_score in items_def:
        score_val = _extract_item_score(content, label, key, max_score)
        if score_val is not None:
            rationale = _extract_item_rationale(content, label)
            result["items"][key] = {
                "score": score_val,
                "max": max_score,
                "rationale": rationale or "",
            }

    # 총점
    total_match = re.search(r"총점[*\s|]*[*]*\s*(\d+\.?\d*)\s*/?\s*100", content)
    if total_match:
        result["total"] = float(total_match.group(1))
    elif result["items"]:
        # 항목 합산으로 총점 계산
        result["total"] = sum(
            item["score"] for item in result["items"].values()
        )

    # 판정
    decision_match = re.search(
        r"판정[*\s|]*[*]*\s*(통과|조건부\s*통과|보류|탈락)", content
    )
    if decision_match:
        result["decision"] = decision_match.group(1).strip()

    return result


def _extract_item_score(
    content: str, label: str, key: str, max_score: int,
) -> float | None:
    """단일 항목의 점수 추출. 여러 패턴을 시도."""
    escaped = re.escape(label)

    # 패턴1: "### X. 항목명 (만점: Y점) → **Z점**"
    m = re.search(
        rf"{escaped}\s*\(만점:\s*(\d+)점\)\s*→\s*\*{{0,2}}(\d+\.?\d*)점?\*{{0,2}}",
        content,
    )
    if m:
        return float(m.group(2))

    # 패턴2: "항목명: X/Y" 또는 "항목명: X / Y점"
    m = re.search(
        rf"{escaped}\s*:\s*(\d+\.?\d*)\s*/\s*(\d+)", content
    )
    if m:
        return float(m.group(1))

    # 패턴3: 테이블 행 "| 항목명 | X | Y | ..." 에서 추출
    m = re.search(
        rf"\|\s*{escaped}\s*\|\s*(\d+\.?\d*)\s*\|", content
    )
    if m:
        return float(m.group(1))

    # 패턴4: "항목명 ... **X점**" (만점 정보 없이 점수만)
    m = re.search(
        rf"{escaped}[^\n]*\*{{2}}(\d+\.?\d*)점?\*{{2}}", content
    )
    if m:
        return float(m.group(1))

    return None


def _extract_item_rationale(content: str, label: str) -> str:
    """항목별 근거(rationale) 추출. 점수 바로 뒤의 텍스트."""
    escaped = re.escape(label)

    # 점수 줄 다음에 오는 근거 텍스트 (최대 200자)
    m = re.search(
        rf"{escaped}[^\n]*\n+((?:[-•]\s*.+\n?)+)",
        content,
    )
    if m:
        lines = m.group(1).strip().split("\n")
        # 최대 3줄
        rationale_lines = [
            line.strip().lstrip("-•").strip() for line in lines[:3]
        ]
        return "; ".join(rationale_lines)

    # 테이블 셀에서 근거 추출
    m = re.search(
        rf"\|\s*{escaped}\s*\|[^|]*\|[^|]*\|\s*(.+?)\s*\|",
        content,
    )
    if m:
        return m.group(1).strip()[:200]

    return ""


# --- 기존 파일 경로 파싱 (유지) ---

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

    report_type = detect_report_type(content, path.name)

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

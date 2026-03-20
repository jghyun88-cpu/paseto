"""
eLSA API 응답 → LSA 에이전트용 마크다운 변환

eLSA 구조화 데이터를 LSA 에이전트가 분석에 사용할 수 있는
마크다운 형식으로 변환합니다.
"""

from datetime import datetime
from typing import Optional


def startup_to_markdown(startup: dict) -> str:
    """eLSA 스타트업 → 지원서 형식 마크다운"""
    company = startup.get("company") or {}
    lines = [
        f"# {startup.get('name', '(이름 없음)')} - eLSA 기업 정보",
        "",
        "## 기업 개요",
        "",
        "| 항목 | 내용 |",
        "|------|------|",
        f"| 기업명 | {startup.get('name', '[미확인]')} |",
        f"| 대표자 | {startup.get('ceo_name', '[미확인]')} |",
        f"| 설립일 | {startup.get('founded_date', '[미확인]')} |",
        f"| 사업 분야 | {startup.get('sector', '[미확인]')} |",
        f"| 단계 | {startup.get('stage', '[미확인]')} |",
        f"| 상태 | {startup.get('status', '[미확인]')} |",
        f"| 팀 규모 | {startup.get('employee_count', '[미확인]')} |",
        f"| 소재지 | {startup.get('address', '[미확인]')} |",
        f"| 웹사이트 | {startup.get('website', '[미확인]')} |",
        f"| 소싱일 | {startup.get('sourcing_date', '[미확인]')} |",
        "",
    ]

    if startup.get("one_liner"):
        lines.extend(["## 한줄 소개", "", startup["one_liner"], ""])

    if startup.get("description"):
        lines.extend(["## 사업 설명", "", startup["description"], ""])

    # 재무 데이터
    financial_fields = [
        ("total_assets", "총자산"),
        ("capital", "자본금"),
        ("revenue", "매출액"),
        ("operating_profit", "영업이익"),
    ]
    has_financial = any(startup.get(f) for f, _ in financial_fields)
    if has_financial:
        lines.extend(["## 재무 데이터", "", "| 항목 | 금액 |", "|------|------|"])
        for field, label in financial_fields:
            val = startup.get(field)
            if val is not None:
                lines.append(f"| {label} | {val:,.0f}원 |" if isinstance(val, (int, float)) else f"| {label} | {val} |")
        lines.append("")

    lines.extend([
        "---",
        f"_출처: eLSA 운영플랫폼 (ID: {startup.get('id', 'N/A')})_",
        f"_조회일: {datetime.now().strftime('%Y-%m-%d')}_",
    ])

    return "\n".join(lines)


def screening_to_markdown(screening: dict) -> str:
    """eLSA 심사 → 심사 결과 마크다운"""
    lines = [
        f"# eLSA 심사 결과 - {screening.get('startup_name', '(이름 없음)')}",
        "",
        "| 항목 | 내용 |",
        "|------|------|",
        f"| 심사 라운드 | {screening.get('round', '[미확인]')}차 |",
        f"| 상태 | {screening.get('status', '[미확인]')} |",
        f"| 총점 | {screening.get('total_score', '[미채점]')} |",
        f"| 결과 | {screening.get('result', '[미결정]')} |",
        f"| 마감일 | {screening.get('deadline', '[미설정]')} |",
        "",
    ]

    # 체크리스트 항목
    checklist = screening.get("checklist_items", [])
    if checklist:
        lines.extend([
            "## 평가 체크리스트",
            "",
            "| 항목 | 가중치 |",
            "|------|--------|",
        ])
        for item in checklist:
            lines.append(f"| {item.get('question', '')} | {item.get('weight_pct', '')}% |")
        lines.append("")

    # 채점 데이터
    scores = screening.get("scores", [])
    if scores:
        lines.extend([
            "## 채점 데이터",
            "",
            "| 항목 | 점수 | 코멘트 |",
            "|------|------|--------|",
        ])
        for s in scores:
            lines.append(
                f"| {s.get('checklist_item_id', '')} | {s.get('score', '')} | {s.get('comment', '') or ''} |"
            )
        lines.append("")

    # 심사위원
    reviewers = screening.get("reviewers", [])
    if reviewers:
        lines.extend(["## 심사위원", ""])
        for r in reviewers:
            lines.append(f"- {r.get('name', '이름 없음')} ({r.get('email', '')})")
        lines.append("")

    if screening.get("decision_note"):
        lines.extend(["## 심사 의견", "", screening["decision_note"], ""])

    lines.extend([
        "---",
        f"_출처: eLSA 운영플랫폼 (ID: {screening.get('id', 'N/A')})_",
    ])

    return "\n".join(lines)


def kpis_to_markdown(kpis: list, company_name: str = "") -> str:
    """eLSA KPI 데이터 → 월간 KPI 보고서 마크다운"""
    lines = [
        f"# {company_name} KPI 현황 (eLSA 데이터)",
        "",
    ]

    for kpi in kpis:
        metric = kpi.get("metric_name", "지표")
        unit = kpi.get("unit", "")
        submissions = kpi.get("submissions", [])

        lines.extend([f"## {metric} ({unit})", ""])

        if submissions:
            lines.extend(["| 연도 | 월 | 값 |", "|------|-----|------|"])
            for s in submissions:
                month = s.get("month") or s.get("quarter", "")
                lines.append(f"| {s.get('year', '')} | {month} | {s.get('value', '')} |")
        else:
            lines.append("_제출된 데이터 없음_")

        lines.append("")

    lines.extend([
        "---",
        f"_출처: eLSA 운영플랫폼_",
        f"_조회일: {datetime.now().strftime('%Y-%m-%d')}_",
    ])

    return "\n".join(lines)


def deal_to_markdown(deal: dict) -> str:
    """eLSA 딜 정보 → IR 자료 보충 마크다운"""
    lines = [
        f"# {deal.get('deal_name', '(딜 이름 없음)')} - eLSA 딜 정보",
        "",
        "## 투자 조건",
        "",
        "| 항목 | 내용 |",
        "|------|------|",
        f"| 딜 단계 | {deal.get('stage', '[미확인]')} |",
        f"| 투자금액 | {_format_amount(deal.get('investment_amount'))} |",
        f"| 지분율 | {_format_pct(deal.get('equity_stake'))} |",
        f"| 밸류에이션 | {_format_amount(deal.get('valuation'))} |",
        f"| 투자유형 | {deal.get('investment_type', '[미확인]')} |",
        "",
    ]

    # DD 태스크
    tasks = deal.get("dd_tasks", [])
    if tasks:
        lines.extend([
            "## DD 태스크 현황",
            "",
            "| 태스크 | 카테고리 | 상태 | 담당자 |",
            "|--------|----------|------|--------|",
        ])
        for t in tasks:
            lines.append(
                f"| {t.get('title', '')} | {t.get('category', '')} | {t.get('status', '')} | {t.get('assignee_id', '미배정')[:8] if t.get('assignee_id') else '미배정'} |"
            )
        lines.append("")

    # IC 안건
    agendas = deal.get("ic_agendas", [])
    if agendas:
        lines.extend(["## 투심위 안건", ""])
        for a in agendas:
            lines.extend([
                f"### {a.get('agenda_date', '')}",
                f"- 상태: {a.get('status', '')}",
                f"- 찬성: {a.get('approve_count', 0)} / 반대: {a.get('reject_count', 0)} / 기권: {a.get('abstain_count', 0)}",
                "",
            ])

    lines.extend([
        "---",
        f"_출처: eLSA 운영플랫폼 (ID: {deal.get('id', 'N/A')})_",
    ])

    return "\n".join(lines)


def _format_amount(value: Optional[float]) -> str:
    if value is None:
        return "[미확인]"
    if value >= 1_0000_0000:
        return f"{value / 1_0000_0000:.1f}억원"
    if value >= 10000:
        return f"{value / 10000:.0f}만원"
    return f"{value:,.0f}원"


def _format_pct(value: Optional[float]) -> str:
    if value is None:
        return "[미확인]"
    return f"{value:.1f}%"

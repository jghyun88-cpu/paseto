"""웹 리서치 서비스 — Tavily API를 사용한 심층 시장 조사 및 기업 검증

AI 분석 유형별 특화 쿼리를 실행하여 시장 규모, 경쟁 환경, 특허/기술,
재무 현황, 최신 동향을 외부 데이터로 교차 검증.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

MAX_RESEARCH_CHARS = 15000
MAX_SNIPPET_CHARS = 500
MAX_RESULTS_PER_QUERY = 5


# ── 분석 유형별 특화 쿼리 ──────────────────────────────────────

def _screening_queries(company: str, industry: str) -> list[tuple[str, str]]:
    """AI 스크리닝용 — 기업 기본 검증 + 시장 적합성"""
    return [
        ("기업 정보 및 뉴스", f'"{company}" 기업 투자 뉴스 설립 대표'),
        ("산업 시장 규모", f"{industry} 시장 규모 전망 2025 2026 성장률"),
        ("경쟁 현황", f"{industry} 주요 기업 경쟁 스타트업 점유율"),
        ("기술 동향", f"{industry} 기술 트렌드 핵심 기술 2025 2026"),
        ("특허 및 논문", f'"{company}" 특허 출원 논문 기술 연구'),
        ("팀/인력 정보", f'"{company}" 대표 경력 팀 구성 인력'),
        ("정부 정책", f"{industry} 정부 정책 R&D 지원 프로그램 2025"),
        ("투자 이력", f'"{company}" 투자 유치 라운드 VC 엔젤'),
    ]


def _ir_analysis_queries(company: str, industry: str) -> list[tuple[str, str]]:
    """IR 심층분석용 — 재무/기술/시장 심층 검증"""
    return [
        ("기업 재무 현황", f'"{company}" 매출 영업이익 재무제표 성장'),
        ("비즈니스 모델 분석", f'"{company}" 비즈니스 모델 수익 구조 고객'),
        ("시장 규모 및 TAM", f"{industry} 시장 규모 TAM SAM SOM 전망"),
        ("시장 성장 동인", f"{industry} 성장 동인 촉진 요인 시장 트렌드"),
        ("경쟁사 상세 비교", f"{industry} 경쟁사 비교 차별화 포지셔닝 스타트업"),
        ("특허 포트폴리오", f'"{company}" 특허 기술 IP 등록 출원 건수'),
        ("핵심 기술 분석", f"{industry} 핵심 기술 원천 기술 기술 성숙도"),
        ("규제 및 인허가", f"{industry} 규제 인허가 법규 컴플라이언스"),
        ("글로벌 시장 동향", f"{industry} global market trend overseas competitor"),
        ("EXIT 사례", f"{industry} 스타트업 EXIT IPO M&A 사례 투자 회수"),
    ]


def _risk_queries(company: str, industry: str) -> list[tuple[str, str]]:
    """리스크 스캔용 — 잠재 리스크 요인 탐지"""
    return [
        ("기업 리스크 뉴스", f'"{company}" 소송 분쟁 리스크 문제 이슈'),
        ("산업 리스크", f"{industry} 리스크 위험 요인 규제 변화"),
        ("기술 리스크", f"{industry} 기술 실패 사례 기술 리스크 대체 기술"),
        ("시장 리스크", f"{industry} 시장 축소 경기 침체 수요 감소"),
        ("경쟁 리스크", f"{industry} 대기업 진입 경쟁 심화 점유율 변화"),
        ("재무 리스크", f'"{company}" 자금 부족 burn rate 재무 위기'),
        ("규제 리스크", f"{industry} 규제 강화 법률 변경 2025 2026"),
        ("인력 리스크", f"{industry} 인력 수급 핵심 인력 이탈 채용 난이도"),
    ]


def _market_scan_queries(company: str, industry: str) -> list[tuple[str, str]]:
    """시장 분석용 — 포괄적 시장 환경 조사"""
    return [
        ("시장 규모 및 전망", f"{industry} 시장 규모 전망 성장률 2025 2026 2030"),
        ("시장 세분화", f"{industry} 시장 세분화 segment 응용 분야"),
        ("주요 플레이어", f"{industry} 주요 기업 시장 점유율 리더 순위"),
        ("스타트업 생태계", f"{industry} 스타트업 투자 동향 유니콘 VC"),
        ("기술 로드맵", f"{industry} 기술 로드맵 차세대 기술 발전 방향"),
        ("글로벌 경쟁", f"{industry} global market share competitor landscape"),
        ("수요 기업 동향", f"{industry} 수요 기업 대기업 도입 사례 PoC"),
        ("정부 정책", f"{industry} 정부 정책 R&D 지원 예산 국가 전략"),
        ("특허 동향", f"{industry} 특허 출원 동향 핵심 특허 분석 2024 2025"),
        ("투자 동향", f"{industry} 투자 동향 VC 펀딩 딜 사이즈 2024 2025"),
    ]


# 유형 → 쿼리 생성 함수 매핑
_QUERY_BUILDERS: dict[str, Any] = {
    "screening": _screening_queries,
    "ir_analysis": _ir_analysis_queries,
    "risk_alert": _risk_queries,
    "market_scan": _market_scan_queries,
}


# ── 메인 함수 ──────────────────────────────────────────────

def research_market(
    company_name: str,
    industry: str | None = None,
    analysis_type: str = "screening",
) -> str:
    """스타트업의 시장 환경을 분석 유형에 맞춰 웹 검색으로 심층 조사한다.

    분석 유형별 특화 쿼리를 실행하여 시장, 기술, 경쟁, 재무, 특허 등을 조사.
    TAVILY_API_KEY 미설정 시 빈 문자열 반환 (graceful degradation).
    """
    if not settings.TAVILY_API_KEY:
        logger.info("TAVILY_API_KEY 미설정 — 웹 리서치 건너뜀")
        return ""

    industry_term = industry or "딥테크"
    builder = _QUERY_BUILDERS.get(analysis_type, _screening_queries)
    query_pairs = builder(company_name, industry_term)

    sections: list[str] = []

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=settings.TAVILY_API_KEY)

        for title, query in query_pairs:
            try:
                result = client.search(
                    query=query,
                    search_depth="advanced",
                    max_results=MAX_RESULTS_PER_QUERY,
                    include_answer=True,
                    include_raw_content=False,
                )
                section = _format_search_result(title, query, result)
                if section:
                    sections.append(section)
            except Exception:
                logger.warning("검색 실패: %s", query, exc_info=True)
                continue

    except Exception:
        logger.exception("Tavily 클라이언트 초기화 실패")
        return ""

    if not sections:
        return ""

    combined = "\n\n".join(sections)

    if len(combined) > MAX_RESEARCH_CHARS:
        combined = combined[:MAX_RESEARCH_CHARS] + "\n\n[... 조사 결과 일부 생략]"

    logger.info(
        "웹 리서치 완료: %s (%s, %s), %d건 섹션, %d자",
        company_name, industry_term, analysis_type,
        len(sections), len(combined),
    )

    return combined


def _format_search_result(title: str, query: str, result: dict[str, Any]) -> str:
    """Tavily 검색 결과를 마크다운 섹션으로 포맷"""
    parts: list[str] = [f"### {title}"]

    answer = result.get("answer")
    if answer:
        parts.append(answer)

    results_list = result.get("results", [])
    if results_list:
        parts.append("\n**주요 출처:**")
        for item in results_list[:4]:
            item_title = item.get("title", "")
            content = item.get("content", "")
            url = item.get("url", "")

            if content:
                snippet = content[:MAX_SNIPPET_CHARS]
                if len(content) > MAX_SNIPPET_CHARS:
                    snippet += "..."
                source = f" — [{item_title}]({url})" if item_title and url else ""
                parts.append(f"- {snippet}{source}")

    return "\n".join(parts) if len(parts) > 1 else ""

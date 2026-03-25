"""웹 리서치 서비스 — Tavily API를 사용한 시장 조사 및 기업 검증

AI 스크리닝 시 기업이 제출한 IR 자료의 시장 규모·경쟁 환경·최신 동향을
외부 데이터로 교차 검증하기 위한 웹 검색 서비스.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

MAX_RESEARCH_CHARS = 5000


def research_market(company_name: str, industry: str | None = None) -> str:
    """스타트업의 시장 환경을 웹 검색으로 조사한다.

    4개 검색 쿼리를 실행하여 시장 규모, 경쟁 현황, 기업 정보, 정부 정책을 수집.
    TAVILY_API_KEY 미설정 시 빈 문자열 반환 (graceful degradation).
    """
    if not settings.TAVILY_API_KEY:
        logger.info("TAVILY_API_KEY 미설정 — 웹 리서치 건너뜀")
        return ""

    industry_term = industry or "딥테크"

    queries = [
        f"{industry_term} 시장 규모 전망 2025 2026",
        f"{industry_term} 주요 기업 경쟁 현황 스타트업",
        f"{company_name} 기업 정보 투자 뉴스",
        f"{industry_term} 정부 정책 R&D 지원",
    ]

    sections: list[str] = []

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=settings.TAVILY_API_KEY)

        section_titles = [
            "시장 규모 및 전망",
            "경쟁 현황",
            "기업 정보 및 뉴스",
            "정부 정책 및 R&D",
        ]

        for title, query in zip(section_titles, queries):
            try:
                result = client.search(
                    query=query,
                    search_depth="advanced",
                    max_results=5,
                    include_answer=True,
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

    # 최대 길이 제한
    if len(combined) > MAX_RESEARCH_CHARS:
        combined = combined[:MAX_RESEARCH_CHARS] + "\n\n[... 조사 결과 일부 생략]"

    logger.info(
        "웹 리서치 완료: %s (%s), %d건 섹션, %d자",
        company_name, industry_term, len(sections), len(combined),
    )

    return combined


def _format_search_result(title: str, query: str, result: dict[str, Any]) -> str:
    """Tavily 검색 결과를 마크다운 섹션으로 포맷"""
    parts: list[str] = [f"### {title}"]

    # AI 요약 답변
    answer = result.get("answer")
    if answer:
        parts.append(answer)

    # 개별 검색 결과
    results_list = result.get("results", [])
    if results_list:
        parts.append("")
        for i, item in enumerate(results_list[:3], 1):
            item_title = item.get("title", "")
            content = item.get("content", "")
            url = item.get("url", "")

            if content:
                # 각 결과를 200자로 제한
                snippet = content[:200] + "..." if len(content) > 200 else content
                source_label = f"[출처: {item_title}]" if item_title else ""
                parts.append(f"- {snippet} {source_label}")

    return "\n".join(parts) if len(parts) > 1 else ""

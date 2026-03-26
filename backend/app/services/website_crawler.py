"""기업 웹사이트 직접 크롤링 서비스

AI 스크리닝 시 기업 공식 웹사이트를 방문하여 주요 페이지의 텍스트를 수집하고,
LLM 분석 컨텍스트에 반영할 수 있는 구조화된 결과를 반환한다.

- 메인 페이지 + 내부 링크(about, team, product 등) 최대 10페이지
- 실패 시 빈 dict 반환 (기존 분석에 영향 없음)
"""

from __future__ import annotations

import logging
import time
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── 상수 ──────────────────────────────────────────────────────
MAX_PAGES = 10
MAX_CHARS_PER_PAGE = 5000
MAX_TOTAL_CHARS = 15000
PAGE_TIMEOUT = 10.0
TOTAL_TIMEOUT = 30.0
USER_AGENT = "eLSA-Bot/1.0 (investment-screening)"

REMOVE_TAGS = frozenset({
    "script", "style", "nav", "footer", "header", "aside", "noscript", "iframe",
})

PAGE_KEYWORDS: dict[str, list[str]] = {
    "about": ["about", "회사소개", "소개", "company", "기업소개", "who-we-are", "about-us"],
    "team": ["team", "팀", "people", "leadership", "경영진", "조직", "멤버", "구성원"],
    "product": ["product", "제품", "서비스", "service", "solution", "솔루션", "기술", "technology", "platform"],
    "careers": ["career", "채용", "recruit", "hiring", "jobs", "인재", "합류", "join"],
    "blog": ["blog", "블로그", "news", "뉴스", "notice", "공지", "press", "보도", "insight"],
    "contact": ["contact", "문의", "연락", "오시는길", "위치", "location", "찾아오시는"],
}


# ── 메인 함수 ─────────────────────────────────────────────────

def crawl_company_website(
    website_url: str | None,
    company_name: str,
) -> dict:
    """기업 웹사이트를 크롤링하여 구조화된 결과를 반환한다.

    Args:
        website_url: Startup.website URL. None이면 빈 dict 반환.
        company_name: 기업명 (로깅용).

    Returns:
        크롤링 결과 dict. 실패 시 빈 dict.
        - crawl_text: LLM 컨텍스트용 마크다운 문자열
        - url, crawled_at, pages_crawled, findings, website_health
    """
    if not website_url or not website_url.strip():
        logger.info("웹사이트 URL 미등록: %s — 크롤링 건너뜀", company_name)
        return {}

    url = website_url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    start_time = time.monotonic()

    try:
        return _do_crawl(url, company_name, start_time)
    except Exception:
        logger.warning("웹사이트 크롤링 전체 실패: %s (%s)", company_name, url, exc_info=True)
        return {}


def _do_crawl(url: str, company_name: str, start_time: float) -> dict:
    """실제 크롤링 수행."""
    pages: dict[str, str] = {}  # {page_type: extracted_text}
    response_time_ms = 0

    # robots.txt 확인
    robot_parser = _load_robots_txt(url)

    with httpx.Client(
        timeout=PAGE_TIMEOUT,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        # 1) 메인 페이지 크롤링
        if not _is_allowed_by_robots(robot_parser, url):
            logger.info("robots.txt 차단: %s", url)
            return _build_inaccessible_result(url)

        main_html = _fetch_page(client, url)
        if not main_html:
            return _build_inaccessible_result(url)

        response_time_ms = int((time.monotonic() - start_time) * 1000)
        main_text = _extract_text(main_html)
        pages["main"] = main_text

        # 2) 내부 링크 탐색
        subpages = _discover_subpages(main_html, url)
        logger.info(
            "웹사이트 내부 링크 발견: %s — %d개 (%s)",
            company_name, len(subpages), ", ".join(subpages.keys()),
        )

        # 3) 서브페이지 크롤링
        for page_type, page_url in subpages.items():
            if len(pages) >= MAX_PAGES:
                break
            if (time.monotonic() - start_time) > TOTAL_TIMEOUT:
                logger.warning("크롤링 전체 타임아웃 도달: %s", company_name)
                break
            if not _is_allowed_by_robots(robot_parser, page_url):
                logger.info("robots.txt 차단 (서브페이지): %s", page_url)
                continue

            html = _fetch_page(client, page_url)
            if html:
                text = _extract_text(html)
                if text.strip():
                    pages[page_type] = text

    # 4) 결과 구조화
    crawl_text = _format_crawl_result(url, pages)
    findings = _extract_findings(pages)
    has_ssl = url.startswith("https://")

    parsed = urlparse(url)
    total_links = len(_discover_subpages(main_html, url)) if main_html else 0

    return {
        "url": url,
        "crawled_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "pages_crawled": len(pages),
        "crawl_text": crawl_text,
        "findings": findings,
        "ir_cross_validation": {
            "product_match": None,
            "team_match": None,
            "discrepancies": [],
        },
        "website_health": {
            "is_accessible": True,
            "has_ssl": has_ssl,
            "response_time_ms": response_time_ms,
            "page_count": total_links + 1,
        },
    }


# ── 페이지 요청 ──────────────────────────────────────────────

def _fetch_page(client: httpx.Client, url: str) -> str | None:
    """URL에서 HTML을 가져온다. 실패 시 None."""
    try:
        resp = client.get(url)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return None

        return resp.text
    except httpx.TimeoutException:
        logger.warning("페이지 타임아웃: %s", url)
        return None
    except httpx.HTTPStatusError as e:
        logger.warning("HTTP 에러 %d: %s", e.response.status_code, url)
        return None
    except Exception:
        logger.warning("페이지 요청 실패: %s", url, exc_info=True)
        return None


# ── 텍스트 추출 ──────────────────────────────────────────────

def _extract_text(html: str, max_chars: int = MAX_CHARS_PER_PAGE) -> str:
    """HTML에서 의미 있는 본문 텍스트를 추출한다."""
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(REMOVE_TAGS):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)

    return cleaned[:max_chars]


# ── 내부 링크 탐색 ───────────────────────────────────────────

def _discover_subpages(html: str, base_url: str) -> dict[str, str]:
    """메인 페이지 HTML에서 주요 내부 링크를 분류하여 반환한다."""
    soup = BeautifulSoup(html, "html.parser")
    parsed_base = urlparse(base_url)
    found: dict[str, str] = {}

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        full_url = urljoin(base_url, href)
        parsed = urlparse(full_url)

        # 같은 도메인만
        if parsed.netloc and parsed.netloc != parsed_base.netloc:
            continue

        # 앵커/자바스크립트/메일 링크 제외
        if href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue

        link_text = a_tag.get_text(strip=True).lower()
        url_path = parsed.path.lower()

        for page_type, keywords in PAGE_KEYWORDS.items():
            if page_type in found:
                continue
            if any(kw in url_path or kw in link_text for kw in keywords):
                found[page_type] = full_url
                break

    return found


# ── 결과 포맷팅 ──────────────────────────────────────────────

_PAGE_TITLES: dict[str, str] = {
    "main": "메인 페이지",
    "about": "회사 소개",
    "team": "팀/경영진",
    "product": "제품/서비스",
    "careers": "채용 현황",
    "blog": "뉴스/블로그",
    "contact": "연락처/위치",
}


def _format_crawl_result(url: str, pages: dict[str, str]) -> str:
    """크롤링된 페이지들을 LLM 컨텍스트용 마크다운으로 포맷한다."""
    if not pages:
        return ""

    sections = [f"## 기업 웹사이트 분석 결과 ({url})"]

    total_chars = 0
    for page_type, text in pages.items():
        if total_chars >= MAX_TOTAL_CHARS:
            sections.append("\n[... 웹사이트 분석 결과 일부 생략]")
            break

        title = _PAGE_TITLES.get(page_type, page_type)
        remaining = MAX_TOTAL_CHARS - total_chars
        truncated = text[:remaining]
        sections.append(f"\n### {title}\n{truncated}")
        total_chars += len(truncated)

    return "\n".join(sections)


def _extract_findings(pages: dict[str, str]) -> dict:
    """크롤링된 페이지에서 주요 정보를 추출한다."""
    return {
        "company_description": pages.get("about", pages.get("main", ""))[:500],
        "products": _extract_list_items(pages.get("product", "")),
        "team_members": _extract_list_items(pages.get("team", "")),
        "customers": [],  # 고객사 자동 추출은 LLM에게 위임
        "recent_news": _extract_list_items(pages.get("blog", "")),
        "hiring_positions": _extract_list_items(pages.get("careers", "")),
    }


def _extract_list_items(text: str, max_items: int = 10) -> list[str]:
    """텍스트에서 목록 항목을 추출한다 (줄 단위, 짧은 줄 우선)."""
    if not text:
        return []
    lines = [line.strip() for line in text.splitlines() if 5 < len(line.strip()) < 100]
    return lines[:max_items]


# ── robots.txt ────────────────────────────────────────────────

def _load_robots_txt(url: str) -> RobotFileParser | None:
    """사이트의 robots.txt를 로드한다. 실패 시 None (모든 경로 허용)."""
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp
    except Exception:
        logger.debug("robots.txt 로드 실패: %s — 모든 경로 허용으로 진행", url)
        return None


def _is_allowed_by_robots(rp: RobotFileParser | None, url: str) -> bool:
    """robots.txt에서 해당 URL 크롤링이 허용되는지 확인한다."""
    if rp is None:
        return True
    try:
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True


# ── 접속 불가 결과 ───────────────────────────────────────────

def _build_inaccessible_result(url: str) -> dict:
    """접속 불가 시 반환할 결과."""
    return {
        "url": url,
        "crawled_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "pages_crawled": 0,
        "crawl_text": f"## 기업 웹사이트 분석 결과\n\n[웹사이트 접속 불가: {url}]",
        "findings": {},
        "website_health": {
            "is_accessible": False,
            "has_ssl": url.startswith("https://"),
            "response_time_ms": 0,
            "page_count": 0,
        },
    }

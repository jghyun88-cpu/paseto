# website-crawl Design Document

> **Summary**: AI 스크리닝 시 기업 공식 웹사이트를 httpx+BeautifulSoup로 직접 크롤링하여 LLM 분석 컨텍스트에 반영
>
> **Project**: eLSA
> **Author**: System
> **Date**: 2026-03-26
> **Status**: Draft
> **Planning Doc**: [website-crawl.plan.md](../01-plan/features/website-crawl.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 기업 공식 웹사이트의 주요 페이지(메인, 소개, 제품, 팀, 채용, 블로그)를 자동 크롤링
- 크롤링 결과를 AI 스크리닝 LLM 컨텍스트에 구조화하여 주입
- 크롤링 실패 시 기존 분석 흐름에 영향 없음 (graceful degradation)
- 기존 `web_research_service.py`와 완전 독립 (단일 책임 원칙)

### 1.2 Design Principles

- **Fail-safe**: 모든 크롤링 로직은 try-except로 감싸고, 실패 시 빈 결과 반환
- **Resource-bounded**: 최대 10페이지, 페이지당 5000자, 전체 30초 타임아웃
- **Minimal dependency**: httpx(이미 설치) + beautifulsoup4만 추가
- **Stateless**: 크롤링 결과를 DB에 별도 저장하지 않고, AI 분석 scores에 임베딩

---

## 2. Architecture

### 2.1 Component Diagram

```
ai_screening.py (Celery Task)
│
├── _build_startup_info()          기존
├── research_market()              기존 (Tavily 웹 검색)
├── crawl_company_website() ◀──── 신규 (website_crawler.py)
│   ├── _fetch_page()              HTTP GET + 파싱
│   ├── _extract_text()            HTML → 텍스트 추출
│   ├── _discover_subpages()       내부 링크 탐색
│   ├── _classify_page()           페이지 유형 분류
│   └── _format_crawl_result()     LLM 컨텍스트용 마크다운 생성
├── analyze_documents_with_llm()   기존 (크롤링 결과 포함된 startup_info 전달)
└── _merge_results()               기존 + _website_analysis 메타 추가
```

### 2.2 Data Flow

```
Startup.website URL
    │
    ▼
[1] 메인 페이지 HTTP GET (httpx, timeout=10s)
    │
    ▼
[2] HTML 파싱 (BeautifulSoup)
    ├── 메인 페이지 텍스트 추출
    └── 내부 링크 수집 (<a href>)
        │
        ▼
[3] 링크 분류 (about/team/product/careers/blog/contact)
    │
    ▼
[4] 분류된 페이지 순차 크롤링 (최대 9페이지 추가)
    │
    ▼
[5] 결과 구조화 (dict)
    ├── crawl_text: LLM 컨텍스트용 마크다운 문자열
    └── metadata: JSON (url, pages_crawled, findings, website_health)
        │
        ▼
[6] ai_screening.py에서 startup_info에 추가
    └── scores["_website_analysis"]에 메타데이터 저장
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `website_crawler.py` | httpx (0.28.1, 이미 설치) | HTTP 요청 |
| `website_crawler.py` | beautifulsoup4 (신규 추가) | HTML 파싱 |
| `ai_screening.py` | `website_crawler.py` | 크롤링 호출 |

---

## 3. Data Model

### 3.1 크롤링 결과 구조 (반환값, DB 모델 아님)

```python
# crawl_company_website() 반환 타입
CrawlResult = dict  # TypedDict 미사용 (Celery 직렬화 호환)

# 구조:
{
    "url": str,                    # 크롤링한 URL
    "crawled_at": str,             # ISO 8601 타임스탬프
    "pages_crawled": int,          # 크롤링한 페이지 수
    "crawl_text": str,             # LLM 컨텍스트용 마크다운 (startup_info에 추가)
    "findings": {
        "company_description": str,    # 회사 소개
        "products": list[str],         # 제품/서비스 목록
        "team_info": str,              # 팀 정보 요약
        "customers": list[str],        # 고객사/파트너
        "recent_news": list[str],      # 최근 뉴스/블로그
        "hiring_positions": list[str], # 채용 포지션
    },
    "website_health": {
        "is_accessible": bool,         # 접속 가능 여부
        "has_ssl": bool,               # HTTPS 여부
        "response_time_ms": int,       # 응답 시간
        "page_count": int,             # 발견된 총 페이지 수
    },
}
```

### 3.2 기존 모델 참조

```python
# backend/app/models/startup.py (변경 없음)
class Startup(Base):
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
```

### 3.3 AIAnalysis scores 확장

```python
# 기존 scores dict에 _website_analysis 키 추가 (ai_screening.py에서)
result["scores"]["_website_analysis"] = {
    "url": "https://example.com",
    "crawled_at": "2026-03-26T10:00:00",
    "pages_crawled": 5,
    "findings": { ... },
    "website_health": { ... },
}
```

---

## 4. API Specification

> 별도 API 엔드포인트 없음. 기존 AI 스크리닝 태스크 내부에서 호출.

### 4.1 Internal Function Signatures

#### `crawl_company_website(website_url, company_name)` — 메인 함수

```python
def crawl_company_website(
    website_url: str | None,
    company_name: str,
) -> dict:
    """기업 웹사이트를 크롤링하여 구조화된 결과를 반환한다.

    Args:
        website_url: Startup.website URL. None이면 빈 결과 반환.
        company_name: 기업명 (로깅용).

    Returns:
        CrawlResult dict. 실패 시 빈 dict 반환.
    """
```

#### `_fetch_page(url, timeout)` — 단일 페이지 요청

```python
def _fetch_page(url: str, timeout: float = 10.0) -> str | None:
    """URL에서 HTML을 가져온다. 실패 시 None 반환."""
```

#### `_extract_text(html, max_chars)` — 텍스트 추출

```python
def _extract_text(html: str, max_chars: int = MAX_CHARS_PER_PAGE) -> str:
    """HTML에서 의미 있는 텍스트를 추출한다.
    script, style, nav, footer 태그 제거 후 본문 텍스트만 반환.
    """
```

#### `_discover_subpages(html, base_url)` — 내부 링크 탐색

```python
def _discover_subpages(html: str, base_url: str) -> dict[str, str]:
    """메인 페이지 HTML에서 주요 내부 링크를 분류하여 반환한다.

    Returns:
        {"about": "https://...", "team": "https://...", ...}
        키: about, team, product, careers, blog, contact, news
    """
```

#### `_classify_page(url, link_text)` — 페이지 유형 분류

```python
def _classify_page(url: str, link_text: str) -> str | None:
    """URL과 링크 텍스트로 페이지 유형을 분류한다.

    Returns:
        "about" | "team" | "product" | "careers" | "blog" | "contact" | "news" | None
    """
```

#### `_format_crawl_result(pages)` — LLM 컨텍스트 생성

```python
def _format_crawl_result(
    url: str,
    pages: dict[str, str],
) -> str:
    """크롤링된 페이지들을 LLM 컨텍스트용 마크다운으로 포맷한다.

    Returns:
        "## 기업 웹사이트 분석 결과\n### 회사 소개\n..."
    """
```

---

## 5. UI/UX Design

> 프론트엔드 UI 변경 없음.
> 크롤링 결과는 기존 AI 분석 보고서의 `summary` 필드에 자연스럽게 포함된다.
> `scores._website_analysis`는 향후 프론트엔드 확장 시 활용 가능.

---

## 6. Error Handling

### 6.1 에러 시나리오별 처리

| 시나리오 | 처리 방식 | 로그 레벨 |
|----------|----------|-----------|
| website URL이 None/빈 문자열 | 빈 dict 반환, 스크리닝 계속 | INFO |
| DNS 해석 실패 | 빈 dict 반환, "[웹사이트 접속 불가]" | WARNING |
| HTTP 응답 4xx/5xx | 빈 dict 반환, 상태코드 기록 | WARNING |
| 연결 타임아웃 (10초) | 해당 페이지 건너뜀, 수집분만 사용 | WARNING |
| 전체 타임아웃 (30초) | 수집된 페이지까지만 사용 | WARNING |
| HTML 파싱 실패 | 해당 페이지 건너뜀 | WARNING |
| robots.txt 접근 차단 | 해당 경로 건너뜀 | INFO |
| SSL 인증서 오류 | `verify=False`로 재시도 1회 | WARNING |

### 6.2 에러 전파 규칙

```python
# ai_screening.py에서의 호출 패턴 (기존 web_research와 동일)
website_crawl_result = {}
try:
    from app.services.website_crawler import crawl_company_website
    website_crawl_result = crawl_company_website(startup.website, startup.company_name)
except Exception:
    logger.warning("웹사이트 크롤링 실패 — 기존 분석만 진행", exc_info=True)
```

> **핵심 원칙**: 크롤링의 어떤 오류도 AI 스크리닝 전체를 실패시키지 않는다.

---

## 7. Security Considerations

- [x] robots.txt 확인 후 차단된 경로는 크롤링하지 않음
- [x] User-Agent 헤더 명시: `eLSA-Bot/1.0 (investment-screening)`
- [x] 외부 도메인 링크는 따라가지 않음 (같은 도메인만 크롤링)
- [x] 최대 10페이지 제한으로 과도한 요청 방지
- [x] 페이지당 5000자 제한으로 메모리 보호
- [x] 크롤링 결과는 내부 분석용으로만 사용 (외부 노출 없음)
- [x] SSL 인증서 검증 기본 활성화 (`verify=True`)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | `_extract_text`, `_classify_page`, `_discover_subpages` | pytest |
| Integration Test | `crawl_company_website` (실제 URL) | pytest + httpx mock |
| Regression Test | AI 스크리닝 기존 동작 유지 | 기존 테스트 실행 |

### 8.2 Test Cases

- [ ] **Happy path**: 정상 웹사이트 URL → 주요 페이지 크롤링 → 구조화된 결과 반환
- [ ] **URL None**: website 필드 미등록 → 빈 dict 반환, 스크리닝 정상 진행
- [ ] **접속 불가**: 존재하지 않는 도메인 → 빈 dict, 에러 로그
- [ ] **타임아웃**: 느린 서버 → 10초 초과 시 해당 페이지 건너뜀
- [ ] **SPA 사이트**: JavaScript 렌더링 필요 → 초기 HTML만 추출 (부분 결과)
- [ ] **외부 링크 차단**: 다른 도메인 링크 → 무시하고 내부 링크만 탐색
- [ ] **대용량 페이지**: 50000자 페이지 → 5000자로 잘림
- [ ] **robots.txt 차단**: /team/ 차단 → 해당 페이지 건너뜀
- [ ] **ai_screening 통합**: 크롤링 결과가 LLM 컨텍스트에 포함되는지 확인

---

## 9. Coding Convention Reference

### 9.1 기존 eLSA 백엔드 컨벤션 적용

| Item | Convention |
|------|-----------|
| 파일명 | `snake_case.py` (`website_crawler.py`) |
| 함수명 | `snake_case` (`crawl_company_website`) |
| 상수 | `UPPER_SNAKE_CASE` (`MAX_PAGES`, `MAX_CHARS_PER_PAGE`) |
| 로깅 | `logger = logging.getLogger(__name__)` |
| private 함수 | `_prefix` (`_fetch_page`, `_extract_text`) |
| docstring | 한글, Google style |
| 에러 처리 | try-except, logger.warning, graceful fallback |

### 9.2 Import 순서

```python
# 1. 표준 라이브러리
from __future__ import annotations
import logging
import time
from urllib.parse import urljoin, urlparse

# 2. 서드파티
import httpx
from bs4 import BeautifulSoup

# 3. 프로젝트 내부
# (website_crawler.py는 외부 의존성 없음 — 독립 모듈)
```

---

## 10. Implementation Guide

### 10.1 File Structure

```
backend/app/services/
├── web_research_service.py     # 기존 (변경 없음)
└── website_crawler.py          # 신규

backend/app/tasks/
└── ai_screening.py             # 수정 (크롤링 호출 추가)

backend/
└── requirements.txt            # 수정 (beautifulsoup4 추가)
```

### 10.2 Implementation Order

| Step | 작업 | 파일 | 상세 |
|------|------|------|------|
| 1 | `beautifulsoup4` 패키지 추가 | `requirements.txt` | httpx는 이미 설치됨 (0.28.1) |
| 2 | `website_crawler.py` 구현 | `backend/app/services/website_crawler.py` | 아래 §10.3 상수 + §4 함수 시그니처 기반 |
| 3 | `ai_screening.py` 수정 | `backend/app/tasks/ai_screening.py` | 웹 리서치 블록 다음에 크롤링 블록 추가 |
| 4 | Docker 재빌드 + 동작 검증 | - | `docker compose build backend && docker compose up -d` |

### 10.3 상수 정의 (website_crawler.py)

```python
MAX_PAGES = 10                  # 최대 크롤링 페이지 수
MAX_CHARS_PER_PAGE = 5000       # 페이지당 최대 텍스트 길이
MAX_TOTAL_CHARS = 15000         # 전체 크롤링 텍스트 최대 길이
PAGE_TIMEOUT = 10.0             # 페이지당 타임아웃 (초)
TOTAL_TIMEOUT = 30.0            # 전체 크롤링 타임아웃 (초)
USER_AGENT = "eLSA-Bot/1.0 (investment-screening)"

# 페이지 유형 분류용 키워드
PAGE_KEYWORDS: dict[str, list[str]] = {
    "about": ["about", "회사소개", "소개", "company", "기업소개", "who-we-are"],
    "team": ["team", "팀", "people", "leadership", "경영진", "조직", "멤버"],
    "product": ["product", "제품", "서비스", "service", "solution", "솔루션", "기술", "technology"],
    "careers": ["career", "채용", "recruit", "hiring", "jobs", "인재", "합류"],
    "blog": ["blog", "블로그", "news", "뉴스", "notice", "공지", "press", "보도"],
    "contact": ["contact", "문의", "연락", "오시는길", "위치", "location"],
}
```

### 10.4 ai_screening.py 수정 위치

```python
# 기존 웹 리서치 블록 (line 57-71) 바로 다음에 추가:

# 기업 웹사이트 직접 크롤링
website_crawl_used = False
website_crawl_meta = {}
try:
    from app.services.website_crawler import crawl_company_website

    website_crawl_result = crawl_company_website(
        startup.website, startup.company_name,
    )
    if website_crawl_result and website_crawl_result.get("crawl_text"):
        startup_info += f"\n\n{website_crawl_result['crawl_text']}"
        website_crawl_used = True
        website_crawl_meta = {
            k: v for k, v in website_crawl_result.items() if k != "crawl_text"
        }
        logger.info("웹사이트 크롤링 완료: %s (%d페이지)",
                     startup.company_name,
                     website_crawl_result.get("pages_crawled", 0))
except Exception:
    logger.warning("웹사이트 크롤링 실패 — 기존 분석만 진행", exc_info=True)

# ... (기존 LLM 분석, 규칙 기반 분석, _merge_results 코드) ...

# 결과 저장 직전에 추가:
if website_crawl_meta:
    result["scores"]["_website_analysis"] = website_crawl_meta
```

### 10.5 _discover_subpages 분류 로직

```python
def _discover_subpages(html: str, base_url: str) -> dict[str, str]:
    """메인 페이지 HTML에서 주요 내부 링크를 분류"""
    soup = BeautifulSoup(html, "html.parser")
    parsed_base = urlparse(base_url)
    found: dict[str, str] = {}

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        full_url = urljoin(base_url, href)
        parsed = urlparse(full_url)

        # 같은 도메인만
        if parsed.netloc != parsed_base.netloc:
            continue

        link_text = a_tag.get_text(strip=True).lower()
        url_path = parsed.path.lower()

        for page_type, keywords in PAGE_KEYWORDS.items():
            if page_type in found:
                continue  # 이미 발견된 유형은 건너뜀
            if any(kw in url_path or kw in link_text for kw in keywords):
                found[page_type] = full_url
                break

    return found
```

### 10.6 _extract_text 로직

```python
REMOVE_TAGS = {"script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"}

def _extract_text(html: str, max_chars: int = MAX_CHARS_PER_PAGE) -> str:
    """HTML에서 의미 있는 본문 텍스트를 추출"""
    soup = BeautifulSoup(html, "html.parser")

    # 불필요한 태그 제거
    for tag in soup.find_all(REMOVE_TAGS):
        tag.decompose()

    # 텍스트 추출 + 정리
    text = soup.get_text(separator="\n", strip=True)

    # 빈 줄 정리 (연속 빈 줄 → 단일 빈 줄)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)

    return cleaned[:max_chars]
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-26 | Initial draft | System |

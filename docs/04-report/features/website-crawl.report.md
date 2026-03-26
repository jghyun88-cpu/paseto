# website-crawl Completion Report

> **Feature**: website-crawl — AI 스크리닝 시 기업 웹사이트 직접 크롤링
> **Project**: eLSA
> **Date**: 2026-03-26
> **Status**: Completed

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | website-crawl |
| **Duration** | 2026-03-26 (단일 세션) |
| **Match Rate** | 88% → 93% (Act 1회) |
| **Phase** | Plan → Design → Do → Check → Act → Report |

### Value Delivered

| Perspective | Result |
|-------------|--------|
| **Problem** | AI 스크리닝이 Tavily 간접 검색만 의존하여 기업 공식 웹사이트 정보를 직접 확인하지 못했음 |
| **Solution** | httpx+BeautifulSoup 기반 `website_crawler.py` 서비스 신규 구현, 메인+서브페이지 최대 10개 자동 크롤링 |
| **Function/UX Effect** | 스크리닝 보고서에 "기업 웹사이트 분석 결과" 섹션 자동 추가, `_website_analysis` 메타데이터 저장 |
| **Core Value** | 1차 출처(공식 웹사이트) 직접 확인으로 IR 교차 검증력 향상, robots.txt 준수 |

---

## 1. PDCA Cycle Summary

### 1.1 Plan

- 문서: `docs/01-plan/features/website-crawl.plan.md`
- FR 10개 정의 (FR-01 ~ FR-10)
- 아키텍처 결정: httpx (이미 설치) + beautifulsoup4 (신규), 별도 서비스 파일
- 외부 API 키 불필요 (Tavily와 독립)

### 1.2 Design

- 문서: `docs/02-design/features/website-crawl.design.md`
- 함수 시그니처 5개 정의, 상수 6개, 에러 시나리오 8개
- 호출 흐름: `ai_screening.py` → `crawl_company_website()` → LLM 컨텍스트 주입
- 보안: robots.txt 준수, User-Agent 명시, 같은 도메인만 크롤링

### 1.3 Do

- 3개 파일 변경:

| 파일 | 작업 | 라인 |
|------|------|------|
| `backend/requirements.txt` | `beautifulsoup4>=4.12.0` 추가 | +1 |
| `backend/app/services/website_crawler.py` | 신규 서비스 구현 | 327줄 |
| `backend/app/tasks/ai_screening.py` | 크롤링 호출 + 메타 저장 통합 | +25줄 |

- 구현된 함수 9개:

| 함수 | 역할 |
|------|------|
| `crawl_company_website()` | 메인 진입점 |
| `_do_crawl()` | httpx Client로 순차 크롤링 수행 |
| `_fetch_page()` | 단일 페이지 GET (타임아웃 10초) |
| `_extract_text()` | HTML → 본문 텍스트 추출 |
| `_discover_subpages()` | 내부 링크에서 6개 유형 분류 |
| `_format_crawl_result()` | LLM 컨텍스트용 마크다운 생성 |
| `_extract_findings()` | 구조화된 findings dict 생성 |
| `_load_robots_txt()` | robots.txt 로드 |
| `_is_allowed_by_robots()` | 경로 접근 허용 여부 확인 |

### 1.4 Check (Gap Analysis)

- 초기 Match Rate: **88%** (11개 카테고리 가중 평균)
- 미충족 항목 8개 중 주요 3개 식별:
  1. `team_info` → `team_members` 키 이름 불일치 (Standard §5-6)
  2. robots.txt 준수 미구현 (FR-09)
  3. `ir_cross_validation` 구조 누락 (Standard §5-6)

### 1.5 Act (1회 반복)

- 3개 수정 적용:
  1. `findings.team_members`를 `list[str]` 타입으로 변경
  2. `_load_robots_txt()` + `_is_allowed_by_robots()` 추가 (메인+서브페이지 모두 체크)
  3. `ir_cross_validation` 빈 구조 반환 추가
- 최종 Match Rate: **93%**

---

## 2. Requirements Fulfillment

| ID | Requirement | Status |
|----|-------------|--------|
| FR-01 | Startup.website URL로 메인 페이지 크롤링 | Done |
| FR-02 | 내부 링크에서 주요 페이지 자동 탐색 (6개 유형) | Done |
| FR-03 | 페이지 텍스트 콘텐츠 추출 (태그 제거) | Done |
| FR-04 | 크롤링 결과를 구조화된 dict로 반환 | Done |
| FR-05 | ai_screening.py에서 웹 리서치와 별도 호출 | Done |
| FR-06 | startup_info에 "기업 웹사이트 분석 결과" 섹션 추가 | Done |
| FR-07 | scores._website_analysis에 메타데이터 저장 | Done |
| FR-08 | URL 미등록 시 기업명 기반 탐색 | Deferred |
| FR-09 | robots.txt 준수 | Done |
| FR-10 | 크롤링 실패 시 기존 분석 계속 진행 | Done |

**FR-08 Deferred 사유**: Tavily 연동으로 URL 탐색 시 추가 API 호출 비용 발생. 우선순위 Medium으로 향후 개선.

---

## 3. Architecture Compliance

| 항목 | 기준 | 상태 |
|------|------|------|
| Router → Service → Model | 별도 Service 파일 분리 | Pass |
| 에러 처리 | try-except, graceful degradation | Pass |
| 로깅 | `logging.getLogger(__name__)` | Pass |
| 상수 | `UPPER_SNAKE_CASE`, 파일 상단 | Pass |
| 외부 의존성 | httpx (기존), bs4 (신규 1개) | Pass |
| 보안 | robots.txt 준수, 동일 도메인만, User-Agent 명시 | Pass |

---

## 4. Remaining Items

| Item | Priority | Action |
|------|----------|--------|
| FR-08: URL 미등록 시 기업명 기반 웹사이트 탐색 | Medium | 향후 스프린트에서 Tavily 연동 구현 |
| SSL 오류 시 verify=False 재시도 | Low | 실제 사례 발생 시 추가 |
| `ir_cross_validation` 실제 교차 검증 로직 | Medium | LLM 프롬프트에서 교차 검증 지시 추가 |
| `website_health.last_updated` | Low | HTML meta 태그 파싱으로 추정 가능 |

---

## 5. Deployment

```bash
docker compose build backend && docker compose up -d
```

- `beautifulsoup4` 패키지가 Docker 이미지에 포함되도록 재빌드 필요
- 환경변수 추가 불필요 (외부 API 키 없음)
- 기존 기능에 영향 없음 (크롤링 실패 시 기존 분석 그대로 진행)

---

*PDCA Cycle 완료. Match Rate 93% 달성.*

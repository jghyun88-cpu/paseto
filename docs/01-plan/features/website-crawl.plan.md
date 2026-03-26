# website-crawl Planning Document

> **Summary**: AI 스크리닝 시 기업 공식 웹사이트를 직접 크롤링하여 IR 자료와 교차 검증
>
> **Project**: eLSA
> **Author**: System
> **Date**: 2026-03-26
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI 스크리닝이 Tavily 웹 검색만 의존하여 기업 웹사이트의 실제 제품/팀/고객 정보를 직접 확인하지 못함 |
| **Solution** | httpx 기반 웹사이트 크롤러를 구현하여 기업 공식 사이트의 주요 페이지를 수집·분석하고 LLM 컨텍스트에 반영 |
| **Function/UX Effect** | 스크리닝 보고서에 "기업 웹사이트 분석 결과" 섹션 추가, IR 자료와의 교차 검증 결과 자동 표시 |
| **Core Value** | 기업 정보의 1차 출처(공식 웹사이트) 직접 확인으로 스크리닝 신뢰도와 사실 검증력 향상 |

---

## 1. Overview

### 1.1 Purpose

AI 스크리닝 실행 시 해당 기업의 공식 웹사이트를 직접 크롤링하여:
- 제품/서비스 실재 여부 확인
- 팀 구성·경영진 정보 수집
- 고객 사례·파트너십 파악
- IR 자료와의 불일치 탐지

### 1.2 Background

현재 `web_research_service.py`는 Tavily API를 통한 **간접 웹 검색**만 수행한다.
검색 결과는 뉴스·기사·DB 등 3자 출처이며, 기업의 공식 웹사이트를 **직접 방문하여 내용을 분석하는 기능이 없다**.

투자 심사에서 기업 웹사이트는 가장 기본적인 1차 출처로, 직접 확인 없이는:
- IR에 기재된 제품이 실제로 존재하는지 검증 불가
- 웹사이트 부재/방치 여부로 사업 활성도 판단 불가
- 채용 현황으로 성장 단계 추정 불가

### 1.3 Related Documents

- 요구사항: `docs/references/screening-report-standard.md` §5-6
- 기존 구현: `backend/app/services/web_research_service.py`
- AI 스크리닝 태스크: `backend/app/tasks/ai_screening.py`
- 스타트업 모델: `backend/app/models/startup.py` (`website` 필드)

---

## 2. Scope

### 2.1 In Scope

- [ ] `website_crawler.py` 서비스 신규 생성 (httpx 기반)
- [ ] 기업 웹사이트 주요 페이지 크롤링 (최대 10페이지)
- [ ] 크롤링 결과를 LLM 분석 컨텍스트에 추가
- [ ] `ai_screening.py`에 크롤링 호출 통합
- [ ] IR 자료와의 교차 검증 결과를 `_website_analysis`에 저장
- [ ] 크롤링 실패 시 graceful degradation (기존 로직 영향 없음)

### 2.2 Out of Scope

- JavaScript 렌더링이 필요한 SPA 사이트 크롤링 (Playwright/Selenium)
- 로그인 필요 페이지 접근
- 웹사이트 스크린샷 캡처
- 프론트엔드 UI 변경 (보고서 표시는 기존 summary 필드 활용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Startup.website URL로 메인 페이지 크롤링 | High | Pending |
| FR-02 | 메인 페이지에서 내부 링크 추출 후 주요 페이지(about, team, product, contact, blog, careers) 자동 탐색 | High | Pending |
| FR-03 | 각 페이지의 텍스트 콘텐츠 추출 (HTML 태그 제거) | High | Pending |
| FR-04 | 크롤링 결과를 구조화된 JSON으로 반환 | High | Pending |
| FR-05 | `ai_screening.py`에서 웹 리서치와 별도로 크롤링 호출 | High | Pending |
| FR-06 | 크롤링 결과를 `startup_info`에 `## 기업 웹사이트 분석 결과` 섹션으로 추가 | High | Pending |
| FR-07 | `scores._website_analysis`에 크롤링 메타데이터 저장 | Medium | Pending |
| FR-08 | website URL 미등록 시 기업명 기반 Tavily 검색으로 공식 사이트 URL 탐색 | Medium | Pending |
| FR-09 | robots.txt 준수 | Medium | Pending |
| FR-10 | 크롤링 실패 시 "[웹사이트 접속 불가]" 표기, 기존 분석 계속 진행 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 전체 크롤링 30초 이내 완료 | 타임아웃 설정 확인 |
| Performance | 페이지당 타임아웃 10초 | httpx timeout 설정 |
| Security | robots.txt 준수, User-Agent 명시 | 코드 리뷰 |
| Reliability | 크롤링 실패 시 기존 분석에 영향 없음 | 에러 핸들링 테스트 |
| Resource | 최대 10페이지, 페이지당 최대 5000자 | 상수 설정 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `website_crawler.py` 구현 완료
- [ ] `ai_screening.py`에 크롤링 통합 완료
- [ ] 크롤링 성공 시 보고서에 웹사이트 분석 결과 포함 확인
- [ ] 크롤링 실패 시 기존 분석 정상 동작 확인
- [ ] robots.txt 준수 확인

### 4.2 Quality Criteria

- [ ] 정상 웹사이트 크롤링 성공률 90% 이상
- [ ] 크롤링 전체 소요 시간 30초 이내
- [ ] 기존 AI 스크리닝 테스트 깨지지 않음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 대상 웹사이트 접속 불가 (서버 다운, 방화벽) | Medium | High | try-except로 감싸고 실패 시 건너뜀. "[접속 불가]" 보고서에 표기 |
| SPA 사이트 렌더링 불가 (React/Vue CSR) | Medium | Medium | 초기 HTML만 수집. 향후 Playwright 확장 고려. Out of Scope 명시 |
| 크롤링 시간 초과로 스크리닝 지연 | High | Low | 페이지당 10초, 전체 30초 타임아웃. 초과 시 수집분만 사용 |
| 저작권/법적 이슈 | Low | Low | robots.txt 준수, 텍스트만 추출 (이미지/미디어 제외), 내부 분석용 |
| Celery 워커 블로킹 | High | Low | httpx async 사용, Celery sync_session 내에서 동기 호출로 래핑 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Enterprise** | ✅ |

기존 eLSA 아키텍처(Router → Service → Model) 준수.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| HTTP 클라이언트 | httpx / requests / aiohttp | httpx | 동기/비동기 모두 지원, 타임아웃 제어 우수 |
| HTML 파싱 | BeautifulSoup / lxml / selectolax | BeautifulSoup | 이미 프로젝트에 설치 가능, 사용 편의성 |
| 텍스트 추출 | 직접 파싱 / trafilatura / readability | BeautifulSoup + 직접 파싱 | 외부 의존성 최소화 |
| 크롤링 위치 | web_research_service 내 / 별도 서비스 | 별도 서비스 (website_crawler.py) | 단일 책임 원칙, 독립 테스트 가능 |

### 6.3 파일 구조

```
backend/app/services/
├── web_research_service.py    # 기존 — Tavily 웹 검색 (변경 없음)
├── website_crawler.py         # 신규 — 기업 웹사이트 직접 크롤링
└── ...

backend/app/tasks/
├── ai_screening.py            # 수정 — 크롤링 호출 추가
└── ...
```

### 6.4 호출 흐름

```
ai_screening.py::run_ai_screening()
│
├── 1. startup 정보 조회
├── 2. _build_startup_info()
├── 3. research_market()          ← 기존 Tavily 웹 검색
├── 4. crawl_company_website()    ← 신규: 기업 웹사이트 크롤링
│      ├── startup.website URL 확인
│      ├── 메인 페이지 크롤링
│      ├── 내부 링크 탐색 (about, team, product 등)
│      ├── 텍스트 추출 + 구조화
│      └── 결과 반환 (dict)
├── 5. startup_info에 크롤링 결과 추가
├── 6. analyze_documents_with_llm()
├── 7. _merge_results()
├── 8. result["scores"]["_website_analysis"] = 크롤링 메타
└── 9. AIAnalysis 저장
```

---

## 7. Convention Prerequisites

### 7.1 기존 프로젝트 컨벤션 준수

- [x] `CLAUDE.md` 코딩 컨벤션 (Router → Service → Model)
- [x] 에러 처리: `errors.py` 팩토리 함수, 한글 메시지
- [x] 로깅: `logging.getLogger(__name__)`
- [x] 상수: 파일 상단 `UPPER_SNAKE_CASE`

### 7.2 Environment Variables

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| (없음) | 크롤링은 외부 API 키 불필요 | - | - |

> httpx는 별도 API 키 없이 동작. 기존 `TAVILY_API_KEY`와 독립.

### 7.3 Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| httpx | HTTP 클라이언트 | >=0.27 |
| beautifulsoup4 | HTML 파싱 | >=4.12 |

> 두 패키지 모두 `requirements.txt`에 추가 필요.

---

## 8. Implementation Order

| Step | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 1 | `httpx`, `beautifulsoup4` 패키지 추가 | `requirements.txt` | 없음 |
| 2 | `website_crawler.py` 서비스 구현 | `backend/app/services/website_crawler.py` | Step 1 |
| 3 | `ai_screening.py`에 크롤링 호출 통합 | `backend/app/tasks/ai_screening.py` | Step 2 |
| 4 | 동작 검증 (Docker 재빌드 후 AI 스크리닝 실행) | - | Step 3 |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`website-crawl.design.md`)
2. [ ] 팀 리뷰 및 승인
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-26 | Initial draft | System |

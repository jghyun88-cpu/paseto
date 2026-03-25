"""문서 분석 서비스 — PDF 텍스트 추출 + Claude LLM 분석"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from app.models.document import Document

logger = logging.getLogger(__name__)

MAX_PAGES = 50
MAX_CHARS = 100_000


def extract_text_from_pdf(file_path: str) -> str:
    """PDF 파일에서 텍스트를 추출한다. 최대 50페이지/100K자."""
    try:
        from pypdf import PdfReader

        path = Path(file_path)
        if not path.exists():
            logger.warning("PDF 파일 없음: %s", file_path)
            return ""

        reader = PdfReader(str(path))
        pages = reader.pages[:MAX_PAGES]
        texts: list[str] = []
        total_len = 0

        for page in pages:
            text = page.extract_text() or ""
            if total_len + len(text) > MAX_CHARS:
                texts.append(text[: MAX_CHARS - total_len])
                break
            texts.append(text)
            total_len += len(text)

        return "\n".join(texts).strip()
    except Exception:
        logger.exception("PDF 텍스트 추출 실패: %s", file_path)
        return ""


def extract_text_from_document(doc: Document) -> str:
    """문서 파일에서 텍스트를 추출한다. PDF만 지원, 나머지는 파일명만 반환."""
    mime = (doc.mime_type or "").lower()
    if "pdf" in mime or (doc.file_name and doc.file_name.lower().endswith(".pdf")):
        return extract_text_from_pdf(doc.file_path)
    return f"[{doc.file_name}] (텍스트 추출 미지원 형식: {mime})"


# ── 분석 유형별 프롬프트 ──────────────────────────────────────────

_PROMPTS: dict[str, str] = {
    "screening": """\
당신은 딥테크 액셀러레이터의 투자 심사 전문가입니다.
아래 스타트업 정보와 첨부 문서(IR 자료 등)를 면밀히 분석하여 **풀버전 1차 스크리닝 보고서**를 작성하세요.

참조 기준: docs/references/screening-report-standard.md

## 보고서 구조 (9개 섹션)
1. 요약 — 총점(100점 만점), 판정, 한줄 요약, 판정 근거
2. 기본 적격성 검사 — 4개 Pass/Fail 항목
3. 기업 개요 — 기업명, 대표자, 사업 분야, 주요 제품, 팀 규모, 투자 요청, 정부 R&D
4. 항목별 평가 — 정량 4항목 + 정성 4항목 = 8개 항목 상세 평가
5. 핵심 강점 (Top 3) — 각 3~5문장 상세 서술
6. 주요 우려사항 (Top 3) — 각 3~5문장 상세 서술
7. 추가 확인 필요사항 — 2차 심사 진입 전 확인 사항
8. 종합 의견 — 5~10문장 투자 관점 종합 판단
9. 점수 요약표 — 전 항목 점수/만점/비율

## 평가 항목 및 배점 (100점 만점)

### 정량 평가 (60점)
1. team_competency — 팀 역량 (15점)
   - 13~15: 관련 산업 5년+, 창업/EXIT 이력, CEO/CTO/CPO 전원 풀타임, 기술+사업 보완, 산학협력 네트워크
   - 10~12: 관련 3년+, 대부분 풀타임, 적절한 보완성, 인허가/제품 출시 이력
   - 7~9: 경험 제한적, 일부 파트타임, 보완성 부족, 외부 자문 의존
   - 4~6: 경험 부족, 핵심 역할 공백(CTO 미충원), 팀 불안정
   - 1~3: 경험 매우 부족, 1인 창업, 핵심 인력 미공개
   체크: 도메인 전문성, EXIT 경험, 핵심 포지션 충원, 풀타임 여부, 보완성, 지분 구조

2. market_potential — 시장 규모 및 성장성 (15점)
   - 13~15: TAM 1조+, 연 성장률 20%+, SAM/SOM 논리적, 데이터 근거 충분, 글로벌 확장 가능
   - 10~12: TAM 5천억+, 성장률 15%+, SAM/SOM 근거 존재
   - 7~9: TAM 1천억+, 성장 시장이나 근거 부분적
   - 4~6: 시장 규모 작거나 정체, 근거 불충분
   - 1~3: 시장 불명확, 축소 시장
   체크: TAM(구체적 산출 근거), SAM 합리성, SOM 달성 경로, 성장률 수치, 구조적 동인, 글로벌 규모

3. tech_differentiation — 제품/기술 (15점)
   - 13~15: 원천기술, 특허 10건+ PCT, 다층 IP 전략, 인증(GMP/ISO) 완료, 상용 출시
   - 10~12: 핵심 기술, 특허 5건+, IP 전략, 주요 인증 진행 중, 시제품 완성
   - 7~9: 기술 개발 중, 특허 출원 중, 시제품 단계
   - 4~6: 초기 단계, 특허 미출원, 프로토타입 미완성
   - 1~3: 계획만 존재, IP 전략 없음
   체크: 특허(등록/출원/PCT), IP 전략 구조, 개발 단계, AI 자체모델 vs API, 인증 현황, 기술 리스크

4. business_model — 비즈니스 모델 (15점)
   - 13~15: 명확한 수익 모델, 검증된 단위 경제학(CAC/LTV), 높은 마진, 확장성 입증
   - 10~12: 수익 모델 정의, 마진 합리적, 단위 경제학 설계
   - 7~9: 수익 모델 존재하나 검증 부족
   - 4~6: 불명확, 마진 낮음
   - 1~3: 수익 모델 없음
   체크: 수익 구조, Gross Margin, CAC/LTV, BOM 원가, BEP 시기, 하드웨어는 장치 단가/양산/CAPEX 필수

### 정성 평가 (40점)
5. vision_scalability — 비전 및 확장성 (10점)
   - 9~10: 설득력 있는 비전, 구체적 글로벌 로드맵(국가별 순서), 제품 라인 확장, 사회적 임팩트
   - 7~8: 비전 명확, 해외 확장 계획, 제품 확장 방향
   - 5~6: 비전 존재하나 구체성 부족
   - 3~4: 비전 모호
   - 1~2: 비전 부재, 로컬 한정

6. solution_differentiation — 솔루션 차별화 (10점)
   - 9~10: 세계 최초/유일, 다층 IP 해자, 인증 기반 진입 장벽, 10x 개선
   - 7~8: 명확한 차별점, 특허 기반 모방 장벽, 3x+ 개선
   - 5~6: 차별점 존재하나 모방 용이
   - 3~4: 기존과 유사
   - 1~2: 차별점 없음
   체크: 경쟁사 분석, 구체적 개선점, 특허/인증 모방 장벽, 고객 네트워크, 임상 미완료 시 1점 유보

7. investment_fit — 투자 적합성 (10점)
   - 9~10: 요청 규모 배치 한도 이내, 포커스 정합, 멘토 매칭 최적, 포트폴리오 시너지
   - 7~8: 투자 규모 합리적, 포커스 부합
   - 5~6: 다소 불일치
   - 3~4: 불일치 심각
   - 1~2: 완전 불일치
   체크: 요청액 vs 배치 한도(N배 초과 명시), 리드/공동/브릿지 역할, 공동 투자자 현황, 밸류에이션

8. presentation — 프리젠테이션 (10점)
   - 9~10: 논리 완벽, 핵심 정보 전부(팀/시장/BM/재무/로드맵/투자조건), 수치 근거 풍부
   - 7~8: 논리 양호, 대부분 포함
   - 5~6: 구성 보통, 일부 누락
   - 3~4: 미흡, 다수 누락
   - 1~2: 부실
   누락 감점: 팀 상세 미공개, 밸류에이션 미공개, 매출 실적 미공개, 번레이트 미공개, AI 구조 미공개

## 종합 판정 기준
- 80~100: 통과 (Pass) — 2차 심사 진행 권고
- 70~79: 조건부 통과 (Conditional) — 특정 조건 확인 후 진행
- 50~69: 보류 (Hold) — 추가 자료 요청 또는 다음 배치
- 0~49: 탈락 (Decline) — 사유 명시

## 작성 원칙
- 문서에서 확인된 사실만 기재. 추측은 [미확인] 또는 [추정]으로 표기
- 구체적 수치(금액, 인원수, 특허 건수, 시장 규모 등)를 최대한 인용
- 각 평가 항목은 반드시 **근거와 함께 3~5문장**으로 상세 작성
- 강점/우려사항은 **구체적 근거 → 의미 해석 → 투자 관점 시사점** 순서로 각 3~5문장
- 딥테크: 의료기기는 인허가 경로·임상·규제 별도 평가, AI는 자체모델 vs API, 하드웨어는 BOM·양산·CAPEX
- "~할 수 있다" 대신 "~이므로 ~가 필요하다" 식 구체적 표현

## 교차 검증 원칙 (필수 — 외부 시장 조사 결과가 포함된 경우)
"외부 시장 조사 결과" 섹션이 제공되면, 반드시 모든 평가 항목에서 외부 데이터를 적극 활용하세요.

### 항목별 교차 검증 의무:
- **시장 규모 및 성장성**: 기업 IR의 TAM/SAM/SOM 수치와 외부 조사 수치를 반드시 병기 (예: "기업 IR: 3조원, 외부 조사: 2.5조원"). 성장률도 외부 전망치 인용.
- **솔루션 차별화**: 외부 검색에서 발견된 경쟁사(IR에 언급되지 않은 업체 포함)를 명시하고 차별점 비교.
- **팀 역량**: 외부 뉴스에서 발견된 대표/팀 관련 정보(수상, 언론 보도, 이전 회사)를 근거로 활용.
- **제품/기술**: 외부에서 확인된 특허 정보, 인증 현황, 기술 동향과 대조.
- **비즈니스 모델**: 동일 산업 경쟁사의 BM과 비교하여 타당성 검증.
- **투자 적합성**: 외부에서 확인된 기존 투자 이력, 밸류에이션 정보 활용.
- **비전 및 확장성**: 정부 정책(R&D 지원, 규제 변화)이 비전 실현 가능성에 미치는 영향 분석.
- **프리젠테이션**: 외부 데이터에서 확인 가능한 정보가 IR에 누락되었으면 감점 사유로 명시.

### 교차 검증 표기 형식:
- 일치: "외부 조사에서도 확인됨 (출처: ~)"
- 불일치: "[교차 검증 불일치] 기업 IR: X, 외부 조사: Y"
- 추가 발견: "[외부 추가 정보] IR에 미기재된 사항: ~"

### 검증 결과 요약:
overall_opinion에 "교차 검증 요약" 문단을 반드시 포함하세요. 외부 데이터로 확인된 사항과 불일치 사항을 종합 정리.

## 출력 형식 (반드시 JSON)
{
  "scores": {
    "team_competency": 1-5, "market_potential": 1-5, "tech_differentiation": 1-5,
    "business_model": 1-5, "vision_scalability": 1-5, "solution_differentiation": 1-5,
    "investment_fit": 1-5, "presentation": 1-5
  },
  "total_score": 0-100,
  "recommendation": "pass|conditional|hold|decline",
  "risk_level": "low|medium|high|critical",
  "one_line_summary": "2~3문장 한줄 요약",
  "eligibility_check": {
    "legal_issue": "Pass|Fail|미확인",
    "duplicate_application": "Pass|Fail|미확인",
    "antisocial_model": "Pass|Fail|미확인",
    "portfolio_conflict": "Pass|Fail|미확인"
  },
  "company_overview": {
    "company_name": "", "representative": "", "business_field": "",
    "main_product": "", "team_size": "", "investment_request": "", "government_rd": ""
  },
  "score_details": [
    {"item": "팀 역량", "max_score": 15, "score": N, "analysis": "3~5문장. 구체적 수치와 사실 기반. [미확인] 항목 명시."},
    {"item": "시장 규모 및 성장성", "max_score": 15, "score": N, "analysis": "상세 평가"},
    {"item": "제품/기술", "max_score": 15, "score": N, "analysis": "상세 평가"},
    {"item": "비즈니스 모델", "max_score": 15, "score": N, "analysis": "상세 평가"},
    {"item": "비전 및 확장성", "max_score": 10, "score": N, "analysis": "상세 평가"},
    {"item": "솔루션 차별화", "max_score": 10, "score": N, "analysis": "상세 평가"},
    {"item": "투자 적합성", "max_score": 10, "score": N, "analysis": "상세 평가"},
    {"item": "프리젠테이션", "max_score": 10, "score": N, "analysis": "상세 평가"}
  ],
  "top_strengths": ["강점 1 (3~5문장: 근거→의미→시사점)", "강점 2", "강점 3"],
  "top_concerns": ["우려사항 1 (3~5문장: 근거→리스크→완화방안)", "우려사항 2", "우려사항 3"],
  "verification_needed": ["추가 확인 1", "확인 2", "..."],
  "overall_opinion": "5~10문장. 투자 관점 핵심 판단 근거와 조건 명시. 2차 심사 진입 권고 여부 포함.",
  "summary": "3~5문장 요약 (기존 호환용)",
  "key_findings": ["핵심 발견 1", "핵심 발견 2", "..."]
}

score_details의 score는 각 항목의 만점(max_score) 대비 실점수. 예: 팀 역량 14/15.
scores의 1~5는 5점 척도 환산값. 환산: (실점수 / 만점) × 5. 예: 14/15 → 4.7/5.
total_score는 score_details의 실점수 합산 (100점 만점).""",
    "ir_analysis": """\
당신은 딥테크 스타트업 IR 자료 분석 전문가입니다.
아래 스타트업의 IR 자료와 첨부 문서를 분석하여 심층 투자 분석 보고서를 작성하세요.

## 평가 항목 (각 1~5점)
1. business_model — 비즈니스 모델 (수익구조, 확장성, 단위경제)
2. financial_health — 재무 건전성 (매출, 영업이익, 현금흐름)
3. growth_potential — 성장성 (매출성장률, 고객증가율)
4. team_strength — 팀 역량 (대표 경력, 핵심 인재)
5. ip_competitiveness — IP/기술 경쟁력 (특허, 논문, 기술 수준)

## 출력 형식 (반드시 JSON)
{
  "scores": {"business_model": N, "financial_health": N, "growth_potential": N, "team_strength": N, "ip_competitiveness": N},
  "summary": "3~5문장 종합 의견 (재무·사업모델 중심)",
  "risk_level": "low|medium|high|critical",
  "recommendation": "pass|conditional|hold|decline",
  "key_findings": ["핵심 발견 1", "핵심 발견 2", "..."]
}""",
    "risk_alert": """\
당신은 딥테크 스타트업 리스크 분석 전문가입니다.
아래 스타트업 정보와 첨부 문서를 분석하여 5대 리스크를 점검하세요.

## 리스크 항목 (각 1~5점, 높을수록 위험)
1. team_risk — 팀 리스크 (핵심 인력 이탈, 경험 부족)
2. financial_risk — 재무 리스크 (자금 소진, 부채, 매출 부재)
3. tech_risk — 기술 리스크 (기술 완성도, 경쟁기술, IP 분쟁)
4. market_risk — 시장 리스크 (시장 축소, 규제, 경쟁 심화)
5. legal_risk — 법적 리스크 (소송, 규제 위반, 결격 사유)

## 출력 형식 (반드시 JSON)
{
  "scores": {"team_risk": N, "financial_risk": N, "tech_risk": N, "market_risk": N, "legal_risk": N},
  "summary": "3~5문장 종합 리스크 평가",
  "risk_level": "low|medium|high|critical",
  "recommendation": "pass|conditional|hold|decline",
  "key_findings": ["주요 리스크 1", "주요 리스크 2", "..."]
}""",
    "market_scan": """\
당신은 시장·경쟁 분석 전문가입니다.
아래 스타트업의 산업 분야와 첨부 문서를 분석하여 시장 환경을 평가하세요.

## 평가 항목 (각 1~5점)
1. market_size — 시장 규모 (TAM/SAM/SOM)
2. growth_rate — 시장 성장률
3. competition_intensity — 경쟁 강도
4. entry_barrier — 진입 장벽
5. regulatory_environment — 규제 환경

## 출력 형식 (반드시 JSON)
{
  "scores": {"market_size": N, "growth_rate": N, "competition_intensity": N, "entry_barrier": N, "regulatory_environment": N},
  "summary": "3~5문장 시장 분석 요약",
  "risk_level": "low|medium|high|critical",
  "recommendation": "pass|conditional|hold|decline",
  "key_findings": ["시장 인사이트 1", "시장 인사이트 2", "..."]
}""",
}


def analyze_documents_with_llm(
    startup_name: str,
    startup_info: str,
    documents: list[Document],
    analysis_type: str,
) -> dict | None:
    """첨부 문서를 Claude로 분석한다. API 키 미설정이거나 문서가 없으면 None 반환."""
    if not settings.ANTHROPIC_API_KEY:
        logger.info("ANTHROPIC_API_KEY 미설정 — LLM 분석 건너뜀")
        return None

    if not documents:
        logger.info("첨부 문서 없음 — LLM 분석 건너뜀")
        return None

    system_prompt = _PROMPTS.get(analysis_type)
    if not system_prompt:
        logger.warning("알 수 없는 분석 유형: %s", analysis_type)
        return None

    # 문서 텍스트 추출
    doc_texts: list[str] = []
    for doc in documents:
        text = extract_text_from_document(doc)
        if text:
            doc_texts.append(f"### {doc.file_name} (카테고리: {doc.category})\n{text}")

    if not any(len(t) > 50 for t in doc_texts):
        logger.info("문서에서 유의미한 텍스트를 추출하지 못함")
        return None

    combined_docs = "\n\n---\n\n".join(doc_texts)
    # 전체 텍스트가 너무 길면 자르기
    if len(combined_docs) > MAX_CHARS:
        combined_docs = combined_docs[:MAX_CHARS] + "\n\n[... 이하 생략]"

    user_message = (
        f"## 스타트업: {startup_name}\n\n"
        f"{startup_info}\n\n"
        f"## 첨부 문서 ({len(documents)}건)\n\n"
        f"{combined_docs}"
    )

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        # 응답에서 JSON 파싱
        content = response.content[0].text
        # JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
        if "```json" in content:
            json_str = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            json_str = content.split("```")[1].split("```")[0].strip()
        else:
            json_str = content.strip()

        result = json.loads(json_str)

        # 필수 키 검증
        required_keys = {"scores", "summary", "risk_level", "recommendation"}
        if not required_keys.issubset(result.keys()):
            logger.warning("LLM 응답에 필수 키 누락: %s", result.keys())
            return None

        return result

    except json.JSONDecodeError:
        logger.exception("LLM 응답 JSON 파싱 실패")
        return None
    except Exception:
        logger.exception("LLM 분석 중 오류 발생")
        return None

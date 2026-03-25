"""AI 스크리닝 Celery 태스크 — 심사자 요청 시 백그라운드 실행

첨부 문서가 있으면 Claude LLM으로 분석, 없거나 API 키 미설정 시 규칙 기반 폴백.
"""

import logging
import uuid

from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2)
def run_ai_screening(self, startup_id: str, analysis_type: str, user_id: str | None = None):
    """스타트업 데이터 + 첨부 문서 기반 AI 스크리닝 실행"""
    from app.database import sync_session_maker
    from app.models.ai_analysis import AIAnalysis
    from app.models.document import Document
    from app.models.startup import Startup
    from app.models.screening import Screening
    from app.models.notification import Notification
    from app.enums import NotificationType
    from app.services.document_analyzer import analyze_documents_with_llm
    from sqlalchemy import select

    with sync_session_maker() as db:
        # 스타트업 정보 조회
        startup = db.execute(
            select(Startup).where(Startup.id == uuid.UUID(startup_id))
        ).scalar_one_or_none()

        if not startup:
            return {"error": "startup_not_found"}

        # 기존 스크리닝 결과 조회
        screenings = db.execute(
            select(Screening)
            .where(Screening.startup_id == startup.id, Screening.is_deleted == False)  # noqa: E712
            .order_by(Screening.created_at.desc())
        ).scalars().all()

        latest_screening = screenings[0] if screenings else None

        # 첨부 문서 조회
        documents = list(
            db.execute(
                select(Document)
                .where(Document.startup_id == startup.id, Document.is_deleted == False)  # noqa: E712
                .order_by(Document.created_at.desc())
            ).scalars().all()
        )

        # 스타트업 정보 요약 (LLM 컨텍스트용)
        startup_info = _build_startup_info(startup, latest_screening)

        # 웹 리서치 (시장 조사·경쟁 분석·기업 검증)
        web_research_used = False
        web_research_text = ""
        try:
            from app.services.web_research_service import research_market

            web_research_text = research_market(startup.company_name, startup.industry)
            if web_research_text:
                startup_info += f"\n\n## 외부 시장 조사 결과 (웹 검색)\n{web_research_text}"
                web_research_used = True
                logger.info("웹 리서치 완료: %s", startup.company_name)
        except Exception:
            logger.warning("웹 리서치 실패 — 문서 분석만 진행", exc_info=True)

        # LLM 문서 분석 시도
        llm_result = None
        if documents:
            logger.info(
                "LLM 문서 분석 시작: %s, 문서 %d건, 유형 %s, 웹리서치 %s",
                startup.company_name, len(documents), analysis_type,
                "포함" if web_research_used else "미포함",
            )
            llm_result = analyze_documents_with_llm(
                startup_name=startup.company_name,
                startup_info=startup_info,
                documents=documents,
                analysis_type=analysis_type,
            )

        # 규칙 기반 분석 (항상 실행 — 폴백 또는 병합용)
        if analysis_type == "screening":
            rule_result = _analyze_screening(startup, latest_screening)
        elif analysis_type == "ir_analysis":
            rule_result = _analyze_ir(startup, latest_screening)
        elif analysis_type == "risk_alert":
            rule_result = _analyze_risk(startup, latest_screening)
        elif analysis_type == "market_scan":
            rule_result = _analyze_market(startup)
        else:
            return {"error": f"unknown_analysis_type: {analysis_type}"}

        # LLM 결과가 있으면 병합, 없으면 규칙 기반 그대로
        result = _merge_results(rule_result, llm_result, len(documents))

        # 웹 리서치 원본을 scores에 저장 (보고서 생성용)
        if web_research_text and result.get("scores"):
            result["scores"]["_web_research"] = web_research_text

        # AI 분석 결과 저장
        analysis = AIAnalysis(
            startup_id=startup.id,
            analysis_type=analysis_type,
            scores=result["scores"],
            summary=result["summary"],
            risk_level=result["risk_level"],
            recommendation=result["recommendation"],
            investment_attractiveness=result["investment_attractiveness"],
        )
        db.add(analysis)
        db.flush()  # analysis.id 확보

        # 요청자에게 알림
        if user_id:
            source_label = "문서 AI 분석" if llm_result else "규칙 기반 분석"
            notification = Notification(
                user_id=uuid.UUID(user_id),
                title=f"AI 분석 완료: {startup.company_name}",
                message=(
                    f"{_type_label(analysis_type)} 분석이 완료되었습니다 ({source_label}). "
                    f"결과: {result['recommendation']}"
                ),
                notification_type=NotificationType.SYSTEM,
                related_entity_type="ai_analysis",
                related_entity_id=analysis.id,
            )
            db.add(notification)

        db.commit()
        return {
            "analysis_id": str(analysis.id),
            "startup_id": startup_id,
            "analysis_type": analysis_type,
            "recommendation": result["recommendation"],
            "llm_used": llm_result is not None,
            "documents_analyzed": len(documents),
        }


def _build_startup_info(startup, screening) -> str:
    """LLM 컨텍스트용 스타트업 정보 요약"""
    parts = [
        f"- 기업명: {startup.company_name}",
        f"- 산업: {startup.industry or '미분류'}",
        f"- 설립일: {startup.founded_date or '미입력'}",
        f"- 임직원 수: {startup.current_employees or '미입력'}명",
        f"- 연구인력: {startup.research_staff_count or 0}명",
        f"- 기술연구소: {'보유' if startup.has_research_lab else '미보유'}",
        f"- 주요 제품: {startup.main_product or '미입력'}",
    ]

    if startup.current_revenue is not None:
        parts.append(f"- 매출액: {startup.current_revenue:,.0f}원")
    if startup.operating_profit is not None:
        parts.append(f"- 영업이익: {startup.operating_profit:,.0f}원")
    if startup.total_assets is not None:
        parts.append(f"- 총자산: {startup.total_assets:,.0f}원")

    if screening:
        parts.extend([
            f"\n### 1차 스크리닝 결과",
            f"- 총점: {screening.overall_score}/35 ({screening.recommendation})",
            f"- 전일 몰입도: {screening.fulltime_commitment}/5",
            f"- 문제 명확성: {screening.problem_clarity}/5",
            f"- 기술 차별성: {screening.tech_differentiation}/5",
            f"- 시장 잠재력: {screening.market_potential}/5",
            f"- 초기 검증: {screening.initial_validation}/5",
            f"- 전략 적합성: {screening.strategy_fit}/5",
            f"- 법적 결격: {'없음' if screening.legal_clear else '있음'}",
        ])
        if screening.risk_notes:
            parts.append(f"- 리스크 노트: {screening.risk_notes}")

    return "\n".join(parts)


def _merge_results(rule_result: dict, llm_result: dict | None, doc_count: int) -> dict:
    """규칙 기반 결과와 LLM 결과를 병합한다.

    LLM 결과가 있으면:
    - scores: LLM 점수 70% + 규칙 기반 30% 가중 평균
    - summary: LLM summary + 규칙 기반 summary
    - risk_level, recommendation: LLM 우선
    - investment_attractiveness: 병합 점수 기반 재계산
    """
    if llm_result is None:
        return rule_result

    # scores 병합 (가중 평균)
    merged_scores = {}
    all_keys = set(rule_result["scores"].keys()) | set(llm_result["scores"].keys())

    for key in all_keys:
        rule_val = rule_result["scores"].get(key)
        llm_val = llm_result["scores"].get(key)

        if rule_val is not None and llm_val is not None:
            merged_scores[key] = round(llm_val * 0.7 + rule_val * 0.3, 1)
        elif llm_val is not None:
            merged_scores[key] = llm_val
        else:
            merged_scores[key] = rule_val

    # investment_attractiveness 재계산
    avg_score = sum(merged_scores.values()) / len(merged_scores) if merged_scores else 3
    attractiveness = max(1, min(5, round(avg_score)))

    # summary 병합
    key_findings = llm_result.get("key_findings", [])
    findings_text = ""
    if key_findings:
        findings_text = "\n\n📋 핵심 발견:\n" + "\n".join(f"• {f}" for f in key_findings)

    summary = (
        f"📄 문서 기반 AI 분석 ({doc_count}건 분석)\n"
        f"{llm_result['summary']}"
        f"{findings_text}\n\n"
        f"---\n"
        f"📊 규칙 기반 분석 (참고)\n"
        f"{rule_result['summary']}"
    )

    # scores JSON에 풀 보고서 데이터도 저장 (보고서 생성용)
    full_scores = dict(merged_scores)
    for extra_key in ("score_details", "top_strengths", "top_concerns",
                      "verification_needed", "overall_opinion", "company_overview",
                      "eligibility_check", "one_line_summary"):
        if extra_key in llm_result:
            full_scores[extra_key] = llm_result[extra_key]

    return {
        "scores": full_scores,
        "summary": summary,
        "risk_level": llm_result.get("risk_level", rule_result["risk_level"]),
        "recommendation": llm_result.get("recommendation", rule_result["recommendation"]),
        "investment_attractiveness": attractiveness,
    }


def _type_label(analysis_type: str) -> str:
    labels = {
        "screening": "AI 스크리닝",
        "ir_analysis": "IR 심층분석",
        "risk_alert": "리스크 스캔",
        "market_scan": "시장 분석",
    }
    return labels.get(analysis_type, analysis_type)


# ── 규칙 기반 분석 함수 (기존 유지) ──────────────────────────────

def _analyze_screening(startup, screening) -> dict:
    """기본 스크리닝 분석 — 기업 데이터 + 1차 스크리닝 결과 종합"""
    scores = {}
    total = 0

    team_score = 3
    if startup.current_employees and startup.current_employees >= 10:
        team_score = 4
    if startup.has_research_lab:
        team_score = min(team_score + 1, 5)
    scores["team_competency"] = team_score
    total += team_score

    tech_score = 3
    if screening:
        tech_score = min(max(screening.tech_differentiation, 1), 5)
    if startup.research_staff_count and startup.research_staff_count >= 5:
        tech_score = min(tech_score + 1, 5)
    scores["tech_differentiation"] = tech_score
    total += tech_score

    market_score = 3
    if screening:
        market_score = min(max(screening.market_potential, 1), 5)
    scores["market_potential"] = market_score
    total += market_score

    problem_score = 3
    if screening:
        problem_score = min(max(screening.problem_clarity, 1), 5)
    scores["problem_clarity"] = problem_score
    total += problem_score

    validation_score = 3
    if screening:
        validation_score = min(max(screening.initial_validation, 1), 5)
    if startup.current_revenue and startup.current_revenue > 0:
        validation_score = min(validation_score + 1, 5)
    scores["initial_validation"] = validation_score
    total += validation_score

    strategy_score = 3
    if screening:
        strategy_score = min(max(screening.strategy_fit, 1), 5)
    scores["strategy_fit"] = strategy_score
    total += strategy_score

    avg = total / 6
    attractiveness = round(avg)

    if avg >= 4.0:
        recommendation = "pass"
        risk_level = "low"
    elif avg >= 3.0:
        recommendation = "conditional"
        risk_level = "medium"
    elif avg >= 2.0:
        recommendation = "hold"
        risk_level = "high"
    else:
        recommendation = "decline"
        risk_level = "critical"

    summary_parts = [
        f"AI 스크리닝 결과: 종합 {avg:.1f}/5.0",
        f"팀 역량 {team_score}/5, 기술 차별성 {tech_score}/5, 시장 잠재력 {market_score}/5",
        f"문제 명확성 {problem_score}/5, 초기 검증 {validation_score}/5, 전략 적합성 {strategy_score}/5",
    ]

    if screening:
        summary_parts.append(f"1차 스크리닝 점수 {screening.overall_score}/35 ({screening.recommendation})")
        if screening.risk_notes:
            summary_parts.append(f"리스크 노트: {screening.risk_notes}")

    return {
        "scores": scores,
        "summary": "\n".join(summary_parts),
        "risk_level": risk_level,
        "recommendation": recommendation,
        "investment_attractiveness": attractiveness,
    }


def _analyze_ir(startup, screening) -> dict:
    """IR 자료 기반 심층 분석"""
    scores = {}

    bm_score = 3
    if startup.main_product:
        bm_score = 4
    scores["business_model"] = bm_score

    fin_score = 3
    if startup.current_revenue and startup.current_revenue > 0:
        fin_score = 4
    if startup.operating_profit and startup.operating_profit > 0:
        fin_score = 5
    scores["financial_health"] = fin_score

    growth_score = 3
    if startup.total_assets and startup.total_assets > 1_000_000_000:
        growth_score = 4
    scores["growth_potential"] = growth_score

    team_score = 3
    if startup.current_employees and startup.current_employees >= 10:
        team_score = 4
    if startup.has_research_lab:
        team_score = min(team_score + 1, 5)
    scores["team_strength"] = team_score

    ip_score = 3
    if startup.has_research_lab and startup.research_staff_count and startup.research_staff_count >= 3:
        ip_score = 4
    scores["ip_competitiveness"] = ip_score

    avg = sum(scores.values()) / len(scores)
    attractiveness = round(avg)

    if avg >= 4.0:
        recommendation, risk_level = "pass", "low"
    elif avg >= 3.0:
        recommendation, risk_level = "conditional", "medium"
    else:
        recommendation, risk_level = "hold", "high"

    summary = (
        f"IR 심층분석 결과: 종합 {avg:.1f}/5.0\n"
        f"비즈니스 모델 {bm_score}/5, 재무 건전성 {fin_score}/5, 성장성 {growth_score}/5\n"
        f"팀 역량 {team_score}/5, IP 경쟁력 {ip_score}/5\n"
        f"기업: {startup.company_name} ({startup.industry})"
    )

    return {
        "scores": scores,
        "summary": summary,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "investment_attractiveness": attractiveness,
    }


def _analyze_risk(startup, screening) -> dict:
    """리스크 스캔"""
    risks = []
    risk_scores = {}

    team_risk = 2
    if not startup.current_employees or startup.current_employees < 3:
        team_risk = 4
        risks.append("핵심 인력 부족 리스크 (3명 미만)")
    risk_scores["team_risk"] = team_risk

    fin_risk = 2
    if not startup.current_revenue or startup.current_revenue <= 0:
        fin_risk = 3
        risks.append("매출 없음 — 수익 모델 미검증")
    if startup.operating_profit and startup.operating_profit < 0:
        fin_risk = 4
        risks.append("영업손실 발생 중")
    risk_scores["financial_risk"] = fin_risk

    tech_risk = 2
    if not startup.has_research_lab:
        tech_risk = 3
        risks.append("기술연구소 미보유")
    risk_scores["tech_risk"] = tech_risk

    market_risk = 2
    risk_scores["market_risk"] = market_risk

    legal_risk = 1
    if screening and not screening.legal_clear:
        legal_risk = 4
        risks.append("법적 결격 사유 존재 가능")
    risk_scores["legal_risk"] = legal_risk

    avg_risk = sum(risk_scores.values()) / len(risk_scores)

    if avg_risk >= 3.5:
        risk_level = "high"
        recommendation = "hold"
    elif avg_risk >= 2.5:
        risk_level = "medium"
        recommendation = "conditional"
    else:
        risk_level = "low"
        recommendation = "pass"

    summary = f"리스크 스캔 결과: 평균 리스크 {avg_risk:.1f}/5.0\n"
    if risks:
        summary += "주요 리스크:\n" + "\n".join(f"- {r}" for r in risks)
    else:
        summary += "중대한 리스크 요인이 발견되지 않았습니다."

    return {
        "scores": risk_scores,
        "summary": summary,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "investment_attractiveness": max(1, 5 - round(avg_risk)),
    }


def _analyze_market(startup) -> dict:
    """시장/경쟁 분석"""
    scores = {
        "market_size": 3,
        "growth_rate": 3,
        "competition_intensity": 3,
        "entry_barrier": 3,
        "regulatory_environment": 3,
    }

    industry = (startup.industry or "").lower()
    if "ai" in industry or "딥테크" in industry:
        scores["market_size"] = 4
        scores["growth_rate"] = 5
        scores["competition_intensity"] = 4
    elif "바이오" in industry or "헬스" in industry:
        scores["market_size"] = 4
        scores["entry_barrier"] = 4
        scores["regulatory_environment"] = 4
    elif "반도체" in industry or "소재" in industry:
        scores["entry_barrier"] = 5
        scores["market_size"] = 4

    avg = sum(scores.values()) / len(scores)

    summary = (
        f"시장 분석 결과: 종합 {avg:.1f}/5.0\n"
        f"시장 규모 {scores['market_size']}/5, 성장률 {scores['growth_rate']}/5\n"
        f"경쟁 강도 {scores['competition_intensity']}/5, 진입 장벽 {scores['entry_barrier']}/5\n"
        f"규제 환경 {scores['regulatory_environment']}/5\n"
        f"산업: {startup.industry}"
    )

    return {
        "scores": scores,
        "summary": summary,
        "risk_level": "medium" if avg < 3.5 else "low",
        "recommendation": "pass" if avg >= 3.5 else "conditional",
        "investment_attractiveness": round(avg),
    }

"""
AI 평가 Celery 태스크 — Claude fallback 전용

직접 파싱으로 점수를 추출할 수 없는 경우에만 비동기 실행.
대부분의 lsa 보고서는 동기 파싱으로 처리되므로 이 태스크는 드물게 호출됨.
"""

import logging
import uuid

from sqlalchemy import select

from app.tasks import celery_app
from app.database import sync_session_maker

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.ai_evaluation.run_ai_evaluation",
    bind=True,
    max_retries=0,
    soft_time_limit=150,
    time_limit=180,
    rate_limit="1/m",  # Claude API pool 고갈 방지: 분당 1건
)
def run_ai_evaluation(self, evaluation_id: str) -> dict:
    """AIAnalysis 레코드의 Claude fallback 평가 실행.

    Flow:
    1. AIAnalysis 레코드 로드 (status=pending)
    2. 연결된 Document에서 보고서 내용 로드
    3. ai_report_parser로 is_deeptech 판별
    4. ai_evaluator로 Claude 평가
    5. 결과 저장 (scores, recommendation, summary)
    6. 에러 시 recommendation=None + summary에 에러 메시지
    """
    from app.models.ai_analysis import AIAnalysis
    from app.models.document import Document
    from app.services.ai_report_parser import is_deeptech
    from app.services.ai_evaluator import evaluate_reports, calculate_verdict

    db = sync_session_maker()
    try:
        # 1. AIAnalysis 로드
        analysis = db.execute(
            select(AIAnalysis).where(AIAnalysis.id == uuid.UUID(evaluation_id))
        ).scalar_one_or_none()

        if analysis is None:
            logger.error("AIAnalysis %s 찾을 수 없음", evaluation_id)
            return {"status": "error", "message": "분석 레코드를 찾을 수 없습니다."}

        # 2. 연결된 문서 로드
        docs = db.execute(
            select(Document).where(
                Document.startup_id == analysis.startup_id,
                Document.category == "ai_evaluation",
                Document.is_deleted == False,  # noqa: E712
            ).order_by(Document.created_at.desc())
        ).scalars().all()

        if not docs:
            analysis.summary = "평가 실패: 보고서 파일을 찾을 수 없습니다."
            analysis.recommendation = None
            db.commit()
            return {"status": "error", "message": "보고서 없음"}

        # 3. 보고서 내용 읽기
        report_contents: list[str] = []
        for doc in docs:
            try:
                from pathlib import Path
                path = Path(doc.file_path)
                if path.exists() and path.suffix.lower() == ".md":
                    report_contents.append(path.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("파일 읽기 실패 %s: %s", doc.file_path, exc)

        if not report_contents:
            analysis.summary = "평가 실패: 읽을 수 있는 보고서가 없습니다."
            analysis.recommendation = None
            db.commit()
            return {"status": "error", "message": "읽기 가능한 보고서 없음"}

        # 4. 딥테크 여부 판별
        combined = "\n\n".join(report_contents)
        deeptech = is_deeptech(combined)

        # 5. Claude 평가
        try:
            result = evaluate_reports(report_contents, deeptech)
        except RuntimeError as exc:
            logger.error("Claude 평가 실패: %s", exc)
            analysis.summary = f"AI 평가 실패: {exc}"
            analysis.recommendation = None
            db.commit()
            return {"status": "error", "message": str(exc)}

        # 6. 결과 저장
        scores_data = {
            "items": result.get("items", {}),
            "total": result.get("total"),
            "is_deeptech": deeptech,
        }
        analysis.scores = scores_data
        analysis.summary = result.get("summary", "")
        analysis.source = "claude_evaluation"

        total = result.get("total")
        if total is not None:
            analysis.recommendation = calculate_verdict(total)
        else:
            analysis.recommendation = None

        db.commit()
        logger.info(
            "AI 평가 완료: %s (총점: %s, 판정: %s)",
            evaluation_id,
            total,
            analysis.recommendation,
        )
        return {
            "status": "completed",
            "total": total,
            "recommendation": analysis.recommendation,
        }

    except Exception as exc:
        logger.exception("AI 평가 태스크 예외: %s", exc)
        db.rollback()
        try:
            analysis = db.execute(
                select(AIAnalysis).where(
                    AIAnalysis.id == uuid.UUID(evaluation_id)
                )
            ).scalar_one_or_none()
            if analysis:
                analysis.summary = f"AI 평가 중 오류 발생: {exc}"
                analysis.recommendation = None
                db.commit()
        except Exception:
            pass
        return {"status": "error", "message": str(exc)}
    finally:
        db.close()

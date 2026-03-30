"""AI 분석 라우터 — /api/v1/ai-analysis/"""

import uuid
from typing import Annotated, Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.ai_analysis import AIAnalysis
from app.models.startup import Startup
from app.models.user import User
from app.middleware.rbac import require_permission
from app.schemas.ai_analysis import (
    AIAnalysisCreate,
    AIAnalysisResponse,
    EvaluationScores,
    EvaluationScoreItem,
    EvaluationStatusResponse,
    EvaluationUploadResponse,
)
from app.services import ai_analysis_service, activity_log_service
from app.services.report_generator import generate_pdf, generate_docx

router = APIRouter()

# 허용 파일 확장자
_ALLOWED_EXTENSIONS = {".md", ".pdf"}
_MAX_FILES = 6


# --- AI 평가 (하이브리드) ---


@router.post("/evaluation/upload", status_code=200)
@router.post("/evaluation/upload/", status_code=200, include_in_schema=False)
async def upload_evaluation_reports(
    startup_id: uuid.UUID = Query(..., description="평가 대상 스타트업 ID"),
    files: list[UploadFile] = File(..., description="lsa 보고서 파일 (MD/PDF, 최대 6개)"),
    is_deeptech: bool | None = Query(None, description="딥테크 여부 (None=자동감지)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("startup", "write")),
) -> EvaluationUploadResponse:
    """lsa 보고서 업로드 → 하이브리드 평가.

    - 직접 파싱 성공 시: 200 OK + 즉시 결과
    - 직접 파싱 실패 시: 200 (status=pending) + Celery 비동기 처리
    - 재업로드 시 새 AIAnalysis 레코드 생성 (기존 보존)
    """
    # 파일 검증
    if len(files) > _MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"최대 {_MAX_FILES}개 파일만 업로드 가능합니다.",
        )

    for f in files:
        if f.filename:
            ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
            if f".{ext}" not in _ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"허용되지 않는 파일 형식입니다: {f.filename} (MD, PDF만 가능)",
                )

    # 스타트업 존재 확인
    result = await db.execute(
        select(Startup).where(Startup.id == startup_id, Startup.is_deleted == False)  # noqa: E712
    )
    startup = result.scalar_one_or_none()
    if startup is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="스타트업을 찾을 수 없습니다.",
        )

    # 파일 저장 + Document 생성
    from app.services.document_service import save_file
    from app.models.document import Document

    report_contents: list[str] = []
    for f in files:
        file_path, file_size = await save_file(f)
        # 파일명 정리: 경로 구분자 제거 (Path Traversal 방지)
        safe_name = (f.filename or "report.md").replace("/", "_").replace("\\", "_")
        doc = Document(
            startup_id=startup_id,
            category="ai_evaluation",
            file_name=safe_name,
            file_path=file_path,
            file_size=file_size,
            uploaded_by=current_user.id,
        )
        db.add(doc)

        # MD 파일이면 내용 읽기 (UPLOAD_DIR 내 파일만)
        if safe_name.lower().endswith(".md"):
            from pathlib import Path as _Path
            from app.config import settings as _settings
            _fp = _Path(file_path).resolve()
            _upload_root = _Path(_settings.UPLOAD_DIR).resolve()
            if str(_fp).startswith(str(_upload_root)):
                try:
                    content = _fp.read_text(encoding="utf-8")
                    report_contents.append(content)
                except Exception:
                    pass

    await db.flush()

    # 직접 파싱 시도 (하이브리드 분기)
    if report_contents:
        from app.services.ai_report_parser import (
            has_structured_scores,
            extract_all_scores,
            is_deeptech as detect_deeptech,
        )
        from app.services.ai_evaluator import calculate_verdict

        combined = "\n\n".join(report_contents)
        if has_structured_scores(combined):
            # 동기 경로: 직접 파싱 성공
            deeptech = is_deeptech if is_deeptech is not None else detect_deeptech(combined)
            scores_data = extract_all_scores(combined, deeptech)

            total = scores_data.get("total")
            recommendation = calculate_verdict(total) if total is not None else None
            decision_kr = scores_data.get("decision")

            # AIAnalysis 레코드 생성
            analysis = AIAnalysis(
                startup_id=startup_id,
                analysis_type="screening",
                scores={
                    "items": scores_data.get("items", {}),
                    "total": total,
                    "is_deeptech": deeptech,
                },
                summary=f"직접 파싱 완료 (총점: {total}, 판정: {decision_kr or recommendation})",
                recommendation=recommendation,
                source="lsa_report",
            )
            db.add(analysis)
            await db.flush()
            await db.refresh(analysis)

            # Pydantic 검증된 scores
            validated_items = {}
            for key, item in scores_data.get("items", {}).items():
                try:
                    validated_items[key] = EvaluationScoreItem(
                        score=item["score"],
                        max=item["max"],
                        rationale=item.get("rationale", ""),
                    )
                except Exception:
                    pass

            return EvaluationUploadResponse(
                evaluation_id=analysis.id,
                status="completed",
                scores=EvaluationScores(
                    items=validated_items,
                    total=total,
                    is_deeptech=deeptech,
                ),
                recommendation=recommendation,
                summary=analysis.summary,
            )

    # 비동기 경로: Claude fallback
    analysis = AIAnalysis(
        startup_id=startup_id,
        analysis_type="screening",
        scores=None,
        summary="AI 평가 대기 중...",
        recommendation=None,
        source="claude_evaluation",
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    # Celery task 큐
    from app.tasks.ai_evaluation import run_ai_evaluation
    run_ai_evaluation.delay(str(analysis.id))

    return EvaluationUploadResponse(
        evaluation_id=analysis.id,
        status="pending",
    )


@router.get("/evaluation/{evaluation_id}/status", response_model=EvaluationStatusResponse)
async def get_evaluation_status(
    evaluation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("startup", "read")),
) -> EvaluationStatusResponse:
    """AI 평가 상태 조회 (비동기 polling 용).

    - pending: 평가 진행 중
    - completed: 평가 완료
    - error: 평가 실패
    """
    analysis = await ai_analysis_service.get_by_id(db, evaluation_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 AI 평가를 찾을 수 없습니다.",
        )

    # 상태 판별
    if analysis.recommendation is not None and analysis.scores is not None:
        eval_status = "completed"
    elif analysis.summary and ("실패" in analysis.summary or "오류" in analysis.summary):
        eval_status = "error"
    else:
        eval_status = "pending"

    # scores JSON → Pydantic 검증
    validated_scores = None
    if analysis.scores and isinstance(analysis.scores, dict):
        try:
            validated_items = {}
            for key, item in analysis.scores.get("items", {}).items():
                validated_items[key] = EvaluationScoreItem(
                    score=item.get("score", 0),
                    max=item.get("max", 0),
                    rationale=item.get("rationale", ""),
                )
            validated_scores = EvaluationScores(
                items=validated_items,
                total=analysis.scores.get("total"),
                is_deeptech=analysis.scores.get("is_deeptech", False),
            )
        except Exception:
            pass

    return EvaluationStatusResponse(
        evaluation_id=analysis.id,
        status=eval_status,
        scores=validated_scores,
        recommendation=analysis.recommendation,
        summary=analysis.summary,
    )


# --- 기존 엔드포인트 ---


@router.get("", response_model=list[AIAnalysisResponse])
@router.get("/", response_model=list[AIAnalysisResponse], include_in_schema=False)
async def list_analyses(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
    startup_id: uuid.UUID | None = None,
    analysis_type: str | None = None,
) -> list[AIAnalysisResponse]:
    """AI 분석 결과 목록 조회"""
    items = await ai_analysis_service.get_list(db, startup_id, analysis_type)
    return [AIAnalysisResponse.model_validate(a) for a in items]


@router.get("/{analysis_id}", response_model=AIAnalysisResponse)
async def get_analysis(
    analysis_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
) -> AIAnalysisResponse:
    """AI 분석 결과 상세 조회"""
    analysis = await ai_analysis_service.get_by_id(db, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 AI 분석 결과를 찾을 수 없습니다.",
        )
    return AIAnalysisResponse.model_validate(analysis)


@router.get("/{analysis_id}/download")
async def download_report(
    analysis_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("startup", "read"))],
    format: str = Query("pdf", regex="^(pdf|docx)$"),
) -> Response:
    """AI 분석 보고서를 PDF 또는 DOCX로 다운로드"""
    analysis = await ai_analysis_service.get_by_id(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="해당 AI 분석 결과를 찾을 수 없습니다.")

    result = await db.execute(select(Startup).where(Startup.id == analysis.startup_id))
    startup = result.scalar_one_or_none()
    if startup is None:
        raise HTTPException(status_code=404, detail="스타트업 정보를 찾을 수 없습니다.")

    type_label = {
        "screening": "AI_스크리닝",
        "ir_analysis": "IR_심층분석",
        "risk_alert": "리스크_스캔",
        "market_scan": "시장_분석",
    }.get(analysis.analysis_type, analysis.analysis_type)
    date_str = analysis.created_at.strftime("%Y%m%d") if analysis.created_at else ""
    base_name = f"{type_label}_보고서_{startup.company_name}_{date_str}"

    if format == "docx":
        content = generate_docx(analysis, startup)
        filename = f"{base_name}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        content = generate_pdf(analysis, startup)
        filename = f"{base_name}.pdf"
        media_type = "application/pdf"

    encoded_filename = quote(filename)
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}',
        },
    )


@router.post("/", response_model=AIAnalysisResponse, status_code=201)
async def create_analysis(
    data: AIAnalysisCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("startup", "write"))],
) -> AIAnalysisResponse:
    """AI 분석 결과 저장 (에이전트에서 호출)"""
    analysis = await ai_analysis_service.create(db, data, user_id=current_user.id)
    return AIAnalysisResponse.model_validate(analysis)


class EvaluationVerdictUpdate(BaseModel):
    """심사자가 AI 평가 결과에 판정을 확정하는 요청"""
    scores: dict[str, Any] | None = None
    recommendation: str | None = None
    summary: str | None = None


@router.patch("/{analysis_id}", response_model=AIAnalysisResponse)
async def update_analysis_verdict(
    analysis_id: uuid.UUID,
    data: EvaluationVerdictUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("startup", "write"))],
) -> AIAnalysisResponse:
    """AI 평가 결과에 심사자 판정 확정 (점수 수정, 판정, 의견)"""
    analysis = await ai_analysis_service.get_by_id(db, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 AI 분석 결과를 찾을 수 없습니다.",
        )
    if data.scores is not None:
        analysis.scores = data.scores
    if data.recommendation is not None:
        analysis.recommendation = data.recommendation
    if data.summary is not None:
        analysis.summary = data.summary
    await db.flush()
    await db.refresh(analysis)
    await activity_log_service.log(
        db,
        user_id=current_user.id,
        action_type="ai_evaluation_verdict",
        action_detail={
            "analysis_id": str(analysis_id),
            "recommendation": data.recommendation,
        },
        startup_id=analysis.startup_id,
    )
    return AIAnalysisResponse.model_validate(analysis)

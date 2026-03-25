"""AI 분석 라우터 — /api/v1/ai-analysis/"""

import uuid
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.startup import Startup
from app.models.user import User
from app.middleware.rbac import require_permission
from app.schemas.ai_analysis import AIAnalysisCreate, AIAnalysisResponse
from app.services import ai_analysis_service
from app.services.report_generator import generate_pdf, generate_docx

router = APIRouter()


class AITriggerRequest(BaseModel):
    startup_id: uuid.UUID
    analysis_type: str = "screening"


class AITriggerResponse(BaseModel):
    task_id: str
    message: str


@router.post("/trigger", response_model=AITriggerResponse)
@router.post("/trigger/", response_model=AITriggerResponse, include_in_schema=False)
async def trigger_ai_analysis(
    data: AITriggerRequest,
    current_user: Annotated[User, Depends(require_permission("startup", "write"))],
) -> AITriggerResponse:
    """AI 분석 백그라운드 실행 트리거 (심사자가 수동 요청)"""
    from app.tasks.ai_screening import run_ai_screening

    task = run_ai_screening.delay(
        str(data.startup_id),
        data.analysis_type,
        str(current_user.id),
    )
    return AITriggerResponse(
        task_id=task.id,
        message=f"AI 분석이 시작되었습니다. (유형: {data.analysis_type})",
    )


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

    # 스타트업 정보 조회
    result = await db.execute(select(Startup).where(Startup.id == analysis.startup_id))
    startup = result.scalar_one_or_none()
    if startup is None:
        raise HTTPException(status_code=404, detail="스타트업 정보를 찾을 수 없습니다.")

    type_label = {"screening": "AI_스크리닝", "ir_analysis": "IR_심층분석", "risk_alert": "리스크_스캔", "market_scan": "시장_분석"}.get(analysis.analysis_type, analysis.analysis_type)
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

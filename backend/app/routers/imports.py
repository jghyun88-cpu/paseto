"""CSV 임포트 라우터 — 스타트업 일괄 등록"""

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.services import import_service

router = APIRouter()


@router.post("/startups")
async def import_startups(
    file: Annotated[UploadFile, File(description="CSV 파일")],
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """CSV 파일에서 스타트업 일괄 임포트

    - 필수 컬럼: 기업명, 대표자, 산업분류
    - 선택 컬럼: 설립일, 소재지, 연락처, 이메일, 소싱채널, 현재단계, 발굴자
    - 중복 기준: (기업명 + 대표자 + 설립일) → upsert
    - 실패 행은 에러 메시지와 함께 반환
    """
    content = await file.read()

    # 인코딩 시도 (UTF-8 → CP949)
    try:
        csv_text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_text = content.decode("cp949")

    result = await import_service.import_csv(db, csv_text, current_user)
    await db.commit()

    return {
        "message": f"임포트 완료: 생성 {result.created}건, 업데이트 {result.updated}건, 실패 {len(result.errors)}건",
        "created": result.created,
        "updated": result.updated,
        "errors": result.errors,
        "total": result.total,
    }

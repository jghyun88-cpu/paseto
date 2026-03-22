"""문서 CRUD 라우터 — /api/v1/documents/"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.errors import document_not_found
from app.middleware.auth import get_current_active_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.services import document_service

router = APIRouter()


@router.get("", response_model=DocumentListResponse)
@router.get("/", response_model=DocumentListResponse, include_in_schema=False)
async def list_documents(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("document", "read"))],
    startup_id: uuid.UUID | None = None,
    category: str | None = None,
) -> DocumentListResponse:
    """스타트업별 문서 목록 조회"""
    if startup_id is None:
        return DocumentListResponse(data=[], total=0)
    items, total = await document_service.get_by_startup(db, startup_id, category)
    return DocumentListResponse(
        data=[DocumentResponse.model_validate(d) for d in items],
        total=total,
    )


@router.post("", response_model=DocumentResponse, status_code=201)
@router.post("/", response_model=DocumentResponse, status_code=201, include_in_schema=False)
async def upload_document(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("document", "write"))],
    file: UploadFile = File(...),
    startup_id: uuid.UUID = Form(...),
    category: str = Form("other"),
) -> DocumentResponse:
    """파일 업로드"""
    # 파일 크기 제한
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        from app.errors import file_too_large
        raise file_too_large()
    await file.seek(0)

    doc = await document_service.create(db, file, startup_id, category, current_user)
    return DocumentResponse.model_validate(doc)


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_permission("document", "read"))],
) -> FileResponse:
    """파일 다운로드"""
    doc = await document_service.get_by_id(db, doc_id)
    if doc is None:
        raise document_not_found()
    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type or "application/octet-stream",
    )


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("document", "write"))],
) -> None:
    """문서 소프트 삭제"""
    doc = await document_service.get_by_id(db, doc_id)
    if doc is None:
        raise document_not_found()
    await document_service.soft_delete(db, doc, current_user)

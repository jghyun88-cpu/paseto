"""문서 서비스 — 업로드 + CRUD + ActivityLog"""

import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import settings
from app.models.document import Document
from app.models.user import User
from app.services import activity_log_service


async def save_file(file: UploadFile) -> tuple[str, int]:
    """파일을 디스크에 저장하고 (경로, 크기) 반환"""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "file").suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_name

    content = await file.read()
    file_path.write_bytes(content)

    return str(file_path), len(content)


async def create(
    db: AsyncSession,
    file: UploadFile,
    startup_id: uuid.UUID,
    category: str,
    user: User,
) -> Document:
    """파일 업로드 + Document 레코드 생성"""
    file_path, file_size = await save_file(file)

    doc = Document(
        startup_id=startup_id,
        category=category,
        file_name=file.filename or "untitled",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_by=user.id,
    )
    db.add(doc)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "document", "category": category, "file_name": doc.file_name},
        startup_id=startup_id,
    )

    return await get_by_id(db, doc.id)  # type: ignore[arg-type]


async def get_by_startup(
    db: AsyncSession,
    startup_id: uuid.UUID,
    category: str | None = None,
) -> tuple[list[Document], int]:
    """스타트업별 문서 목록 + 총 개수"""
    query = select(Document).where(
        Document.startup_id == startup_id,
        Document.is_deleted == False,  # noqa: E712
    )
    if category:
        query = query.where(Document.category == category)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    items_query = (
        query.options(joinedload(Document.uploader))
        .order_by(Document.created_at.desc())
    )
    result = await db.execute(items_query)
    items = list(result.unique().scalars().all())

    return items, total


async def get_by_id(db: AsyncSession, doc_id: uuid.UUID) -> Document | None:
    """ID로 문서 조회 (soft delete 제외)"""
    result = await db.execute(
        select(Document)
        .options(joinedload(Document.uploader))
        .where(Document.id == doc_id, Document.is_deleted == False)  # noqa: E712
    )
    return result.unique().scalar_one_or_none()


async def soft_delete(db: AsyncSession, doc: Document, user: User) -> None:
    """문서 소프트 삭제"""
    doc.is_deleted = True
    db.add(doc)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "delete",
        {"entity": "document", "file_name": doc.file_name},
        startup_id=doc.startup_id,
    )

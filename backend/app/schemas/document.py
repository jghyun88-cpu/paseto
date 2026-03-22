"""문서 관련 Pydantic 스키마"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


class DocumentResponse(BaseModel):
    """문서 응답"""
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="wrap")
    @classmethod
    def extract_uploader_name(cls, data: object, handler: object) -> "DocumentResponse":
        """ORM 객체에서 uploader_name 추출"""
        uploader_name = None
        if hasattr(data, "uploader") and data.uploader is not None:
            uploader_name = data.uploader.name
        instance = handler(data)  # type: ignore[operator]
        if uploader_name is not None:
            instance.uploader_name = uploader_name
        return instance

    id: uuid.UUID
    startup_id: uuid.UUID | None
    category: str
    file_name: str
    file_size: int | None
    mime_type: str | None
    uploaded_by: uuid.UUID
    uploader_name: str | None = None
    created_at: datetime


class DocumentListResponse(BaseModel):
    """문서 목록 페이지네이션 응답"""
    data: list[DocumentResponse]
    total: int

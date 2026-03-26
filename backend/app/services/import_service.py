"""CSV 임포트 서비스 — 엑셀 데이터 → 스타트업 생성/업서트"""

import csv
import io
import logging
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DealStage, SourcingChannel
from app.models.startup import Startup
from app.models.user import User
from app.services import activity_log_service

logger = logging.getLogger(__name__)

# CSV 허용 컬럼 → Startup 모델 매핑
COLUMN_MAP: dict[str, str] = {
    "기업명": "company_name",
    "대표자": "ceo_name",
    "산업분류": "industry",
    "설립일": "founded_date",
    "소재지": "location",
    "연락처": "contact_phone",
    "이메일": "contact_email",
    "소싱채널": "sourcing_channel",
    "현재단계": "stage",
    "발굴자": "referrer",
    # 영문 컬럼명도 허용
    "company_name": "company_name",
    "ceo_name": "ceo_name",
    "industry": "industry",
    "founded_date": "founded_date",
    "location": "location",
    "contact_phone": "contact_phone",
    "contact_email": "contact_email",
    "sourcing_channel": "sourcing_channel",
    "stage": "stage",
    "referrer": "referrer",
}

REQUIRED_FIELDS = {"company_name", "ceo_name", "industry"}

# 소싱채널 한글 → Enum 매핑
CHANNEL_MAP: dict[str, SourcingChannel] = {
    "대학연구실": SourcingChannel.UNIVERSITY_LAB,
    "기업OI": SourcingChannel.CORPORATE_OI,
    "포트폴리오추천": SourcingChannel.PORTFOLIO_REFERRAL,
    "VC/CVC/엔젤": SourcingChannel.VC_CVC_ANGEL,
    "공공프로그램": SourcingChannel.PUBLIC_PROGRAM,
    "경진대회": SourcingChannel.COMPETITION_FORUM,
    "온라인지원": SourcingChannel.ONLINE_APPLICATION,
    "직접발굴": SourcingChannel.DIRECT_OUTREACH,
    "기술박람회": SourcingChannel.TECH_EXPO,
}


class ImportResult:
    def __init__(self) -> None:
        self.created = 0
        self.updated = 0
        self.errors: list[dict] = []

    @property
    def total(self) -> int:
        return self.created + self.updated + len(self.errors)


async def import_csv(
    db: AsyncSession,
    csv_content: str,
    user: User,
) -> ImportResult:
    """CSV 문자열을 파싱하여 스타트업 생성/업서트. 행 단위 부분 커밋."""
    result = ImportResult()
    reader = csv.DictReader(io.StringIO(csv_content))

    for row_num, raw_row in enumerate(reader, start=2):  # 2부터 (헤더=1)
        try:
            mapped = _map_row(raw_row)
            _validate_required(mapped, row_num)
            await _upsert_startup(db, mapped, user, result)
        except ValueError as e:
            result.errors.append({"row": row_num, "error": str(e), "data": raw_row})
        except Exception as e:
            logger.error("임포트 행 %d 처리 실패: %s", row_num, e, exc_info=True)
            result.errors.append({"row": row_num, "error": f"처리 오류: {e}", "data": raw_row})

    await db.flush()

    # Activity Log
    await activity_log_service.log(
        db, user.id, "import",
        {
            "entity": "startup",
            "created": result.created,
            "updated": result.updated,
            "errors": len(result.errors),
        },
    )

    return result


def _map_row(raw_row: dict) -> dict:
    """CSV 행의 한글/영문 컬럼명을 모델 필드명으로 매핑"""
    mapped: dict = {}
    for csv_col, value in raw_row.items():
        csv_col = csv_col.strip()
        field = COLUMN_MAP.get(csv_col)
        if field and value and value.strip():
            mapped[field] = value.strip()
    return mapped


def _validate_required(mapped: dict, row_num: int) -> None:
    """필수 필드 검증"""
    missing = REQUIRED_FIELDS - mapped.keys()
    if missing:
        raise ValueError(f"{row_num}행: 필수 필드 누락 — {', '.join(missing)}")


async def _upsert_startup(
    db: AsyncSession,
    mapped: dict,
    user: User,
    result: ImportResult,
) -> None:
    """(기업명 + 대표자 + 설립일) 기준 upsert"""
    company_name = mapped["company_name"]
    ceo_name = mapped["ceo_name"]
    founded_date = _parse_date(mapped.get("founded_date"))

    # 기존 레코드 탐색
    query = (
        select(Startup)
        .where(
            Startup.company_name == company_name,
            Startup.ceo_name == ceo_name,
            Startup.is_deleted == False,  # noqa: E712
        )
    )
    if founded_date:
        query = query.where(Startup.founded_date == founded_date)

    existing = (await db.execute(query)).scalar_one_or_none()

    if existing:
        # 업데이트: 새 필드만 덮어쓰기
        for field, value in mapped.items():
            if field in ("company_name", "ceo_name"):
                continue
            if field == "founded_date":
                value = founded_date
            elif field == "sourcing_channel":
                value = _parse_channel(value)
            if value is not None:
                setattr(existing, field, value)
        result.updated += 1
    else:
        # 신규 생성
        startup = Startup(
            company_name=company_name,
            ceo_name=ceo_name,
            industry=mapped.get("industry", "미분류"),
            stage=mapped.get("stage", "Pre-seed"),
            one_liner=mapped.get("one_liner", f"{company_name} — 임포트됨"),
            sourcing_channel=_parse_channel(mapped.get("sourcing_channel")),
            current_deal_stage=DealStage.INBOUND,
            founded_date=founded_date,
            location=mapped.get("location"),
            contact_phone=mapped.get("contact_phone"),
            contact_email=mapped.get("contact_email"),
            referrer=mapped.get("referrer"),
            assigned_manager_id=user.id,
        )
        db.add(startup)
        result.created += 1


def _parse_date(val: str | None) -> date | None:
    """다양한 날짜 형식 파싱"""
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return date.fromisoformat(val) if fmt == "%Y-%m-%d" else date(*map(int, val.replace(".", "-").replace("/", "-").split("-")[:3]))
        except (ValueError, TypeError):
            continue
    return None


def _parse_channel(val: str | None) -> SourcingChannel:
    """한글 → SourcingChannel Enum"""
    if not val:
        return SourcingChannel.DIRECT_OUTREACH
    # 한글 매핑 시도
    channel = CHANNEL_MAP.get(val)
    if channel:
        return channel
    # Enum 값 직접 시도
    try:
        return SourcingChannel(val)
    except ValueError:
        return SourcingChannel.DIRECT_OUTREACH

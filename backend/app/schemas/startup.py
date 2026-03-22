"""스타트업 관련 Pydantic 스키마"""

import re
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.utils.validators import (
    validate_business_registration_number,
    validate_corporate_number,
)


class StartupCreate(BaseModel):
    """스타트업 생성 요청 — BHV 기업정보 + SRC-F01 양식 기반"""
    # 기업 기본정보
    company_name: str
    ceo_name: str | None = None
    corporate_number: str | None = None          # 법인(주민)등록번호
    business_registration_number: str | None = None  # 사업자등록번호
    founded_date: date | None = None
    current_employees: int | None = None          # 임직원수
    location: str | None = None                   # 소재지

    # 사업정보
    industry: str | None = None
    ksic_code: str | None = None                  # 표준산업분류 코드
    main_product: str | None = None               # 주요사업(제품)
    stock_market: str | None = None               # 상장시장
    listing_date: date | None = None              # 상장일자

    # 재무정보
    total_assets: int | None = None               # 자산총액(원)
    capital: int | None = None                    # 자본금(원)
    current_revenue: int | None = None            # 매출액(원)
    operating_profit: int | None = None           # 영업이익(원)

    # 연구개발
    has_research_lab: bool | None = None
    research_staff_count: int | None = None

    # 연락처 정보
    city: str | None = None
    website: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None

    # 기타
    notes: str | None = None

    # 딜플로우 자동 생성 여부 (기업정보 등록 시 False)
    skip_deal_flow: bool = False

    # 기존 SRC-F01 필드 (하위호환)
    stage: str | None = None
    one_liner: str | None = None
    sourcing_channel: str | None = None
    problem_definition: str | None = None
    solution_description: str | None = None
    team_size: int | None = None
    is_fulltime: bool = False
    referrer: str | None = None
    main_customer: str | None = None
    current_traction: str | None = None
    first_meeting_date: date | None = None
    batch_id: uuid.UUID | None = None

    @field_validator("corporate_number")
    @classmethod
    def check_corporate_number(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return v
        digits = re.sub(r"[^0-9]", "", v)
        if len(digits) != 13:
            raise ValueError("법인(주민)등록번호는 13자리여야 합니다.")
        if not validate_corporate_number(digits):
            raise ValueError("법인(주민)등록번호가 유효하지 않습니다.")
        return v

    @field_validator("business_registration_number")
    @classmethod
    def check_brn(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return v
        digits = re.sub(r"[^0-9]", "", v)
        if len(digits) != 10:
            raise ValueError("사업자등록번호는 10자리여야 합니다.")
        if not validate_business_registration_number(digits):
            raise ValueError("사업자등록번호가 유효하지 않습니다.")
        return v


class StartupUpdate(BaseModel):
    """스타트업 수정 요청 — 부분 수정"""
    company_name: str | None = None
    ceo_name: str | None = None
    industry: str | None = None
    stage: str | None = None
    one_liner: str | None = None
    sourcing_channel: str | None = None
    corporate_number: str | None = None
    business_registration_number: str | None = None
    problem_definition: str | None = None
    solution_description: str | None = None
    team_size: int | None = None
    is_fulltime: bool | None = None
    referrer: str | None = None
    founded_date: date | None = None
    location: str | None = None
    main_customer: str | None = None
    current_traction: str | None = None
    current_revenue: int | None = None
    current_employees: int | None = None
    first_meeting_date: date | None = None
    batch_id: uuid.UUID | None = None
    assigned_manager_id: uuid.UUID | None = None
    # BHV 확장 필드
    ksic_code: str | None = None
    main_product: str | None = None
    stock_market: str | None = None
    listing_date: date | None = None
    total_assets: int | None = None
    capital: int | None = None
    operating_profit: int | None = None
    has_research_lab: bool | None = None
    research_staff_count: int | None = None
    city: str | None = None
    website: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    notes: str | None = None


class StartupResponse(BaseModel):
    """스타트업 응답"""
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="wrap")
    @classmethod
    def extract_manager_name(cls, data: object, handler: object) -> "StartupResponse":
        """ORM 객체에서 assigned_manager_name 추출 (원본 mutation 방지)"""
        manager_name = None
        if hasattr(data, "assigned_manager") and data.assigned_manager is not None:
            manager_name = data.assigned_manager.name
        instance = handler(data)  # type: ignore[operator]
        if manager_name is not None:
            instance.assigned_manager_name = manager_name
        return instance

    id: uuid.UUID
    company_name: str
    corporate_number: str | None
    business_registration_number: str | None
    ceo_name: str
    industry: str
    stage: str
    one_liner: str
    problem_definition: str | None
    solution_description: str | None
    team_size: int | None
    is_fulltime: bool
    sourcing_channel: str
    referrer: str | None
    current_deal_stage: str
    portfolio_grade: str | None
    is_portfolio: bool
    founded_date: date | None
    location: str | None
    main_customer: str | None
    current_traction: str | None
    current_revenue: int | None
    current_employees: int | None
    first_meeting_date: date | None
    batch_id: uuid.UUID | None
    assigned_manager_id: uuid.UUID | None
    assigned_manager_name: str | None = None
    invested_at: datetime | None
    # BHV 확장 필드
    ksic_code: str | None
    main_product: str | None
    stock_market: str | None
    listing_date: date | None
    total_assets: int | None
    capital: int | None
    operating_profit: int | None
    has_research_lab: bool | None
    research_staff_count: int | None
    city: str | None
    website: str | None
    contact_person: str | None
    contact_phone: str | None
    contact_email: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class StartupListResponse(BaseModel):
    """스타트업 목록 페이지네이션 응답"""
    data: list[StartupResponse]
    total: int
    page: int
    page_size: int

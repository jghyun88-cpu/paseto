"""eLSA 에러 코드 패턴 — 마스터 §42"""

from fastapi import HTTPException, status


def invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 올바르지 않습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def token_expired() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="토큰이 만료되었습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def permission_denied() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="해당 작업에 대한 권한이 없습니다.",
    )


def inactive_user() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="비활성화된 계정입니다.",
    )


def user_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="사용자를 찾을 수 없습니다.",
    )


def email_already_exists() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="이미 등록된 이메일입니다.",
    )


def startup_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 스타트업을 찾을 수 없습니다.",
    )


def screening_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 스크리닝을 찾을 수 없습니다.",
    )


def handover_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 인계 문서를 찾을 수 없습니다.",
    )


def handover_already_acknowledged() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="이미 수신 확인된 인계 문서입니다.",
    )


def review_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 심사를 찾을 수 없습니다.",
    )


def memo_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 투자메모를 찾을 수 없습니다.",
    )


def ic_decision_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 IC 결정을 찾을 수 없습니다.",
    )


def contract_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 투자 계약을 찾을 수 없습니다.",
    )


def cap_table_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 Cap Table 항목을 찾을 수 없습니다.",
    )


def fund_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 조합을 찾을 수 없습니다.",
    )


# --- 보육팀 (Phase 5) ---


def incubation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 포트폴리오 기업을 찾을 수 없습니다.",
    )


def mentoring_session_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 멘토링 세션을 찾을 수 없습니다.",
    )


def kpi_record_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 KPI 기록을 찾을 수 없습니다.",
    )


def kpi_period_duplicate() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="해당 기간의 KPI 기록이 이미 존재합니다.",
    )


def demo_day_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 데모데이를 찾을 수 없습니다.",
    )


def investor_meeting_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 투자자 미팅 기록을 찾을 수 없습니다.",
    )


def mentor_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 멘토를 찾을 수 없습니다.",
    )


def grade_change_not_authorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="포트폴리오 등급 변경은 PM 또는 Partner만 가능합니다.",
    )


# --- 오픈이노베이션팀 (Phase 6) ---


def partner_demand_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 파트너 수요를 찾을 수 없습니다.",
    )


def poc_project_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 PoC 프로젝트를 찾을 수 없습니다.",
    )


def follow_on_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 후속투자 기록을 찾을 수 없습니다.",
    )


def exit_record_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 회수 기록을 찾을 수 없습니다.",
    )


def government_program_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="해당 정부사업을 찾을 수 없습니다.",
    )

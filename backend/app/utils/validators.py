"""법인(주민)등록번호 · 사업자등록번호 검증 유틸리티"""

import re


def _validate_corp_reg_number(digits: str) -> bool:
    """법인등록번호 체크디짓 (가중치 [1,2,1,2,...], mod 10)"""
    weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
    total = sum(int(digits[i]) * weights[i] for i in range(12))
    check = (10 - (total % 10)) % 10
    return int(digits[12]) == check


def _validate_resident_number(digits: str) -> bool:
    """주민등록번호 체크디짓 (가중치 [2,3,4,5,6,7,8,9,2,3,4,5], mod 11)"""
    weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]
    total = sum(int(digits[i]) * weights[i] for i in range(12))
    check = (11 - (total % 11)) % 10
    return int(digits[12]) == check


def validate_corporate_number(value: str) -> bool:
    """법인(주민)등록번호 검증 (13자리, 형식: 123456-1234567).

    법인등록번호와 주민등록번호 두 가지 알고리즘을 모두 시도하여
    하나라도 통과하면 유효로 판정한다.
    """
    digits = re.sub(r"[^0-9]", "", value)
    if len(digits) != 13:
        return False

    return _validate_corp_reg_number(digits) or _validate_resident_number(digits)


def validate_business_registration_number(value: str) -> bool:
    """사업자등록번호 검증 (10자리, 형식: 123-12-12345).

    체크디짓 알고리즘:
      가중치 = [1, 3, 7, 1, 3, 7, 1, 3, 5]
      sum = Σ(digit_i × weight_i) for i=0..7
           + (digit_8 × 5) // 10 + (digit_8 × 5) % 10
      check = (10 - (sum % 10)) % 10
      마지막(10번째) 자리 == check 이면 유효
    """
    digits = re.sub(r"[^0-9]", "", value)
    if len(digits) != 10:
        return False

    weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    total = 0
    for i in range(8):
        total += int(digits[i]) * weights[i]

    # 9번째 자릿값에 가중치 5를 곱한 뒤, 십의 자리와 일의 자리를 분리하여 합산
    v = int(digits[8]) * weights[8]
    total += v // 10 + v % 10

    check = (10 - (total % 10)) % 10
    return int(digits[9]) == check


def escape_like(value: str) -> str:
    """LIKE/ILIKE 검색어에서 와일드카드 문자를 이스케이프한다.

    SQLAlchemy ilike에 사용자 입력을 직접 넣으면 %와 _가
    와일드카드로 해석되어 의도치 않은 결과를 반환할 수 있다.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

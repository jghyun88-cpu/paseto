/**
 * 법인(주민)등록번호 · 사업자등록번호 검증 및 포맷 유틸리티
 */

/** 법인등록번호 체크디짓 (가중치 [1,2,1,2,...], mod 10) */
function validateCorpRegNumber(digits: string): boolean {
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let total = 0;
  for (let i = 0; i < 12; i++) {
    total += Number(digits[i]) * weights[i];
  }
  const check = (10 - (total % 10)) % 10;
  return Number(digits[12]) === check;
}

/** 주민등록번호 체크디짓 (가중치 [2,3,4,5,6,7,8,9,2,3,4,5], mod 11) */
function validateResidentNumber(digits: string): boolean {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let total = 0;
  for (let i = 0; i < 12; i++) {
    total += Number(digits[i]) * weights[i];
  }
  const check = (11 - (total % 11)) % 10;
  return Number(digits[12]) === check;
}

/** 법인(주민)등록번호 검증 — 법인번호/주민번호 두 알고리즘 모두 시도 */
export function validateCorporateNumber(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length !== 13) return false;
  return validateCorpRegNumber(digits) || validateResidentNumber(digits);
}

/** 사업자등록번호 검증 (10자리) */
export function validateBusinessRegistrationNumber(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length !== 10) return false;

  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let total = 0;
  for (let i = 0; i < 8; i++) {
    total += Number(digits[i]) * weights[i];
  }
  const v = Number(digits[8]) * weights[8];
  total += Math.floor(v / 10) + (v % 10);

  const check = (10 - (total % 10)) % 10;
  return Number(digits[9]) === check;
}

/** 법인(주민)등록번호 자동 포맷팅: 123456-1234567 */
export function formatCorporateNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

/** 사업자등록번호 자동 포맷팅: 123-12-12345 */
export function formatBusinessRegistrationNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

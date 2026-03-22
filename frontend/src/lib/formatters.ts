/**
 * 공통 포맷터 함수
 * 각 페이지에 분산되어 있던 포맷팅 로직을 중앙화합니다.
 */

/** 법인(주민)등록번호 포맷 (목록용, 마스킹): 1234560000158 → 123456-0****** */
export function fmtCorporateNumber(v: string | null): string {
  if (!v) return "-";
  const d = v.replace(/[^0-9]/g, "");
  if (d.length === 13) return `${d.slice(0, 6)}-${d.charAt(6)}******`;
  return v;
}

/** 법인(주민)등록번호 포맷 (상세용, 전체 노출): 1234560000158 → 123456-0000158 */
export function fmtCorporateNumberFull(v: string | null): string {
  if (!v) return "-";
  const d = v.replace(/[^0-9]/g, "");
  if (d.length === 13) return `${d.slice(0, 6)}-${d.slice(6)}`;
  return v;
}

/** 사업자등록번호 포맷: 1168201988 → 116-82-01988 */
export function fmtBRN(v: string | null): string {
  if (!v) return "-";
  const d = v.replace(/[^0-9]/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  return v;
}

/** 금액 포맷 (한국어 로케일 콤마): 1234567 → "1,234,567" */
export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("ko-KR");
}

/** KSIC 코드 + industry 조합 표시 */
export function fmtIndustry(ksic: string | null, industry: string | null): string {
  if (ksic && industry) return `${ksic} - ${industry}`;
  if (ksic) return ksic;
  return industry || "-";
}

/** 소재지: city + location 조합 */
export function fmtLocation(city: string | null, location: string | null): string {
  if (city && location) return `${city} ${location}`;
  return city || location || "-";
}

/** 금액 → 백만원 표시: 1234567890 → "1,235" */
export function fmtMillions(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return Math.round(v / 1_000_000).toLocaleString();
}

/** 금액 → 원 표시 (콤마 + "원"): 50000000 → "50,000,000원" */
export function fmtAmount(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return `${v.toLocaleString("ko-KR")}원`;
}

/** ISO 날짜 → YYYY.MM.DD 형식 (프로젝트 표준) */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = iso.slice(0, 10);
  return d.replace(/-/g, ".");
}

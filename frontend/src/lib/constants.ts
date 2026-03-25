/**
 * 공통 상수 — 단일 진실 공급원 (Single Source of Truth)
 * 각 페이지에 분산되어 있던 라벨/옵션 맵을 중앙화합니다.
 */

/** DealStage 한글 라벨 (backend DealStage enum과 동기화 필수) */
export const DEAL_STAGE_LABEL: Record<string, string> = {
  inbound: "유입",
  first_screening: "1차 스크리닝",
  deep_review: "심층검토",
  interview: "인터뷰",
  due_diligence: "기초실사",
  ic_pending: "IC 대기",
  ic_review: "IC 심사중",
  approved: "승인",
  conditional: "조건부",
  on_hold: "보류",
  incubation_first: "보육우선",
  rejected: "부결",
  contract: "계약",
  closed: "클로징",
  portfolio: "포트폴리오",
};

/** DealStage 색상 */
export const DEAL_STAGE_COLOR: Record<string, string> = {
  inbound: "text-slate-500",
  first_screening: "text-blue-600",
  deep_review: "text-indigo-600 font-semibold",
  interview: "text-purple-600",
  due_diligence: "text-yellow-700",
  ic_pending: "text-orange-600",
  ic_review: "text-orange-700",
  approved: "text-green-600 font-semibold",
  conditional: "text-amber-600",
  on_hold: "text-slate-400",
  incubation_first: "text-cyan-600",
  rejected: "text-red-500",
  contract: "text-emerald-600",
  closed: "text-emerald-700 font-semibold",
  portfolio: "text-teal-600 font-semibold",
};

/** 소싱 채널 라벨 */
export const CHANNEL_LABEL: Record<string, string> = {
  university_lab: "대학/연구소",
  corporate_oi: "대기업 OI",
  portfolio_referral: "포트폴리오 추천",
  vc_cvc_angel: "VC/CVC/엔젤",
  public_program: "공공기관",
  competition_forum: "경진대회/포럼",
  online_application: "온라인 상시모집",
  direct_outreach: "직접 발굴",
  tech_expo: "기술전시회",
  Referral: "레퍼럴",
};

/** select 옵션 타입 */
export interface SelectOption {
  value: string;
  label: string;
}

/** 섹터 옵션 */
export const SECTOR_OPTIONS: SelectOption[] = [
  { value: "", label: "선택" },
  { value: "AI/딥테크", label: "AI/딥테크" },
  { value: "바이오/헬스케어", label: "바이오/헬스케어" },
  { value: "SaaS/B2B", label: "SaaS/B2B" },
  { value: "핀테크", label: "핀테크" },
  { value: "클린테크/ESG", label: "클린테크/ESG" },
  { value: "반도체/소재", label: "반도체/소재" },
  { value: "로보틱스/제조", label: "로보틱스/제조" },
  { value: "battery", label: "배터리" },
  { value: "기타", label: "기타" },
];

/** 투자 단계 옵션 */
export const STAGE_OPTIONS: SelectOption[] = [
  { value: "", label: "선택" },
  { value: "예비창업", label: "예비창업" },
  { value: "Pre-seed", label: "Pre-seed" },
  { value: "Seed", label: "Seed" },
  { value: "Pre-A", label: "Pre-A" },
  { value: "Series A", label: "Series A" },
  { value: "Pre-Series B", label: "Pre-Series B" },
  { value: "Series B", label: "Series B" },
];

/** 소싱 채널 옵션 */
export const SOURCING_CHANNEL_OPTIONS: SelectOption[] = [
  { value: "", label: "선택" },
  { value: "university_lab", label: "대학/연구소" },
  { value: "corporate_oi", label: "대기업 오픈이노베이션" },
  { value: "portfolio_referral", label: "포트폴리오/창업자 추천" },
  { value: "vc_cvc_angel", label: "VC/CVC/엔젤 네트워크" },
  { value: "public_program", label: "공공기관/지자체" },
  { value: "competition_forum", label: "경진대회/포럼/학회" },
  { value: "online_application", label: "온라인 상시모집" },
  { value: "direct_outreach", label: "직접 발굴" },
  { value: "tech_expo", label: "기술전시회" },
  { value: "Referral", label: "레퍼럴" },
];

/** 투자 수단 (backend InvestmentVehicle enum 동기화 필수) */
export const INVESTMENT_VEHICLE_OPTIONS: SelectOption[] = [
  { value: "common_stock", label: "보통주" },
  { value: "preferred_stock", label: "우선주" },
  { value: "rcps", label: "RCPS" },
  { value: "cps", label: "CPS" },
  { value: "convertible_bond", label: "CB (전환사채)" },
  { value: "bond_with_warrant", label: "BW (신주인수권부사채)" },
  { value: "safe", label: "SAFE" },
  { value: "convertible_note", label: "CN (전환사채권)" },
];

export const INVESTMENT_VEHICLE_LABEL: Record<string, string> = {
  common_stock: "보통주",
  preferred_stock: "우선주",
  rcps: "RCPS",
  cps: "CPS",
  convertible_bond: "CB",
  bond_with_warrant: "BW",
  safe: "SAFE",
  convertible_note: "CN",
};

/** 신주/구주 구분 (backend ShareAcquisitionType enum 동기화 필수) */
export const SHARE_ACQUISITION_OPTIONS: SelectOption[] = [
  { value: "new_shares", label: "신주" },
  { value: "old_shares", label: "구주" },
];

export const SHARE_ACQUISITION_LABEL: Record<string, string> = {
  new_shares: "신주",
  old_shares: "구주",
};

/** 회의 유형 라벨 (backend MeetingType enum 동기화 필수) */
export const MEETING_TYPE_LABEL: Record<string, string> = {
  weekly_deal: "주간 딜검토",
  weekly_portfolio: "주간 포트폴리오",
  monthly_ops: "월간 운영",
  ic: "투자위원회",
  mentoring: "멘토링",
  partner_review: "파트너 리뷰",
  risk_review: "리스크 리뷰",
  program_ops: "프로그램 운영",
};

export const MEETING_TYPE_OPTIONS: SelectOption[] = [
  { value: "weekly_deal", label: "주간 딜검토" },
  { value: "weekly_portfolio", label: "주간 포트폴리오" },
  { value: "monthly_ops", label: "월간 운영" },
  { value: "ic", label: "투자위원회" },
  { value: "mentoring", label: "멘토링" },
  { value: "partner_review", label: "파트너 리뷰" },
  { value: "risk_review", label: "리스크 리뷰" },
  { value: "program_ops", label: "프로그램 운영" },
];

/** 문서 카테고리 라벨 (backend DocumentCategory enum 동기화) */
export const DOCUMENT_CATEGORY_LABEL: Record<string, string> = {
  dd: "DD 자료",
  contract: "계약",
  ir: "IR",
  mentoring: "멘토링",
  poc: "PoC",
  report: "보고서",
  legal: "법무",
  other: "기타",
};

export const DOCUMENT_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "other", label: "기타" },
  { value: "dd", label: "DD 자료" },
  { value: "contract", label: "계약" },
  { value: "ir", label: "IR" },
  { value: "mentoring", label: "멘토링" },
  { value: "poc", label: "PoC" },
  { value: "report", label: "보고서" },
  { value: "legal", label: "법무" },
];

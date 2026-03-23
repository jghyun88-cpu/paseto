/** 인계 관련 공통 상수 */

export const TEAM_LABEL: Record<string, string> = {
  sourcing: "소싱팀",
  review: "심사팀",
  incubation: "보육팀",
  oi: "OI팀",
  backoffice: "백오피스",
  all: "전체",
};

export const HANDOVER_TYPE_LABEL: Record<string, string> = {
  sourcing_to_review: "소싱 → 심사",
  review_to_backoffice: "심사 → 백오피스",
  review_to_incubation: "심사 → 보육",
  incubation_to_oi: "보육 → OI",
  oi_to_review: "OI → 심사",
  backoffice_broadcast: "전체 공지",
};

/** eLSA 프론트엔드 공통 타입 */

/** 메뉴 트리 노드 */
export interface MenuNode {
  id: string;
  label: string;
  /** "folder" = 하위 노드 있음, "page" = 리프 노드 (클릭 가능) */
  type: "folder" | "page";
  href?: string;
  children?: MenuNode[];
}

/** 상단 GNB 탭 */
export interface NavTab {
  id: string;
  label: string;
  menu: MenuNode[];
}

/** 사용자 역할 */
export type UserRole =
  | "partner"
  | "analyst"
  | "pm"
  | "oi_manager"
  | "backoffice"
  | "admin";

/** 사용자 팀 */
export type UserTeam =
  | "sourcing"
  | "review"
  | "incubation"
  | "oi"
  | "backoffice";

/** ─── 심사팀 모듈 타입 ─── */

/** 심사 (서류/인터뷰/DD) */
export interface ReviewItem {
  id: string;
  startup_id: string;
  reviewer_id: string;
  review_type: "document" | "interview" | "dd";
  team_score: number | null;
  problem_score: number | null;
  solution_score: number | null;
  market_score: number | null;
  traction_score: number | null;
  number_literacy: number | null;
  customer_experience: number | null;
  tech_moat: number | null;
  execution_plan: number | null;
  feedback_absorption: number | null;
  cofounder_stability: number | null;
  dd_checklist: Record<string, string> | null;
  risk_log: string | null;
  overall_verdict: string;
  tech_type: string | null;
  scalability_score: number | null;
  process_compatibility: number | null;
  sample_test_status: string | null;
  certification_stage: string | null;
  purchase_lead_time_months: number | null;
  started_at: string;
  completed_at: string | null;
}

/** 투자메모 */
export interface MemoItem {
  id: string;
  startup_id: string;
  author_id: string;
  version: number;
  overview: string;
  team_assessment: string;
  market_assessment: string;
  tech_product_assessment: string;
  traction: string;
  risks: string;
  value_add_points: string;
  proposed_terms: Record<string, unknown>;
  post_investment_plan: string;
  status: "draft" | "submitted" | "ic_ready";
  created_at: string;
  updated_at: string;
}

/** IC 결정 */
export interface ICDecisionItem {
  id: string;
  startup_id: string;
  memo_id: string;
  decision: string;
  conditions: string | null;
  monitoring_points: string | null;
  attendees: string[];
  contract_assignee_id: string | null;
  program_assignee_id: string | null;
  decided_at: string;
  notes: string | null;
}

/** DD 체크리스트 항목 상태 */
export type DDStatus = "pending" | "completed" | "issue";

/** DD 10항목 키 */
export const DD_ITEMS = [
  "법인등기", "주주구조", "IP귀속", "재무제표", "소송이력",
  "인허가", "핵심계약", "노무", "세무", "기술감정",
] as const;

/** ─── 보육팀 모듈 타입 ─── */

export type PortfolioGrade = "A" | "B" | "C" | "D";
export type IncubationStatus = "onboarding" | "active" | "graduated" | "paused";
export type MentorType = "dedicated" | "functional" | "industry" | "investment" | "customer_dev";
export type InvestorType = "angel" | "seed_vc" | "pre_a_vc" | "cvc" | "strategic" | "overseas";
export type InvestorMeetingType = "onsite_consult" | "follow_up" | "ir_meeting" | "termsheet";
export type MeetingOutcome = "interested" | "passed" | "termsheet" | "invested";
export type ActionItemStatus = "pending" | "in_progress" | "completed";
export type DemoDayStatus = "planning" | "rehearsal" | "completed" | "follow_up";

export interface CrisisFlags {
  cash_critical: boolean;
  key_person_left: boolean;
  customer_churn: boolean;
  dev_delay: boolean;
  lawsuit: boolean;
}

export interface IRReadiness {
  pitch_1min: boolean;
  pitch_5min: boolean;
  ir_deck: boolean;
  data_room: boolean;
  faq: boolean;
  valuation_logic: boolean;
  use_of_funds: boolean;
  milestone_plan: boolean;
}

export interface Diagnosis {
  customer: number;
  product: number;
  tech: number;
  org: number;
  sales: number;
  finance: number;
  investment_readiness: number;
}

export interface IncubationItem {
  id: string;
  startup_id: string;
  batch_id: string | null;
  assigned_pm_id: string;
  program_start: string;
  program_end: string;
  diagnosis: Diagnosis | null;
  action_plan: ActionPlanData | null;
  growth_bottleneck: string | null;
  portfolio_grade: PortfolioGrade;
  status: IncubationStatus;
  crisis_flags: CrisisFlags | null;
  ir_readiness: IRReadiness | null;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanItem {
  area: "product" | "customer" | "revenue" | "investment" | "org";
  current_state: string;
  target_state: string;
  tasks: string;
  owner: string;
  deadline: string;
}

export interface ActionPlanData {
  items: ActionPlanItem[];
}

export interface MentoringSessionItem {
  id: string;
  startup_id: string;
  mentor_id: string | null;
  mentor_name: string;
  mentor_type: MentorType;
  session_date: string;
  discussion_summary: string;
  action_items: ActionItemData[];
  action_completion_rate: number | null;
  created_at: string;
}

export interface ActionItemData {
  task: string;
  owner: string;
  deadline: string;
  status: ActionItemStatus;
}

export interface KPIRecordItem {
  id: string;
  startup_id: string;
  period: string;
  revenue: number | null;
  customer_count: number | null;
  runway_months: number | null;
  poc_count: number | null;
  follow_on_meetings: number | null;
  created_at: string;
}

export interface KPIWarning {
  metric: string;
  message: string;
  severity: "warning" | "critical";
}

export interface DemoDayItem {
  id: string;
  title: string;
  event_date: string;
  status: DemoDayStatus;
  follow_up_deadline: string | null;
  created_at: string;
}

export interface InvestorMeetingItem {
  id: string;
  startup_id: string;
  investor_name: string;
  investor_company: string;
  investor_type: InvestorType;
  meeting_date: string;
  meeting_type: InvestorMeetingType;
  outcome: MeetingOutcome | null;
  created_at: string;
}

export interface MentorItem {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  mentor_type: MentorType;
  expertise_areas: string[];
  is_active: boolean;
  engagement_count: number;
}

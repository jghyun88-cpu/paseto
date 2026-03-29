/** eLSA 프론트엔드 공통 타입 */

/** 메뉴 트리 노드 */
export interface MenuNode {
  id: string;
  label: string;
  /** "folder" = 하위 노드 있음, "page" = 리프 노드 (클릭 가능) */
  type: "folder" | "page";
  href?: string;
  children?: MenuNode[];
  /** 배포 단계 — 1: 1차 배포 포함, 2: 2차 이후. 미지정 시 1로 간주 */
  phase?: 1 | 2;
}

/** 상단 GNB 탭 */
export interface NavTab {
  id: string;
  label: string;
  menu: MenuNode[];
  /** 탭 전체의 배포 단계 — 2이면 탭 자체가 disabled */
  phase?: 1 | 2;
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

/** ─── 오픈이노베이션팀 모듈 타입 ─── */

export type DemandType =
  | "tech_adoption" | "joint_dev" | "vendor" | "new_biz" | "strategic_invest";

export type PoCStatusType =
  | "demand_identified" | "matching" | "planning" | "kickoff"
  | "in_progress" | "mid_review" | "completed"
  | "commercial_contract" | "joint_development"
  | "strategic_investment" | "retry" | "terminated";

export type ExitTypeValue =
  | "secondary_sale" | "ma" | "strategic_sale" | "ipo"
  | "secondary_market" | "tech_transfer" | "jv" | "writeoff";

export type GovProgramType =
  | "tips" | "pre_tips" | "rnd" | "sandbox" | "pilot_support" | "overseas_voucher";

export type FollowOnStatus =
  | "planning" | "ir_active" | "termsheet" | "closing" | "completed";

export interface PartnerDemandItem {
  id: string;
  partner_company: string;
  department: string | null;
  demand_type: DemandType;
  description: string;
  status: string;
  nda_required: boolean;
  candidate_startups: { startup_id: string; fit_reason: string }[] | null;
  created_at: string;
}

export interface PoCProjectItem {
  id: string;
  startup_id: string;
  partner_demand_id: string;
  project_name: string;
  status: PoCStatusType;
  duration_weeks: number;
  conversion_likelihood: string | null;
  result_summary: string | null;
  created_at: string;
}

export interface FollowOnItem {
  id: string;
  startup_id: string;
  round_type: string;
  target_amount: number | null;
  lead_investor: string | null;
  ir_meetings_count: number;
  status: FollowOnStatus;
  created_at: string;
}

export interface ExitRecordItem {
  id: string;
  startup_id: string;
  exit_type: ExitTypeValue;
  exit_amount: number | null;
  multiple: number | null;
  cap_table_clean: boolean;
  preferred_terms_reviewed: boolean;
  drag_tag_reviewed: boolean;
  ip_ownership_clean: boolean;
  accounting_transparent: boolean;
  customer_contracts_stable: boolean;
  management_issue_clear: boolean;
  exit_date: string | null;
  created_at: string;
}

export interface GovProgramItem {
  id: string;
  startup_id: string;
  program_type: GovProgramType;
  program_name: string;
  managing_agency: string;
  status: string;
  amount: number | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

/** ─── Phase 7 (팀간 연결 + 고도화) 타입 ─── */

export type MeetingTypeValue =
  | "weekly_deal" | "weekly_portfolio" | "monthly_ops" | "ic"
  | "mentoring" | "partner_review" | "risk_review" | "program_ops";

export type NotificationTypeValue =
  | "handover_request" | "deadline_alert" | "ic_schedule"
  | "kpi_warning" | "report_deadline" | "crisis_alert"
  | "escalation" | "contract_overdue";

export interface MeetingItem {
  id: string;
  meeting_type: MeetingTypeValue;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  attendees: { user_id: string; team: string; role: string }[];
  agenda_items: { item: string; priority: string }[];
  minutes: string | null;
  action_items: { item: string; assignee_id: string; deadline: string; status: string }[] | null;
  created_by: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationTypeValue;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardData {
  deal_pipeline: { total: number; in_screening: number; in_contract: number; portfolio: number };
  portfolio_metrics: { total_startups: number; grade_a_ratio: number; follow_on_rate: number };
  crisis_alerts: { startup_id: string; company_name: string; crisis_type: string; severity: string }[];
  unacknowledged_handovers: number;
  upcoming_meetings: MeetingItem[];
  recent_handovers: { id: string; from_team: string; to_team: string; acknowledged_by: string | null }[];
}

/** ─── Phase 8 (KPI 대시보드) 타입 ─── */

export type KPILayer = "input" | "process" | "output" | "outcome";
export type KPIStatus = "양호" | "보완필요" | "개선필요" | "데이터없음";

export interface TeamKPIItem {
  id: string;
  team: string;
  period: string;
  kpi_layer: KPILayer;
  kpi_name: string;
  kpi_definition: string;
  target_value: number;
  actual_value: number | null;
  achievement_rate: number | null;
  mom_change: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KPIHighlight {
  kpi_name: string;
  kpi_layer: KPILayer;
  target_value: number;
  actual_value: number | null;
  achievement_rate: number | null;
  status: KPIStatus;
}

export interface TeamKPISummary {
  team: string;
  total_kpis: number;
  achieved: number;
  needs_improvement: number;
  highlight_kpis: KPIHighlight[];
}

export interface ExecutiveKPIData {
  period: string;
  teams: Record<string, TeamKPISummary>;
  overall_health: KPIStatus;
}

/** ─── Phase 9 (SOP + 양식 + JD) 타입 ─── */

export interface SOPTemplateItem {
  id: string;
  document_number: string;
  title: string;
  owning_team: string;
  steps: { step: number; name: string; forms?: string[] }[];
  required_forms: string[];
  is_active: boolean;
}

export interface SOPExecutionItem {
  id: string;
  sop_template_id: string;
  startup_id: string | null;
  current_step: number;
  step_statuses: Record<string, string>;
  started_at: string;
  completed_at: string | null;
}

export interface FormTemplateItem {
  id: string;
  form_code: string;
  title: string;
  owning_team: string;
  fields: { name: string; type: string; required: boolean }[];
  is_active: boolean;
}

export interface FormSubmissionItem {
  id: string;
  form_template_id: string;
  startup_id: string | null;
  submitted_by: string;
  data: Record<string, unknown>;
  status: string;
  submitted_at: string;
}

export interface JDItem {
  id: string;
  jd_code: string;
  title: string;
  team: string;
  reports_to: string;
  purpose: string;
  core_responsibilities: string[];
  authority_scope: string[];
  approval_required: string[];
  is_active: boolean;
}

export interface DocumentItem {
  id: string;
  startup_id: string | null;
  category: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  uploader_name: string | null;
  created_at: string;
}

/**
 * eLSA API 클라이언트 — 인증 관리 + 타입드 HTTP 메서드
 *
 * 인증 전략:
 * 1. ELSA_SERVICE_TOKEN 환경변수가 있으면 그대로 Bearer 토큰으로 사용
 * 2. 없으면 ELSA_SERVICE_EMAIL + ELSA_SERVICE_PASSWORD로 로그인하여 토큰 획득
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginResponse {
  access_token: string;
  user: Record<string, unknown>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- Startup ---
interface Startup {
  id: string;
  company_name: string;
  corporate_number: string | null;
  ceo_name: string;
  industry: string;
  stage: string;
  one_liner: string;
  problem_definition: string | null;
  solution_description: string | null;
  team_size: number | null;
  is_fulltime: boolean;
  sourcing_channel: string;
  referrer: string | null;
  current_deal_stage: string;
  portfolio_grade: string | null;
  is_portfolio: boolean;
  founded_date: string | null;
  location: string | null;
  main_customer: string | null;
  current_traction: string | null;
  current_revenue: number | null;
  current_employees: number | null;
  first_meeting_date: string | null;
  batch_id: string | null;
  assigned_manager_id: string | null;
  invested_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Screening ---
interface Screening {
  id: string;
  startup_id: string;
  screener_id: string;
  fulltime_commitment: number;
  problem_clarity: number;
  tech_differentiation: number;
  market_potential: number;
  initial_validation: number;
  legal_clear: boolean;
  strategy_fit: number;
  overall_score: number;
  recommendation: string;
  risk_notes: string | null;
  handover_memo: string | null;
  created_at: string;
}

// --- DealFlow ---
interface DealFlow {
  id: string;
  startup_id: string;
  stage: string;
  moved_at: string;
  moved_by: string;
  notes: string | null;
}

// --- KPI Record ---
interface KPIRecord {
  id: string;
  startup_id: string;
  period: string;
  period_type: string;
  revenue: number | null;
  customer_count: number | null;
  active_users: number | null;
  poc_count: number | null;
  repurchase_rate: number | null;
  release_velocity: string | null;
  cac: number | null;
  ltv: number | null;
  pilot_conversion_rate: number | null;
  mou_to_contract_rate: number | null;
  headcount: number | null;
  runway_months: number | null;
  follow_on_meetings: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Portfolio Issue ---
interface PortfolioIssue {
  id: string;
  startup_id: string;
  issue_type: string;
  severity: string;
  description: string;
  detected_by: string;
  resolved: boolean;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

// --- AI Analysis ---
interface AIAnalysis {
  id: string;
  startup_id: string;
  analysis_type: string;
  scores: Record<string, unknown> | null;
  summary: string;
  report_path: string | null;
  risk_level: string | null;
  recommendation: string | null;
  investment_attractiveness: number | null;
  created_at: string;
  updated_at: string;
}

// --- Incubation ---
interface Incubation {
  id: string;
  startup_id: string;
  batch_id: string | null;
  assigned_pm_id: string;
  program_start: string;
  program_end: string;
  diagnosis: Record<string, unknown> | null;
  action_plan: Record<string, unknown> | null;
  growth_bottleneck: string | null;
  portfolio_grade: string;
  status: string;
  crisis_flags: Record<string, unknown> | null;
  onboarding_checklist: Record<string, unknown> | null;
  ir_readiness: Record<string, unknown> | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Query parameter types
// ---------------------------------------------------------------------------

interface ListStartupsParams {
  search?: string;
  industry?: string;
  stage?: string;
  current_deal_stage?: string;
  sourcing_channel?: string;
  is_portfolio?: boolean;
  assigned_manager_id?: string;
  page?: number;
  page_size?: number;
}

interface ListKPIParams {
  startup_id?: string;
  period?: string;
  page?: number;
  page_size?: number;
}

interface ListIssuesParams {
  startup_id?: string;
  resolved?: boolean;
}

interface ListDealFlowsParams {
  startup_id: string;
}

interface ListScreeningsParams {
  startup_id: string;
}

interface ListIncubationsParams {
  startup_id?: string;
  grade?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// --- Write payloads ---

interface CreateAIAnalysisPayload {
  startup_id: string;
  analysis_type: string;
  scores?: Record<string, unknown>;
  summary: string;
  report_path?: string;
  risk_level?: string;
  recommendation?: string;
  investment_attractiveness?: number;
}

interface CreatePortfolioIssuePayload {
  startup_id: string;
  issue_type: string;
  severity?: string;
  description: string;
  detected_by?: string;
}

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

export type {
  Startup,
  Screening,
  DealFlow,
  KPIRecord,
  PortfolioIssue,
  AIAnalysis,
  Incubation,
  PaginatedResponse,
  ListStartupsParams,
  ListKPIParams,
  ListIssuesParams,
  ListDealFlowsParams,
  ListScreeningsParams,
  ListIncubationsParams,
  CreateAIAnalysisPayload,
  CreatePortfolioIssuePayload,
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class ElsaClient {
  private readonly http: AxiosInstance;
  private token: string | null = null;
  private tokenPromise: Promise<void> | null = null;

  constructor() {
    const baseURL = process.env.ELSA_API_URL ?? "http://localhost:8000";

    this.http = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { "Content-Type": "application/json" },
    });

    // 요청 인터셉터: Bearer 토큰 주입
    this.http.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // 응답 인터셉터: 401 시 토큰 재발급 후 1회 재시도
    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retried) {
          original._retried = true;
          this.token = null;
          this.tokenPromise = null;
          await this.ensureAuthenticated();
          original.headers.Authorization = `Bearer ${this.token}`;
          return this.http(original);
        }
        return Promise.reject(error);
      },
    );
  }

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  private async ensureAuthenticated(): Promise<void> {
    if (this.token) return;

    // 이미 인증 중이면 대기
    if (this.tokenPromise) {
      await this.tokenPromise;
      return;
    }

    this.tokenPromise = this.authenticate();
    try {
      await this.tokenPromise;
    } finally {
      this.tokenPromise = null;
    }
  }

  private async authenticate(): Promise<void> {
    // 1순위: 환경변수 토큰
    const staticToken = process.env.ELSA_SERVICE_TOKEN;
    if (staticToken) {
      this.token = staticToken;
      return;
    }

    // 2순위: 이메일/비밀번호 로그인
    const email = process.env.ELSA_SERVICE_EMAIL;
    const password = process.env.ELSA_SERVICE_PASSWORD;
    if (!email || !password) {
      throw new Error(
        "ELSA_SERVICE_TOKEN 또는 ELSA_SERVICE_EMAIL + ELSA_SERVICE_PASSWORD를 설정해주세요.",
      );
    }

    const baseURL = process.env.ELSA_API_URL ?? "http://localhost:8000";
    const resp = await axios.post<LoginResponse>(
      `${baseURL}/api/v1/auth/login`,
      { email, password },
    );
    this.token = resp.data.access_token;
  }

  // -------------------------------------------------------------------------
  // Generic HTTP helpers
  // -------------------------------------------------------------------------

  /** 타입 안전하게 객체를 Record<string, unknown>으로 변환 */
  private toRecord(obj: unknown): Record<string, unknown> {
    return obj as Record<string, unknown>;
  }

  private async get<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const config: AxiosRequestConfig = {};
    if (params) {
      // undefined 값 제거
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          cleaned[k] = v;
        }
      }
      config.params = cleaned;
    }
    const resp = await this.http.get<T>(path, config);
    return resp.data;
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const resp = await this.http.post<T>(path, body);
    return resp.data;
  }

  // -------------------------------------------------------------------------
  // Startups
  // -------------------------------------------------------------------------

  async listStartups(
    params?: ListStartupsParams,
  ): Promise<PaginatedResponse<Startup>> {
    return this.get("/api/v1/startups/", this.toRecord(params));
  }

  async getStartup(id: string): Promise<Startup> {
    return this.get(`/api/v1/startups/${id}`);
  }

  // -------------------------------------------------------------------------
  // Screenings
  // -------------------------------------------------------------------------

  async listScreenings(params: ListScreeningsParams): Promise<Screening[]> {
    return this.get("/api/v1/screenings/", this.toRecord(params));
  }

  async getScreening(id: string): Promise<Screening> {
    return this.get(`/api/v1/screenings/${id}`);
  }

  // -------------------------------------------------------------------------
  // Deal Flows
  // -------------------------------------------------------------------------

  async listDealFlows(params: ListDealFlowsParams): Promise<DealFlow[]> {
    return this.get("/api/v1/deal-flows/", this.toRecord(params));
  }

  // -------------------------------------------------------------------------
  // KPI Records
  // -------------------------------------------------------------------------

  async listKPIs(
    params?: ListKPIParams,
  ): Promise<PaginatedResponse<KPIRecord>> {
    return this.get("/api/v1/kpi-records/", this.toRecord(params));
  }

  // -------------------------------------------------------------------------
  // Portfolio Issues
  // -------------------------------------------------------------------------

  async listIssues(params?: ListIssuesParams): Promise<PortfolioIssue[]> {
    return this.get(
      "/api/v1/portfolio-issues/",
      this.toRecord(params),
    );
  }

  async createIssue(
    payload: CreatePortfolioIssuePayload,
  ): Promise<PortfolioIssue> {
    return this.post("/api/v1/portfolio-issues/", this.toRecord(payload));
  }

  // -------------------------------------------------------------------------
  // AI Analysis
  // -------------------------------------------------------------------------

  async createAIAnalysis(
    payload: CreateAIAnalysisPayload,
  ): Promise<AIAnalysis> {
    return this.post("/api/v1/ai-analysis/", this.toRecord(payload));
  }

  // -------------------------------------------------------------------------
  // Incubations
  // -------------------------------------------------------------------------

  async listIncubations(
    params?: ListIncubationsParams,
  ): Promise<PaginatedResponse<Incubation>> {
    return this.get("/api/v1/incubations/", this.toRecord(params));
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let clientInstance: ElsaClient | null = null;

export function getClient(): ElsaClient {
  if (!clientInstance) {
    clientInstance = new ElsaClient();
  }
  return clientInstance;
}

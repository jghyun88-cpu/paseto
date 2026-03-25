"""eLSA 전체 Enum 정의 — 마스터 스펙 §3-2 기준

모든 Enum은 이 파일에 중앙 관리한다.
새 Enum 추가 시 반드시 이 파일에만 추가할 것.
"""

from enum import Enum


# --- 파이프라인 단계 ---
class DealStage(str, Enum):
    INBOUND = "inbound"
    FIRST_SCREENING = "first_screening"
    DEEP_REVIEW = "deep_review"
    INTERVIEW = "interview"
    DUE_DILIGENCE = "due_diligence"
    IC_PENDING = "ic_pending"
    IC_REVIEW = "ic_review"
    APPROVED = "approved"
    CONDITIONAL = "conditional"
    ON_HOLD = "on_hold"
    INCUBATION_FIRST = "incubation_first"
    REJECTED = "rejected"
    CONTRACT = "contract"
    CLOSED = "closed"
    PORTFOLIO = "portfolio"


# --- 투자위원회 결정 ---
class ICDecisionType(str, Enum):
    APPROVED = "approved"
    CONDITIONAL = "conditional"
    ON_HOLD = "on_hold"
    INCUBATION_FIRST = "incubation_first"
    REJECTED = "rejected"


# --- 투자 구조 ---
class InvestmentVehicle(str, Enum):
    COMMON_STOCK = "common_stock"          # 보통주
    PREFERRED_STOCK = "preferred_stock"    # 우선주
    RCPS = "rcps"                          # RCPS (상환전환우선주)
    CPS = "cps"                            # CPS (전환우선주)
    CONVERTIBLE_BOND = "convertible_bond"  # CB (전환사채)
    BOND_WITH_WARRANT = "bond_with_warrant"  # BW (신주인수권부사채)
    SAFE = "safe"                          # SAFE
    CONVERTIBLE_NOTE = "convertible_note"  # CN (전환사채권)


# --- 신주/구주 구분 ---
class ShareAcquisitionType(str, Enum):
    NEW_SHARES = "new_shares"  # 신주
    OLD_SHARES = "old_shares"  # 구주


# --- 딜소싱 채널 ---
class SourcingChannel(str, Enum):
    UNIVERSITY_LAB = "university_lab"
    CORPORATE_OI = "corporate_oi"
    PORTFOLIO_REFERRAL = "portfolio_referral"
    VC_CVC_ANGEL = "vc_cvc_angel"
    PUBLIC_PROGRAM = "public_program"
    COMPETITION_FORUM = "competition_forum"
    ONLINE_APPLICATION = "online_application"
    DIRECT_OUTREACH = "direct_outreach"
    TECH_EXPO = "tech_expo"


# --- 포트폴리오 등급 ---
class PortfolioGrade(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


# --- PoC 상태 ---
class PoCStatus(str, Enum):
    DEMAND_IDENTIFIED = "demand_identified"
    MATCHING = "matching"
    PLANNING = "planning"
    KICKOFF = "kickoff"
    IN_PROGRESS = "in_progress"
    MID_REVIEW = "mid_review"
    COMPLETED = "completed"
    COMMERCIAL_CONTRACT = "commercial_contract"
    JOINT_DEVELOPMENT = "joint_development"
    STRATEGIC_INVESTMENT = "strategic_investment"
    RETRY = "retry"
    TERMINATED = "terminated"


# --- 회수 방식 ---
class ExitType(str, Enum):
    SECONDARY_SALE = "secondary_sale"
    MA = "ma"
    STRATEGIC_SALE = "strategic_sale"
    IPO = "ipo"
    SECONDARY_MARKET = "secondary_market"
    TECH_TRANSFER = "tech_transfer"
    JV = "jv"
    WRITEOFF = "writeoff"


# --- 계약 진행 상태 ---
class ContractStatus(str, Enum):
    IC_RECEIVED = "ic_received"
    TERM_SHEET = "term_sheet"
    LEGAL_REVIEW = "legal_review"
    SIGNING = "signing"
    DISBURSEMENT = "disbursement"
    COMPLETED = "completed"
    POST_FILING = "post_filing"


# --- 회의 유형 (§37 PROGRAM_OPS 포함) ---
class MeetingType(str, Enum):
    WEEKLY_DEAL = "weekly_deal"
    WEEKLY_PORTFOLIO = "weekly_portfolio"
    MONTHLY_OPS = "monthly_ops"
    IC = "ic"
    MENTORING = "mentoring"
    PARTNER_REVIEW = "partner_review"
    RISK_REVIEW = "risk_review"
    PROGRAM_OPS = "program_ops"


# --- 알림 유형 ---
class NotificationType(str, Enum):
    HANDOVER_REQUEST = "handover_request"
    DEADLINE_ALERT = "deadline_alert"
    IC_SCHEDULE = "ic_schedule"
    KPI_WARNING = "kpi_warning"
    REPORT_DEADLINE = "report_deadline"
    CRISIS_ALERT = "crisis_alert"
    ESCALATION = "escalation"
    CONTRACT_OVERDUE = "contract_overdue"
    SYSTEM = "system"


# --- AI 분석 유형 ---
class AnalysisType(str, Enum):
    SCREENING = "screening"
    IR_ANALYSIS = "ir_analysis"
    RISK_ALERT = "risk_alert"
    MARKET_SCAN = "market_scan"
    INVESTMENT_MEMO = "investment_memo"
    PORTFOLIO_REPORT = "portfolio_report"


# --- 리스크 수준 ---
class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# --- AI 분석 판정 ---
class AnalysisRecommendation(str, Enum):
    PASS = "pass"
    CONDITIONAL = "conditional"
    HOLD = "hold"
    DECLINE = "decline"


# --- 포트폴리오 이슈 유형 ---
class DocumentCategory(str, Enum):
    """문서 카테고리 — 마스터 §26"""
    DD = "dd"
    CONTRACT = "contract"
    IR = "ir"
    MENTORING = "mentoring"
    POC = "poc"
    REPORT = "report"
    LEGAL = "legal"
    OTHER = "other"


class IssueType(str, Enum):
    CASH_RUNWAY = "cash_runway"
    KEY_PERSON = "key_person"
    CUSTOMER_CHURN = "customer_churn"
    DEV_DELAY = "dev_delay"
    LEGAL = "legal"
    REGULATORY = "regulatory"
    OTHER = "other"

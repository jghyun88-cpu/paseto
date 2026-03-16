"""Phase 1 모델 — §30 마이그레이션 순서 기준

FK 의존성 순서:
1. users (FK 없음)
2. organization_settings (FK: updated_by → users)
3. mentors (FK 없음)
4. batches (FK 없음)
5. startups (FK: assigned_manager_id → users, batch_id → batches)
6. deal_flows (FK: startup_id, moved_by)
7. notifications (FK: user_id)
8. activity_logs (FK: user_id, startup_id)
"""

from app.models.base import Base
from app.models.user import User
from app.models.organization_settings import OrganizationSettings
from app.models.mentor import Mentor
from app.models.batch import Batch
from app.models.startup import Startup
from app.models.deal_flow import DealFlow
from app.models.screening import Screening
from app.models.handover import HandoverDocument
from app.models.review import Review
from app.models.investment_memo import InvestmentMemo
from app.models.ic_decision import ICDecision
from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from app.models.contract import InvestmentContract
from app.models.cap_table import CapTableEntry
from app.models.fund import Fund
from app.models.incubation import Incubation
from app.models.mentoring_session import MentoringSession
from app.models.kpi_record import KPIRecord
from app.models.demo_day import DemoDay
from app.models.investor_meeting import InvestorMeeting

__all__ = [
    "Base",
    "User",
    "OrganizationSettings",
    "Mentor",
    "Batch",
    "Startup",
    "DealFlow",
    "Screening",
    "HandoverDocument",
    "Review",
    "InvestmentMemo",
    "ICDecision",
    "Notification",
    "ActivityLog",
    "InvestmentContract",
    "CapTableEntry",
    "Fund",
    "Incubation",
    "MentoringSession",
    "KPIRecord",
    "DemoDay",
    "InvestorMeeting",
]

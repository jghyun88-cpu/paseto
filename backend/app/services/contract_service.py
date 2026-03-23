"""투자 계약 서비스 — 7단계 워크플로우 + 자동화 #5 (OPS-F01 완료→클로징)"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import ContractStatus, DealStage, InvestmentVehicle
from app.models.contract import InvestmentContract
from app.models.startup import Startup
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractUpdate
from app.services import activity_log_service, cap_table_service, deal_flow_service

# OPS-F01 10항목 초기 체크리스트
CLOSING_CHECKLIST_TEMPLATE: dict[str, str] = {
    "투자조건협의완료": "pending",
    "정관개정안확인": "pending",
    "이사회주총의사록": "pending",
    "신주인수계약서서명": "pending",
    "주주간계약서서명": "pending",
    "선행조건이행확인": "pending",
    "투자금입금확인": "pending",
    "등기변경신청": "pending",
    "증권발행확인": "pending",
    "캡테이블업데이트": "pending",
}


async def get_by_startup(
    db: AsyncSession, startup_id: uuid.UUID,
) -> list[InvestmentContract]:
    result = await db.execute(
        select(InvestmentContract)
        .where(InvestmentContract.startup_id == startup_id, InvestmentContract.is_deleted == False)  # noqa: E712
        .order_by(InvestmentContract.created_at.desc())
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, contract_id: uuid.UUID,
) -> InvestmentContract | None:
    result = await db.execute(
        select(InvestmentContract).where(InvestmentContract.id == contract_id, InvestmentContract.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession, startup: Startup, user: User, data: ContractCreate,
) -> InvestmentContract:
    vehicle = InvestmentVehicle(data.vehicle)
    contract = InvestmentContract(
        startup_id=startup.id,
        ic_decision_id=data.ic_decision_id,
        investment_amount=data.investment_amount,
        pre_money_valuation=data.pre_money_valuation,
        equity_pct=data.equity_pct,
        vehicle=vehicle,
        follow_on_rights=data.follow_on_rights,
        information_rights=data.information_rights,
        lockup_months=data.lockup_months,
        reverse_vesting=data.reverse_vesting,
        conditions_precedent=data.conditions_precedent,
        representations_warranties=data.representations_warranties,
        closing_checklist={**CLOSING_CHECKLIST_TEMPLATE},
    )
    db.add(contract)
    await db.flush()

    await activity_log_service.log(
        db, user.id, "create",
        {"entity": "investment_contract", "amount": data.investment_amount},
        startup_id=startup.id,
    )

    await db.refresh(contract)
    return contract


async def update(
    db: AsyncSession,
    contract: InvestmentContract,
    data: ContractUpdate,
    user: User,
    startup: Startup,
) -> InvestmentContract:
    """계약 수정 — 상태 전환 + 자동화 #5 (클로징 체크리스트 완료 감지)"""
    update_data = data.model_dump(exclude_unset=True)

    # 상태 전환
    if "status" in update_data and update_data["status"] is not None:
        contract.status = ContractStatus(update_data.pop("status"))

    for field, value in update_data.items():
        setattr(contract, field, value)

    db.add(contract)

    # 자동화 #5: OPS-F01 10항목 전체 completed → 클로징
    if contract.closing_checklist:
        all_completed = all(
            v == "completed" for v in contract.closing_checklist.values()
        )
        if all_completed and contract.closed_at is None:
            contract.status = ContractStatus.COMPLETED
            contract.closed_at = datetime.now(timezone.utc)

            # Cap Table 자동 생성
            await cap_table_service.create_from_contract(db, contract)

            # Startup 포트폴리오 전환
            startup.is_portfolio = True

            # DealStage → CLOSED
            # NOTE: move_stage(CLOSED) 내부에서 review_to_incubation 인계 자동 트리거 (FR-02)
            # 중복 방지는 handover_service._create_handover()의 guard에서 처리
            await deal_flow_service.move_stage(
                db, startup, DealStage.CLOSED, user,
                notes="OPS-F01 10항목 완료 → 계약 클로징",
            )

            # FR-05: 계약 클로징 → 백오피스 전체 브로드캐스트 (FR-02와 별개 경로)
            from app.services import handover_service
            await handover_service.create_backoffice_broadcast(
                db, startup, user,
                contract_status="completed",
                risk_alert=None,
                document_updates=["계약 체결 완료", "Cap Table 자동 생성"],
            )

    await db.flush()

    await activity_log_service.log(
        db, user.id, "update",
        {"entity": "investment_contract", "status": contract.status.value},
        startup_id=contract.startup_id,
    )

    await db.refresh(contract)
    return contract

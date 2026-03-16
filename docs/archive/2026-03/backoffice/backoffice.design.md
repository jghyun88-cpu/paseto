# Design: 백오피스팀 모듈 (Phase 4)

> **Feature**: backoffice
> **Plan Reference**: `docs/01-plan/features/backoffice.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 InvestmentContract (`models/contract.py`)

```python
from decimal import Decimal

class InvestmentContract(Base):
    __tablename__ = "investment_contracts"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]          # FK → startups
    ic_decision_id: Mapped[uuid.UUID]      # FK → ic_decisions
    status: Mapped[ContractStatus]         # Enum 7단계

    # 투자 조건
    investment_amount: Mapped[int]         # 원
    pre_money_valuation: Mapped[int]       # 원
    equity_pct: Mapped[Decimal]            # Numeric(10,4)
    vehicle: Mapped[InvestmentVehicle]     # Enum
    follow_on_rights: Mapped[bool]
    information_rights: Mapped[bool]
    lockup_months: Mapped[int | None]
    reverse_vesting: Mapped[bool]
    conditions_precedent: Mapped[dict | None]  # 선행조건 JSON
    representations_warranties: Mapped[str | None]

    # 문서 추적
    termsheet_doc_id: Mapped[str | None]
    sha_doc_id: Mapped[str | None]
    sha_agreement_doc_id: Mapped[str | None]
    articles_amendment_doc_id: Mapped[str | None]
    board_minutes_doc_id: Mapped[str | None]

    # OPS-F01 클로징 체크리스트 (10항목 JSON)
    closing_checklist: Mapped[dict | None]

    signed_at: Mapped[datetime | None]
    closed_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.2 CapTableEntry (`models/cap_table.py`)

```python
class CapTableEntry(Base):
    __tablename__ = "cap_table_entries"

    id: Mapped[uuid.UUID]
    startup_id: Mapped[uuid.UUID]          # FK → startups
    shareholder_name: Mapped[str]
    share_type: Mapped[str]                # common / preferred / rcps / option
    shares: Mapped[int]
    ownership_pct: Mapped[Decimal]         # Numeric(10,4)
    investment_amount: Mapped[int | None]
    investment_date: Mapped[date | None]
    round_name: Mapped[str | None]
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
```

### 1.3 Fund (`models/fund.py`)

```python
class Fund(Base):
    __tablename__ = "funds"

    id: Mapped[uuid.UUID]
    fund_name: Mapped[str]
    fund_type: Mapped[str]               # individual_union / venture_fund / self_capital / gov_linked
    total_amount: Mapped[int]
    committed_amount: Mapped[int]
    deployed_amount: Mapped[int]
    remaining_amount: Mapped[int]
    formation_date: Mapped[date]
    expiry_date: Mapped[date | None]
    gp_entity: Mapped[str]
    status: Mapped[str]                  # forming / active / winding_down / dissolved
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

### 1.4 FundLP (`models/fund_lp.py`)

```python
class FundLP(Base):
    __tablename__ = "fund_lps"

    id: Mapped[uuid.UUID]
    fund_id: Mapped[uuid.UUID]           # FK → funds
    lp_name: Mapped[str]
    lp_type: Mapped[str]                 # individual / corporate / institutional / government
    committed_amount: Mapped[int]
    paid_in_amount: Mapped[int]
    contact_name: Mapped[str | None]
    contact_email: Mapped[str | None]
    notes: Mapped[str | None]
    created_at: Mapped[datetime]

class FundInvestment(Base):
    __tablename__ = "fund_investments"

    id: Mapped[uuid.UUID]
    fund_id: Mapped[uuid.UUID]           # FK → funds
    startup_id: Mapped[uuid.UUID]        # FK → startups
    contract_id: Mapped[uuid.UUID | None]  # FK → investment_contracts
    amount: Mapped[int]
    invested_at: Mapped[date]
    notes: Mapped[str | None]
    created_at: Mapped[datetime]
```

---

## 2. API 설계

### 2.1 Contracts API (`routers/contracts.py`)

| Method | Path | Request | Response | RBAC |
|--------|------|---------|----------|------|
| GET | `/api/v1/contracts/` | `?startup_id=` | `list[ContractResponse]` | contract: full |
| GET | `/api/v1/contracts/{id}` | - | `ContractResponse` | contract: full |
| POST | `/api/v1/contracts/` | `ContractCreate` | `ContractResponse` | contract: full |
| PATCH | `/api/v1/contracts/{id}` | `ContractUpdate` | `ContractResponse` | contract: full |

**자동화 #5**: PATCH 시 closing_checklist 10항목 전체 "completed" →
- status = COMPLETED
- closed_at = now()
- CapTableEntry 자동 생성
- Startup.is_portfolio = True
- DealStage → CLOSED

### 2.2 Cap Table API (`routers/cap_table.py`)

| Method | Path | Request | Response | RBAC |
|--------|------|---------|----------|------|
| GET | `/api/v1/cap-table/` | `?startup_id=` | `list[CapTableResponse]` | cap_table: read |
| POST | `/api/v1/cap-table/` | `CapTableCreate` | `CapTableResponse` | cap_table: full |
| PATCH | `/api/v1/cap-table/{id}` | `CapTableUpdate` | `CapTableResponse` | cap_table: full |

### 2.3 Funds API (`routers/funds.py`)

| Method | Path | Request | Response | RBAC |
|--------|------|---------|----------|------|
| GET | `/api/v1/funds/` | - | `list[FundResponse]` | contract: full |
| GET | `/api/v1/funds/{id}` | - | `FundResponse` | contract: full |
| POST | `/api/v1/funds/` | `FundCreate` | `FundResponse` | contract: full |
| PATCH | `/api/v1/funds/{id}` | `FundUpdate` | `FundResponse` | contract: full |
| GET | `/api/v1/funds/{id}/lps/` | - | `list[FundLPResponse]` | contract: full |
| POST | `/api/v1/funds/{id}/lps/` | `FundLPCreate` | `FundLPResponse` | contract: full |
| GET | `/api/v1/funds/{id}/investments/` | - | `list[FundInvestmentResponse]` | contract: full |
| POST | `/api/v1/funds/{id}/investments/` | `FundInvestmentCreate` | `FundInvestmentResponse` | contract: full |

---

## 3. 서비스 설계

### 3.1 contract_service.py

```
create(db, startup, ic_decision, user, data) → InvestmentContract
  + closing_checklist 초기화 (10항목 "pending")
  + ActivityLog

update(db, contract, data, user, startup) → InvestmentContract
  + 상태 전환 검증 (ContractStatus 순서)
  + 자동화 #5: 10항목 전체 completed → 클로징 로직:
    1. contract.status = COMPLETED, closed_at = now()
    2. CapTableEntry 자동 생성 (cap_table_service.create_from_contract)
    3. startup.is_portfolio = True
    4. DealStage → CLOSED (deal_flow_service.move_stage)
  + ActivityLog

get_by_startup(db, startup_id) → list[InvestmentContract]
get_by_id(db, contract_id) → InvestmentContract | None
```

### 3.2 cap_table_service.py

```
get_by_startup(db, startup_id) → list[CapTableEntry]
create(db, data, user) → CapTableEntry + ActivityLog
update(db, entry, data, user) → CapTableEntry + ActivityLog
create_from_contract(db, contract) → CapTableEntry
  # contract 조건에서 자동 생성 (자동화 #5 내부 호출)
```

### 3.3 fund_service.py

```
list_all(db) → list[Fund]
get_by_id(db, fund_id) → Fund | None
create(db, data, user) → Fund + ActivityLog
update(db, fund, data, user) → Fund + ActivityLog
recalculate_amounts(db, fund) → Fund
  # FundInvestment 합산 → deployed/remaining 재계산
```

### 3.4 fund_lp_service.py

```
get_by_fund(db, fund_id) → list[FundLP]
create_lp(db, fund, data, user) → FundLP + ActivityLog

get_investments_by_fund(db, fund_id) → list[FundInvestment]
create_investment(db, fund, data, user) → FundInvestment
  + Fund.deployed_amount 자동 증가
  + Fund.remaining_amount 자동 감소
  + ActivityLog
```

---

## 4. OPS-F01 클로징 체크리스트 JSON 구조

```json
{
  "투자조건협의완료": "pending",
  "정관개정안확인": "pending",
  "이사회주총의사록": "pending",
  "신주인수계약서서명": "pending",
  "주주간계약서서명": "pending",
  "선행조건이행확인": "pending",
  "투자금입금확인": "pending",
  "등기변경신청": "pending",
  "증권발행확인": "pending",
  "캡테이블업데이트": "pending"
}
```

각 항목: `"pending"` | `"completed"` | `"issue"`

---

## 5. ContractStatus 상태 전환 규칙

```
IC_RECEIVED → TERM_SHEET → LEGAL_REVIEW → SIGNING → DISBURSEMENT → COMPLETED → POST_FILING
```

- 역방향 전환 금지 (예외: partner 역할)
- COMPLETED 전환 조건: closing_checklist 10항목 전체 "completed"

---

## 6. 구현 순서

```
Step 1: models/contract.py + models/cap_table.py + Alembic 마이그레이션
Step 2: models/fund.py + models/fund_lp.py (FundLP + FundInvestment) + Alembic
Step 3: schemas/contract.py + schemas/cap_table.py
Step 4: schemas/fund.py + schemas/fund_lp.py
Step 5: contract_service.py (CRUD + 상태 전환 + 자동화 #5)
Step 6: cap_table_service.py + fund_service.py + fund_lp_service.py
Step 7: routers/contracts.py + routers/cap_table.py + routers/funds.py
Step 8: main.py 라우터 등록 + errors.py 에러 추가
Step 9: Backend 통합 테스트 (15개 엔드포인트)
```

---

## 7. 파일 목록 (19파일)

### 모델 (4개)
```
backend/app/models/contract.py
backend/app/models/cap_table.py
backend/app/models/fund.py
backend/app/models/fund_lp.py
```

### 스키마 (4개)
```
backend/app/schemas/contract.py
backend/app/schemas/cap_table.py
backend/app/schemas/fund.py
backend/app/schemas/fund_lp.py
```

### 서비스 (4개)
```
backend/app/services/contract_service.py
backend/app/services/cap_table_service.py
backend/app/services/fund_service.py
backend/app/services/fund_lp_service.py
```

### 라우터 (3개)
```
backend/app/routers/contracts.py
backend/app/routers/cap_table.py
backend/app/routers/funds.py
```

### 마이그레이션 (1개)
```
backend/alembic/versions/xxx_phase4_backoffice.py
```

### 수정 (2개)
```
backend/app/main.py
backend/app/errors.py
```

### 테스트 (3개)
```
backend/tests/test_contracts.py
backend/tests/test_cap_table.py
backend/tests/test_funds.py
```

# Soft Delete 일관성 확보 — Design

## 1. 변경 대상 상세

### 1.1 모델 변경 (9파일, 11모델)

각 모델에 추가할 코드:
```python
# import 추가 (Boolean 없는 파일만)
from sqlalchemy import Boolean

# 필드 추가 (updated_at 또는 created_at 직전)
is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
```

| # | 모델 | 파일 | Boolean import 필요 | 비고 |
|---|------|------|:---:|------|
| 1 | Screening | `models/screening.py` | 확인 필요 | |
| 2 | Review | `models/review.py` | 확인 필요 | |
| 3 | InvestmentMemo | `models/investment_memo.py` | 확인 필요 | |
| 4 | ICDecision | `models/ic_decision.py` | 확인 필요 | |
| 5 | InvestmentContract | `models/contract.py` | 아니오 (이미 있음) | |
| 6 | CapTableEntry | `models/cap_table.py` | 확인 필요 | |
| 7 | HandoverDocument | `models/handover.py` | 확인 필요 | |
| 8 | Batch | `models/batch.py` | 확인 필요 | 서비스/라우터 없음 |
| 9 | FundLP | `models/fund.py` | 아니오 (이미 있음) | Fund와 같은 파일 |
| 10 | FundInvestment | `models/fund.py` | 아니오 (이미 있음) | Fund와 같은 파일 |
| 11 | Mentor | `models/mentor.py` | 확인 필요 | |

### 1.2 Alembic 마이그레이션

**파일명**: `e5f6g7h8i9j0_add_is_deleted_to_11_models.py`

```python
# 11개 테이블에 is_deleted 컬럼 일괄 추가
tables = [
    "screenings", "reviews", "investment_memos", "ic_decisions",
    "investment_contracts", "cap_table_entries", "handover_documents",
    "batches", "fund_lps", "fund_investments", "mentors",
]
for table in tables:
    op.add_column(table, sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False))
```

- `server_default=sa.false()` → 기존 데이터 전부 False
- `nullable=False` → NOT NULL 제약
- downgrade: 역순으로 `op.drop_column`

### 1.3 서비스 레이어 수정 (10파일)

각 서비스의 조회 함수에 `is_deleted == False` 필터 추가:

| 서비스 | 함수 | 현재 필터 | 추가할 필터 |
|--------|------|-----------|-------------|
| `screening_service.py` | `get_by_startup()` | 없음 | `.where(Screening.is_deleted == False)` |
| `screening_service.py` | `get_by_id()` | 없음 | `.where(Screening.is_deleted == False)` |
| `review_service.py` | `get_by_startup()` | 없음 | `.where(Review.is_deleted == False)` |
| `review_service.py` | `get_by_id()` | 없음 | `.where(Review.is_deleted == False)` |
| `investment_memo_service.py` | `get_by_startup()` | 없음 | `.where(InvestmentMemo.is_deleted == False)` |
| `investment_memo_service.py` | `get_by_id()` | 없음 | `.where(InvestmentMemo.is_deleted == False)` |
| `ic_decision_service.py` | `get_by_startup()` | 없음 | `.where(ICDecision.is_deleted == False)` |
| `ic_decision_service.py` | `get_by_id()` | 없음 | `.where(ICDecision.is_deleted == False)` |
| `contract_service.py` | `get_by_startup()` | 없음 | `.where(InvestmentContract.is_deleted == False)` |
| `contract_service.py` | `get_by_id()` | 없음 | `.where(InvestmentContract.is_deleted == False)` |
| `cap_table_service.py` | `get_by_startup()` | 없음 | `.where(CapTableEntry.is_deleted == False)` |
| `cap_table_service.py` | `get_by_id()` | 없음 | `.where(CapTableEntry.is_deleted == False)` |
| `handover_service.py` | `get_list()` | 없음 | `.where(HandoverDocument.is_deleted == False)` |
| `handover_service.py` | `get_by_id()` | 없음 | `.where(HandoverDocument.is_deleted == False)` |
| `fund_lp_service.py` | `get_all_lps()` | 없음 | `.where(FundLP.is_deleted == False)` |
| `fund_lp_service.py` | `get_lps_by_fund()` | 없음 | `.where(FundLP.is_deleted == False)` |
| `fund_lp_service.py` | `get_investments_by_fund()` | 없음 | `.where(FundInvestment.is_deleted == False)` |
| `mentor_service.py` | `get_list()` | 없음 | `.where(Mentor.is_deleted == False)` |
| `mentor_service.py` | `get_by_id()` | 없음 | `.where(Mentor.is_deleted == False)` |

**패턴**: `# noqa: E712` 주석 추가 (== False 린트 경고 억제)

### 1.4 Batch 모델 (서비스/라우터 없음)

Batch는 서비스/라우터가 없으므로 모델에 `is_deleted` 필드만 추가. 향후 배치 관리 기능 구현 시 서비스에서 필터 적용.

---

## 2. 구현 순서

```
Step 1: 모델 변경 (9파일)
  ├── screening.py, review.py, investment_memo.py, ic_decision.py
  ├── contract.py, cap_table.py, handover.py, batch.py
  ├── fund.py (FundLP + FundInvestment)
  └── mentor.py
       ↓
Step 2: Alembic 마이그레이션 생성
  └── e5f6g7h8i9j0_add_is_deleted_to_11_models.py
       ↓
Step 3: 마이그레이션 적용 (Docker)
  └── docker compose exec backend alembic upgrade head
       ↓
Step 4: 서비스 쿼리 필터 추가 (10파일)
  ├── screening_service, review_service, investment_memo_service
  ├── ic_decision_service, contract_service, cap_table_service
  ├── handover_service, fund_lp_service, mentor_service
  └── (batch — 서비스 없으므로 건너뜀)
       ↓
Step 5: 검증
  ├── Docker import 테스트
  └── 서버 기동 확인
```

---

## 3. 변경하지 않는 것

- DELETE 라우터 엔드포인트 추가: 현재 11개 모델 모두 DELETE 엔드포인트 없음. 이번 범위는 **필드 + 필터만**. DELETE API는 별도 기능 요청 시 추가
- 기존 모델의 SoftDeleteMixin 전환: 21개 모델의 수동 is_deleted를 mixin으로 리팩토링하지 않음
- dashboard_service의 HandoverDocument 쿼리: 이미 `acknowledged_by.is_(None)` 필터 사용 중, is_deleted 추가는 선택적

---

## 4. 검증 기준

| 항목 | 기준 |
|------|------|
| 모델 필드 | 11개 모델 전체에 `is_deleted: Mapped[bool]` 존재 |
| 마이그레이션 | `alembic upgrade head` 성공 |
| 서비스 필터 | 18개 조회 함수에 `is_deleted == False` 필터 존재 |
| Import 테스트 | 전체 모듈 import 에러 없음 |
| 서버 기동 | `/health` 정상 응답 |

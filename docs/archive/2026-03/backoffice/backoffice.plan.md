# Plan: 백오피스팀 모듈 (Phase 4)

> **Feature**: backoffice
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 4 — 백오피스팀 모듈

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | IC 승인 후 계약~집행~사후관리가 수동으로 진행되어 계약 누락, 집행 지연, Cap Table 불일치, 보고 기한 초과가 반복된다 |
| **Solution** | 계약 워크플로우 7단계(IC접수→텀시트→법률→서명→집행→완료→사후), 클로징 체크리스트 10항목, Cap Table 자동 반영, 조합/LP 관리, 보고 센터 |
| **Function UX Effect** | IC 승인 시 OPS-F01 자동 생성, 10항목 완료 시 Contract closed + Cap Table 자동 업데이트, 보고 마감 7/3/당일 자동 리마인더 |
| **Core Value** | 투자 계약 100% 추적 + Cap Table 실시간 정확도 + 보고 기한 준수율 향상 → 컴플라이언스 리스크 제거 |

---

## 1. 목표 및 범위

### 1.1 목표
IC 승인 이후 투자 계약 체결 → 투자금 집행 → Cap Table 관리 → 조합/LP 관리 → 보고/컴플라이언스까지 백오피스 전 업무를 디지털화한다.

### 1.2 범위

| 포함 | 제외 |
|------|------|
| InvestmentContract CRUD + 7단계 워크플로우 | 전자서명 연동 (외부 API) |
| OPS-F01 클로징 체크리스트 10항목 | Pre-closing 7항목 (§36, 확장 시) |
| Cap Table CRUD + 자동 반영 | 고급 밸류에이션 모델링 |
| Fund / FundLP / FundInvestment CRUD | LP 보고서 자동 PDF 생성 |
| 보고 일정 캘린더 (OPS-F02) | Celery 기반 자동 리마인더 (Phase 7) |
| 자동화 #5: OPS-F01 완료 → closed + Cap Table | 자동화 #9: OPS-F02 리마인더 (Phase 7) |

### 1.3 완료 기준
- InvestmentContract 7단계 상태 전환 API 동작
- OPS-F01 10항목 체크리스트 PATCH + 전체 완료 시 자동 closed (자동화 #5)
- Cap Table CRUD + Contract closed 시 자동 엔트리 생성
- Fund/FundLP/FundInvestment CRUD
- 보고 일정 등록/조회 API

---

## 2. 기술 요구사항

### 2.1 Backend 신규 모델 (4개)

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| InvestmentContract | `models/contract.py` | ic_decision_id, status(ContractStatus), investment_amount, pre_money_valuation, equity_pct(Decimal), vehicle(InvestmentVehicle), 문서 ID 5개, closing_checklist(JSON 10항목) |
| CapTableEntry | `models/cap_table.py` | startup_id, shareholder_name, share_type, shares, ownership_pct(Decimal), round_name |
| Fund | `models/fund.py` | fund_name, fund_type, total/committed/deployed/remaining_amount, formation_date, expiry_date, status |
| FundLP | `models/fund_lp.py` | fund_id(FK), lp_name, lp_type, committed_amount, paid_in_amount |

### 2.2 Backend 신규 API

| Method | Endpoint | 기능 | RBAC |
|--------|----------|------|------|
| GET | `/api/v1/contracts/` | 계약 목록 | contract: full(backoffice) |
| GET | `/api/v1/contracts/{id}` | 계약 상세 | contract: full |
| POST | `/api/v1/contracts/` | 계약 생성 | contract: full |
| PATCH | `/api/v1/contracts/{id}` | 계약 수정 (상태 전환 + 체크리스트) | contract: full |
| GET | `/api/v1/cap-table/?startup_id=` | Cap Table 조회 | cap_table: read(review) / full(backoffice) |
| POST | `/api/v1/cap-table/` | Cap Table 엔트리 추가 | cap_table: full |
| PATCH | `/api/v1/cap-table/{id}` | Cap Table 수정 | cap_table: full |
| GET | `/api/v1/funds/` | 조합 목록 | backoffice |
| GET | `/api/v1/funds/{id}` | 조합 상세 | backoffice |
| POST | `/api/v1/funds/` | 조합 생성 | backoffice |
| PATCH | `/api/v1/funds/{id}` | 조합 수정 | backoffice |
| GET | `/api/v1/funds/{id}/lps/` | LP 목록 | backoffice |
| POST | `/api/v1/funds/{id}/lps/` | LP 추가 | backoffice |
| GET | `/api/v1/funds/{id}/investments/` | 조합별 투자 내역 | backoffice |
| POST | `/api/v1/funds/{id}/investments/` | 투자 집행 등록 | backoffice |

### 2.3 Backend 신규 서비스 (4개)

| 서비스 | 핵심 로직 |
|--------|-----------|
| `contract_service.py` | 계약 CRUD, 상태 전환 (ContractStatus 7단계), OPS-F01 체크리스트 자동완료 (#5), Cap Table 자동 엔트리 |
| `cap_table_service.py` | Cap Table CRUD, 지분율 계산 |
| `fund_service.py` | Fund CRUD, deployed/remaining 자동 계산 |
| `fund_lp_service.py` | FundLP CRUD, FundInvestment CRUD |

### 2.4 핵심 자동화

**자동화 #5**: OPS-F01 10항목 전체 완료 → Contract status "completed" + Cap Table 자동 엔트리 생성

```
PATCH /contracts/{id} (closing_checklist 업데이트)
  → 10항목 전체 "completed"
  → contract.status = COMPLETED
  → contract.signed_at = now()
  → CapTableEntry 자동 생성 (shareholder=액셀러레이터, shares/pct=계약조건)
  → Startup.is_portfolio = True
  → DealStage → CLOSED
```

---

## 3. OPS-F01 클로징 체크리스트 (10항목)

```
1. 투자 조건 협의 완료
2. 정관 개정안 확인
3. 이사회/주총 의사록
4. 신주인수계약서(SHA) 서명
5. 주주간계약서(SHA Agreement) 서명
6. 선행조건(CP) 이행 확인
7. 투자금 입금 확인
8. 등기 변경 신청
9. 증권 발행 확인
10. Cap Table 업데이트
```

---

## 4. 구현 순서

```
Step 1: InvestmentContract + CapTableEntry 모델 + Alembic 마이그레이션
Step 2: Fund + FundLP + FundInvestment 모델 + Alembic 마이그레이션
Step 3: 스키마 (contract, cap_table, fund, fund_lp)
Step 4: contract_service (7단계 워크플로우 + 자동화 #5)
Step 5: cap_table_service + fund_service + fund_lp_service
Step 6: 라우터 (contracts, cap_table, funds) + main.py 등록
Step 7: errors.py 에러 함수 추가
Step 8: Backend 통합 테스트
```

---

## 5. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1 (인증 + Startup CRUD) | ✅ 완료 |
| Phase 3 (ICDecision → CONTRACT 자동 전환) | ✅ 완료 |
| ContractStatus Enum | ✅ enums.py에 존재 |
| InvestmentVehicle Enum | ✅ enums.py에 존재 |
| DealFlow.move_stage | ✅ 구현됨 |
| ActivityLog 서비스 | ✅ 구현됨 |
| RBAC (contract, cap_table) | ✅ rbac.py에 존재 |

---

## 6. 파일 목록 (예상 ~20파일)

### Backend 신규 (~16파일)
```
backend/app/models/contract.py
backend/app/models/cap_table.py
backend/app/models/fund.py
backend/app/models/fund_lp.py
backend/app/schemas/contract.py
backend/app/schemas/cap_table.py
backend/app/schemas/fund.py
backend/app/schemas/fund_lp.py
backend/app/services/contract_service.py
backend/app/services/cap_table_service.py
backend/app/services/fund_service.py
backend/app/services/fund_lp_service.py
backend/app/routers/contracts.py
backend/app/routers/cap_table.py
backend/app/routers/funds.py
backend/alembic/versions/xxx_phase4_backoffice.py
```

### Backend 수정
```
backend/app/main.py (3개 라우터 등록)
backend/app/errors.py (contract/cap_table/fund 에러 추가)
```

### 테스트 (~3파일)
```
backend/tests/test_contracts.py
backend/tests/test_cap_table.py
backend/tests/test_funds.py
```

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Decimal 타입 금액 처리 | 정밀도 이슈 | SQLAlchemy Numeric(precision=20, scale=2) + Pydantic condecimal |
| OPS-F01 자동화 #5 복잡도 | 트랜잭션 무결성 | contract_service 내 단일 트랜잭션으로 처리 (contract + cap_table + startup 동시 업데이트) |
| Fund 잔여금액 정합성 | deployed/remaining 불일치 | FundInvestment 생성 시 Fund.deployed/remaining 자동 재계산 |
| IC 승인 → Contract 자동 생성 | Phase 3 #4와 연동 | Phase 4에서는 수동 생성, Phase 7에서 자동화 #4 확장 |

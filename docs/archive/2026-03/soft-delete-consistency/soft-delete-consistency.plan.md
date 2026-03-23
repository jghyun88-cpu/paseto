# Soft Delete 일관성 확보 — Plan

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 39개 모델 중 16개(41%)에 `is_deleted` 필드가 없어 soft delete 규칙("삭제는 soft delete만") 위반. 물리 삭제 또는 삭제 불가 상태 |
| **Solution** | 비즈니스 데이터 모델 11개에 `is_deleted` 필드 추가 + Alembic 마이그레이션 + 서비스/라우터 쿼리 필터 보강 |
| **Function UX Effect** | 실수 삭제 시 복구 가능, 삭제된 데이터가 목록에서 자연스럽게 사라짐, 감사 추적 유지 |
| **Core Value** | 데이터 정합성 + 프로젝트 규칙 100% 준수 + 운영 안전성 확보 |

---

## 1. 현황 분석

### 1.1 is_deleted 보유 현황 (39개 모델)

| 상태 | 건수 | 비율 |
|------|------|------|
| is_deleted 있음 (수동 정의) | 21 | 54% |
| is_deleted 있음 (SoftDeleteMixin) | 2 | 5% |
| **is_deleted 없음** | **16** | **41%** |

### 1.2 is_deleted 미보유 모델 분류

#### A. Soft delete 추가 필요 (11개 — 비즈니스 데이터)

| # | 모델 | 테이블 | 사유 |
|---|------|--------|------|
| 1 | Screening | screenings | 스크리닝 이력, 삭제 시 딜플로우 참조 무결성 |
| 2 | Review | reviews | 심사 기록, 삭제 시 DD/IC 참조 깨짐 |
| 3 | InvestmentMemo | investment_memos | 투자 메모, IC 의사결정 근거 |
| 4 | ICDecision | ic_decisions | IC 결정, 법적 기록 보존 필요 |
| 5 | InvestmentContract | investment_contracts | 계약, 법적 문서 삭제 불가 |
| 6 | CapTableEntry | cap_table_entries | 지분 기록, 재무 무결성 |
| 7 | HandoverDocument | handover_documents | 인계 문서, 감사 추적 |
| 8 | Batch | batches | 배치/기수, 소속 포트폴리오 참조 |
| 9 | FundLP | fund_lps | 출자자 기록, 펀드 금액 계산 참조 |
| 10 | FundInvestment | fund_investments | 투자 집행 기록, 펀드 잔액 계산 |
| 11 | Mentor | mentors | 멘토 프로필, 멘토링 세션 참조 |

#### B. Soft delete 불필요 (5개 — 설계상 제외)

| 모델 | 사유 |
|------|------|
| ActivityLog | 불변 감사 로그 — 삭제 자체가 감사 위반 |
| DealFlow | 불변 상태 이력 — 딜 진행 히스토리 |
| Notification | 읽음/안읽음 관리, 삭제 개념 없음 |
| OrganizationSettings | 싱글턴 설정, 삭제 개념 없음 |
| User | 별도 방식 (is_active + email prefix) |

---

## 2. 구현 계획

### 2.1 모델 변경 (11파일)

각 모델에 추가할 필드:
```python
is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
```

Boolean import가 없는 파일은 import 추가.

### 2.2 Alembic 마이그레이션

단일 마이그레이션 파일로 11개 테이블에 `is_deleted` 컬럼 일괄 추가:
- 타입: `Boolean`, `server_default=false`, `nullable=False`
- 기존 데이터: 전부 `False` (삭제된 것 없음)

### 2.3 서비스 레이어 수정

각 서비스의 `list` / `get_by_id` 쿼리에 `.where(Model.is_deleted == False)` 필터 추가.
`delete` 함수가 없는 서비스에 `soft_delete()` 함수 추가.

대상 서비스:
- screening_service, review_service, investment_memo_service
- ic_decision_service, contract_service, cap_table_service
- handover_service, batch_service (없으면 생성)
- fund_lp_service (FundLP, FundInvestment)
- mentor_service

### 2.4 라우터 레이어 수정

DELETE 엔드포인트가 있는 라우터: soft delete 호출로 변경.
DELETE 엔드포인트가 없는 라우터: 필요 시 추가 (선택).

---

## 3. 구현 순서

| 순서 | 작업 | 예상 파일 수 |
|------|------|-------------|
| 1 | 11개 모델에 `is_deleted` 필드 추가 | 9파일 (fund.py에 2모델) |
| 2 | Alembic 마이그레이션 생성 + 적용 | 1파일 |
| 3 | 서비스 쿼리 필터 + soft_delete 함수 | ~10파일 |
| 4 | 라우터 DELETE 엔드포인트 확인 | ~5파일 |
| 5 | Docker 검증 (import + 서버 기동) | — |

---

## 4. 제외 범위

- BaseMixin/SoftDeleteMixin 리팩토링: 기존 21개 모델의 수동 정의를 mixin으로 변환하는 것은 이번 범위에서 **제외** (변경량 과다, 위험 대비 효과 낮음)
- User 모델 is_deleted 추가: 기존 is_active + email prefix 방식 유지 (별도 리팩토링 필요)
- 쿼리 성능 인덱스: `is_deleted` 컬럼에 partial index 추가는 데이터량 증가 후 판단

---

## 5. 리스크

| 리스크 | 대응 |
|--------|------|
| 마이그레이션 실패 | `server_default=false`로 기존 데이터 영향 없음. 롤백 가능 |
| 서비스 쿼리 누락 | gap-detector로 검증 |
| FK 참조 깨짐 | soft delete는 레코드 유지하므로 FK 무결성 보존 |

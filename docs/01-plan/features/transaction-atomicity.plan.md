# 트랜잭션 원자성 확보 — Plan

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `deal_flow_service.move_stage()`가 독립 `db.commit()` 수행 → 호출한 서비스(screening, review, contract, ic_decision, form)에서 후속 에러 시 DealStage만 변경되고 나머지 롤백되는 데이터 불일치 |
| **Solution** | `move_stage()` 등 내부 서비스 함수에서 `db.commit()` 제거 → 호출 서비스가 모든 작업 완료 후 단일 커밋 (Unit of Work 패턴) |
| **Function UX Effect** | 스크리닝→인계, IC결정→계약, DD완료→IC상정 등 멀티스텝 워크플로우가 원자적으로 실행, 중간 실패 시 깔끔한 롤백 |
| **Core Value** | 딜 파이프라인 데이터 정합성 보장 — DealStage와 관련 엔티티 항상 동기화 |

---

## 1. 현황 분석

### 1.1 문제 서비스 (double/triple commit)

| 위험도 | 호출 서비스 | 호출되는 서비스 | 커밋 횟수 |
|--------|------------|---------------|-----------|
| HIGH | `screening_service.create()` | move_stage + handover + notification | 2회 (move_stage + screening) |
| HIGH | `contract_service.update()` | move_stage + cap_table | 2회 |
| HIGH | `form_service.submit_form()` | move_stage + screening.create | 3회 |
| MEDIUM | `ic_decision_service.create()` | move_stage | 2회 |
| MEDIUM | `review_service.update()` | move_stage | 2회 |

### 1.2 독립 커밋하는 내부 서비스 (root cause)

| 서비스 | 함수 | 커밋 위치 |
|--------|------|-----------|
| `deal_flow_service` | `move_stage()` | Line 91 |
| `cap_table_service` | `create_from_contract()` | Line 59 |

### 1.3 안전한 서비스 (커밋하지 않음)

- `activity_log_service.log()` — flush만, 커밋 안 함
- `notification_service.create()` / `notify_team()` — 세션에 추가만
- `handover_service.create_from_screening()` — flush만

---

## 2. 해결 방안

### Unit of Work 패턴

**원칙**: 서비스 함수는 `db.commit()`하지 않는다. 커밋은 라우터(또는 최외곽 서비스 함수)만 수행한다.

**변경 대상**:
1. `deal_flow_service.move_stage()` — `db.commit()` 제거, `db.flush()` 유지
2. `cap_table_service.create_from_contract()` — 이미 커밋 없음 (확인 완료)

**검증 대상** (이 함수들이 여전히 자체 커밋하는 것이 정상인지 확인):
- `screening_service.create()` — 최외곽, 커밋 유지
- `contract_service.update()` — 최외곽, 커밋 유지
- `review_service.update()` — 최외곽, 커밋 유지
- `ic_decision_service.create()` — 최외곽, 커밋 유지
- `form_service.submit_form()` — 최외곽이지만 screening.create() 호출 → screening 내부 커밋도 제거 필요

### 변경 범위

| 파일 | 변경 |
|------|------|
| `deal_flow_service.py` | `move_stage()`: `db.commit()` → `db.flush()` |
| `screening_service.py` | 이미 최외곽에서 커밋, 변경 없음 |
| `contract_service.py` | 이미 최외곽에서 커밋, 변경 없음 |
| `review_service.py` | 이미 최외곽에서 커밋, 변경 없음 |
| `ic_decision_service.py` | 이미 최외곽에서 커밋, 변경 없음 |
| `form_service.py` | `_trigger_src_f02()` → screening.create() 호출 시 커밋 중복 해결 필요 |

**핵심 변경은 1파일 (`deal_flow_service.py`)** — move_stage()의 commit을 flush로 변경.

단, `deal_flow_service.move_stage()`가 직접 라우터에서 호출되는 경우도 확인 필요 → 라우터에서 직접 호출 시 커밋 추가.

---

## 3. 구현 순서

| Step | 작업 | 파일 |
|------|------|------|
| 1 | `move_stage()` 호출 경로 전수 조사 | grep |
| 2 | `move_stage()` 내 `db.commit()` → `db.flush()` 변경 | deal_flow_service.py |
| 3 | 라우터에서 직접 move_stage() 호출하는 경우 커밋 추가 | deal_flows.py (라우터) |
| 4 | `form_service` 중첩 커밋 해결 | form_service.py |
| 5 | Docker 검증 + 워크플로우 테스트 | - |

---

## 4. 리스크

| 리스크 | 대응 |
|--------|------|
| move_stage가 라우터에서 직접 호출되면 커밋 누락 | Step 1에서 전수 조사 후 라우터에 커밋 추가 |
| 기존 워크플로우 동작 변경 | flush는 트랜잭션 내 가시성 보장, 기능상 동일 |
| 테스트 커버리지 없음 | Docker 기동 + API 수동 테스트로 검증 |

---

## 5. 제외 범위

- `@transactional` 데코레이터 도입: 과도한 추상화, 현재 패턴으로 충분
- 모든 서비스의 커밋 패턴 리팩토링: move_stage만 수정하면 5개 워크플로우 해결
- Savepoint/nested transaction: PostgreSQL 지원하지만 복잡도 대비 효과 낮음

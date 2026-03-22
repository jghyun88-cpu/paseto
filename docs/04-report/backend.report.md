# Backend 코드 품질 개선 — 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Backend 코드 품질 개선 (code-analyzer 기반) |
| **시작일** | 2026-03-22 |
| **완료일** | 2026-03-22 |
| **소요 시간** | 단일 세션 |

### 결과 요약

| 지표 | 값 |
|------|-----|
| Match Rate | 100% (14/14) |
| 수정 파일 수 | 14개 |
| CRITICAL 해결 | 5/5 |
| HIGH 해결 | 8/8 |
| Additional 해결 | 1/1 |
| Iteration 횟수 | 0 (1회 수정으로 100% 달성) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 하드코딩 시크릿, Celery 전면 크래시, RBAC 누락, 금액 타입 불일치, SQL 와일드카드 인젝션 취약점 등 배포 차단 수준의 보안·안정성 이슈 14건 |
| **Solution** | config 필수화, sync_session_maker 추가, RBAC 리소스/엔드포인트 보강, Decimal/BigInteger 타입 정합, escape_like 전면 적용, is_deleted 필터 보완, datetime UTC 통일 |
| **Function UX Effect** | Celery 스케줄 태스크 정상 작동, LP/KPI 무단 수정 차단, 검색 시 특수문자 안전 처리, 삭제 펀드 조회 방지 |
| **Core Value** | 운영 환경 배포 가능 상태 확보 — 보안 위험 제거, 데이터 정합성 보장, 권한 체계 일관성 확립 |

---

## 1. 분석 단계 (code-analyzer)

### 1.1 분석 범위
- `backend/app/` 전체 (~120 Python 파일)
- 모델 36개, 라우터 34개, 서비스 35개, 스키마 42개

### 1.2 품질 점수
- 분석 전: **72/100**
- 분석 후 (수정 완료): 예상 **88-90/100** (MEDIUM/LOW 12건 잔존)

### 1.3 발견 이슈 분류

| 심각도 | 건수 | 수정 대상 | 수정 완료 |
|--------|------|-----------|-----------|
| CRITICAL | 5 | 5 | 5 ✅ |
| HIGH | 10 | 8 (H9 설계결정, H10 중복 제외) | 8 ✅ |
| MEDIUM | 12 | 향후 과제 | — |
| LOW | 5 | 향후 과제 | — |

---

## 2. 수정 상세

### 2.1 CRITICAL (즉시 수정)

#### C1: config.py 하드코딩 시크릿 제거
- **파일**: `backend/app/config.py`
- **변경**: `DATABASE_URL`, `JWT_SECRET` 기본값 제거 → 환경변수 필수화
- **효과**: `.env` 미설정 시 기동 실패하여 프로덕션 시크릿 노출 방지

#### C2: Celery sync_session_maker 생성
- **파일**: `backend/app/database.py`
- **변경**: `sync_engine` (psycopg2) + `sync_session_maker` 추가
- **효과**: 4개 Celery 태스크 (crisis_scan, escalation, report_reminders, kpi_aggregation) ImportError 해소

#### C3: RBAC "startup" 리소스 추가
- **파일**: `backend/app/middleware/rbac.py`
- **변경**: PERMISSIONS에 `"startup"` 키 추가 (sourcing: full, 나머지: read)
- **효과**: ai_analysis, portfolio_issues 엔드포인트 비admin 사용자 접근 가능

#### C4: Fund benchmark_return_rate 타입 수정
- **파일**: `backend/app/models/fund.py`
- **변경**: `Mapped[float | None]` → `Mapped[Decimal | None]`
- **효과**: Numeric 컬럼과 Python 타입 정합 + 정밀도 보장

#### C5: Contract 금액 타입 수정
- **파일**: `backend/app/models/contract.py`
- **변경**: `investment_amount`, `pre_money_valuation`: `Integer` → `Numeric(20, 2)`
- **효과**: 21억 원 초과 투자금액 처리 가능 + Decimal 규칙 준수

### 2.2 HIGH (배포 전 수정)

#### H1-H2: datetime 타임존 통일
- **파일**: handover_service, review_service, contract_service, dashboard_service
- **변경**: `datetime.now()` / `datetime.utcnow()` → `datetime.now(timezone.utc)`
- **효과**: Docker 컨테이너 TZ 설정 무관하게 일관된 UTC 타임스탬프

#### H3-H5: escape_like() 적용
- **파일**: incubation_service, lp_service, partner_demand_service
- **변경**: `ilike(f"%{search}%")` → `escape_like(search)` + `escape="\\"`
- **효과**: `%`, `_` 특수문자 입력 시 SQL 와일드카드 인젝션 방지

#### H6: fund_service.get_by_id is_deleted 필터
- **파일**: `backend/app/services/fund_service.py`
- **변경**: `.where(Fund.id == fund_id)` → `.where(Fund.id == fund_id, Fund.is_deleted == False)`
- **효과**: soft delete된 펀드 조회/수정/투자 연결 차단

#### H7: LP 엔드포인트 RBAC 적용
- **파일**: `backend/app/routers/lps.py`
- **변경**: CUD 엔드포인트에 `require_permission("contract", "full")` 적용
- **효과**: backoffice/admin/partner만 LP 생성·수정·삭제 가능

#### H8: KPI 엔드포인트 RBAC 적용
- **파일**: `backend/app/routers/team_kpis.py`
- **변경**: create/seed에 `require_permission("kpi", "full")` 적용
- **효과**: incubation팀 이상만 KPI 생성 가능, 일반 사용자 차단

### 2.3 Additional

#### A1: follow_on_investment target_amount BigInteger
- **파일**: `backend/app/models/follow_on_investment.py`
- **변경**: `Integer` → `BigInteger` + import 추가
- **효과**: 후속투자 라운드 21억 원 초과 금액 저장 가능

---

## 3. 검증

### 3.1 Import 검증
Docker 컨테이너에서 12개 모듈 순차 import 테스트: **전체 통과**

### 3.2 서버 기동 검증
`docker compose restart backend` 후 Swagger UI (`/docs`) 정상 응답 확인

### 3.3 Gap 분석
- gap-detector 에이전트 실행: **14/14 항목 수정 확인**
- Match Rate: **100%**

---

## 4. 잔여 과제 (MEDIUM/LOW — 향후 스프린트)

| 우선순위 | 건수 | 주요 항목 |
|----------|------|-----------|
| MEDIUM | 12 | soft delete 미적용 모델 14개, N+1 쿼리 1건, CORS 과도 허용, 트랜잭션 원자성 |
| LOW | 5 | BaseMixin 미사용 모델, 트레일링 슬래시 비일관, 회의 쿼리 상한 누락 |

### 추천 후속 작업
1. `M4`: 14개 모델에 `SoftDeleteMixin` 추가 (Screening, DealFlow, HandoverDocument 등)
2. `M9`: 멀티 서비스 호출 시 트랜잭션 원자성 (savepoint 또는 단일 커밋 패턴)
3. `M6`: dashboard_service 위기 알림 N+1 쿼리 JOIN 최적화

---

## 5. PDCA 사이클 요약

```
[Plan] ⏭️ → [Design] ⏭️ → [Do] ✅ → [Check] ✅ (100%) → [Report] ✅
```

code-analyzer 결과를 Plan/Design 대용으로 활용한 단축 PDCA 사이클.
14건 전체 수정 + 검증 완료로 배포 차단 해제.

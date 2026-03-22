# eLSA — 딥테크 액셀러레이터 업무운영시스템

## 프로젝트 정의

딥테크 액셀러레이터의 **전주기 업무를 디지털화**하는 웹 기반 운영 플랫폼.
소싱 → 심사 → 투자 → 보육 → 수요기업 연결 → 후속투자 → 회수까지 하나의 파이프라인.

**핵심 원칙**: 릴레이 관리(팀 간 인계), 단일 기업 ID, 문서·KPI 기반 의사결정, soft delete 전용.

**대상 사용자**: 대표/파트너(IC), Sourcing팀, 심사팀, 보육팀, OI팀, 백오피스팀

**마스터 스펙**: `CLAUDE_CODE_MASTER_PROMPT_v6.1_FINAL.md` (Enum §3-2, 모델 §3-3, RBAC §7, 자동화 §18, 양식 §15, DealStage §44)

---

## 작업 행동 원칙

### 코딩 전 사고
- 가정을 명시적으로 밝힌다. 확신이 없으면 질문한다
- 다중 해석이 가능하면 선택지를 제시하고 선택을 기다린다
- 더 단순한 방법이 있으면 역제안한다. 필요 시 되물어라

### 최소주의
- 요청된 것 이상의 기능을 추가하지 않는다
- 일회용 코드에 추상화를 만들지 않는다
- 200줄이 50줄로 가능하면 다시 쓴다

### 수술적 변경
- 모든 변경된 줄은 사용자 요청에 직접 추적 가능해야 한다
- 인접 코드, 주석, 포맷을 "개선"하지 않는다
- 관련 없는 죽은 코드는 언급만 하고 삭제하지 않는다
- 내 변경으로 미사용된 임포트/변수만 정리한다

### 목표 기반 실행
- "버그 수정" → "버그 재현 테스트 작성 → 통과시킴"으로 변환
- 다단계 작업 시: `1. [단계] → 검증: [체크]` 형식으로 계획
- 완료 선언 전 반드시 실행 증거 (테스트, 빌드, diff)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 async |
| Frontend | Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui |
| DB | PostgreSQL 16, Alembic 마이그레이션 |
| Cache/Queue | Redis 7, Celery |
| Auth | JWT (HS256, 24h) + RBAC |
| State | zustand |
| Deploy | Docker Compose (7서비스), Cloudflare Tunnel (`winlsa.com`) |
| AI Agent | MCP 서버 (elsa-mcp) — 8개 에이전트 |

---

## Backend 규칙

- **아키텍처**: Router(HTTP) → Service(비즈니스 로직+ActivityLog) → Model(ORM)
- **Enum**: `enums.py`에 중앙 관리. 새 Enum은 여기에만 추가
- **에러**: `errors.py` 팩토리 함수. 메시지는 한글
- **금액**: Decimal 타입 (int/float 금지)
- **시간**: Asia/Seoul (KST)
- **삭제**: soft delete만 (`is_deleted` 필드). 조회 시 항상 필터
- **변경 추적**: 모든 변경은 activity_logs에 기록
- **PK**: UUID
- **세션**: `async with AsyncSession()` 패턴
- **Base**: `BaseMixin` 상속 (id, created_at, updated_at)
- **테이블명**: snake_case 복수형. FK: `{entity}_id`

---

## Frontend 규칙

- App Router 사용 (`pages/` 아님). 서버 컴포넌트 우선
- API 호출: `lib/api.ts` (axios + JWT 인터셉터)로 중앙화
- 상태: zustand (`hooks/useAuth.ts`)
- Enum 미러링: `lib/types.ts` ↔ `backend/app/enums.py` 동시 업데이트 필수
- 한글 UI, 날짜: `YYYY.MM.DD`
- 컴포넌트 400줄, 함수 50줄 제한

---

## API 규칙

- 경로: `/api/v1/{resource}/`
- **수정은 PATCH** (PUT 아님). 프론트에서 `api.patch()` 호출. PUT → 405 에러
- 페이지네이션 응답: `{ data, total, page, page_size, message }`
- 에러 응답: `{ detail: "한글 메시지", error_code: "CODE" }`
- 필터: `?industry=AI&stage=seed`, 검색: `?search=기업명`

---

## RBAC 권한 제한 (시스템 강제)

1. Sourcing팀: 최종 투자조건 결정 불가
2. 심사팀: 계약서 최종 보관/관리 단독 불가
3. 보육팀: 투자 약속, 밸류에이션 협상 불가
4. OI팀: 법적 구속력 있는 거래 약속 단독 불가
5. 백오피스: 투자 판단, 성장전략 수립 불가

역할: partner, analyst, pm, oi_manager, backoffice, admin
팀: sourcing, review, incubation, oi, backoffice

---

## DealStage 상태 머신

```
inbound → first_screening → deep_review → interview → due_diligence
→ ic_pending → ic_review → approved/conditional/on_hold/incubation_first/rejected
→ contract → closed → portfolio
```

단계 이동 시 DealFlow 자동 기록 + 인계 문서 자동 생성.

---

## 환경

```
필수 환경변수: DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL, REDIS_URL,
JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, TZ=Asia/Seoul,
NEXT_PUBLIC_API_URL, CORS_ORIGINS, CELERY_BROKER_URL
```

Docker: db(:5432), redis(:6379), backend(:8000), celery_worker, celery_beat, frontend(:3000), nginx(:80)
nginx: `/api/*` → backend, 나머지 → frontend

---

## 자주 발생하는 실수

1. **PUT vs PATCH**: 백엔드 `@router.patch` ↔ 프론트 `api.patch()` 필수
2. **Docker HMR**: Windows 볼륨 마운트 감지 실패 → `docker compose restart frontend`
3. **CORS**: 새 도메인 → `.env`의 `CORS_ORIGINS`에 추가
4. **Enum 동기화**: `enums.py` 변경 → `lib/types.ts` 동시 업데이트
5. **Soft Delete**: 조회 쿼리에 `is_deleted == False` 필터 누락 주의

---

## 도메인 참조 문서 (필요 시 읽기)

AI 에이전트 분석/보고서 작성 시 참조하는 비즈니스 문서:
- `docs/references/evaluation-rubric.md` — 스타트업 평가 루브릭 (100점)
- `docs/references/reporting-standards.md` — 보고서 형식 표준
- `docs/references/investment-criteria.md` — 투자 심사 기준
- `docs/references/quality-assurance.md` — 에이전트 출력 품질 기준
- `docs/references/batch-config.md` — 배치/프로그램별 설정
- `docs/references/compliance.md` — 컴플라이언스 규칙
- `docs/references/data-handling.md` — 데이터 등급별 취급 방침

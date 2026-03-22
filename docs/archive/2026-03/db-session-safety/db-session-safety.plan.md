# Plan: DB 세션 auto-commit 안전장치 (M1)

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `get_db()` 세션에서 정상 종료 시 auto-commit이 없어, 서비스에서 commit 누락 시 데이터가 저장되지 않는 사일런트 버그 발생 가능 |
| **Solution** | Unit of Work 패턴 도입 — `get_db()`에 commit/rollback 보장 로직 추가 또는 서비스별 commit 패턴 통일 |
| **Function/UX Effect** | 데이터 유실 사일런트 버그 방지, 트랜잭션 경계 명확화 |
| **Core Value** | 데이터 무결성 강화, 디버깅 비용 감소 |

## 배경

현재 `database.py`의 `get_db()`:
```python
async def get_db():
    async with AsyncSession(...) as session:
        yield session
```

- 정상 종료 시 commit이 자동으로 호출되지 않음
- 각 서비스가 개별적으로 `await db.commit()` 호출에 의존
- commit 누락 시 데이터가 DB에 반영되지 않지만 에러 없이 종료

## 선택지

### Option A: get_db()에 auto-commit 추가
```python
async def get_db():
    async with AsyncSession(...) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```
- 장점: 서비스에서 commit 호출 불필요, 일관성
- 단점: 기존 서비스의 `await db.commit()` 호출과 이중 commit 발생 가능 → 전수 제거 필요
- 영향 범위: database.py + 모든 서비스 파일 (~30개)

### Option B: 서비스 commit 패턴 감사 (현행 유지 + 검증)
- 모든 서비스의 write 경로에 commit 존재 여부 감사
- 누락된 곳에만 commit 추가
- 장점: 최소 변경
- 단점: 근본 해결 아님, 향후 새 서비스 작성 시 동일 실수 가능

### 권장: Option A
전면 전환 후 서비스의 개별 commit 제거. 일관된 트랜잭션 경계 확보.

## 영향 범위
- `backend/app/database.py`
- `backend/app/services/*.py` (전체 ~30개 파일)
- `backend/app/routers/deal_flows.py` (라우터 레벨 commit 제거)

## 위험 요소
- 이중 commit 시 SQLAlchemy는 에러 없이 처리하지만, 예상치 못한 동작 가능
- 마이그레이션 중 단계적 전환 필요 (한 번에 전체 변경)

## 검증 계획
1. 모든 write API 엔드포인트에 대해 실제 DB 반영 확인
2. 에러 발생 시 rollback 동작 확인
3. 동시 요청 시 트랜잭션 격리 확인

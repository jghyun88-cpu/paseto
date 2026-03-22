# Design: DB 세션 auto-commit 안전장치 (M1)

## 설계 결정

**Option A 채택**: `get_db()`에 auto-commit/rollback 추가, 서비스의 개별 commit 전수 제거.

## 변경 사항

### 1. database.py — UoW 패턴 적용
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()    # 정상 종료 시 auto-commit
        except Exception:
            await session.rollback()  # 에러 시 auto-rollback
            raise
```

### 2. services/*.py — 개별 commit 제거
- 30개 서비스 파일의 `await db.commit()` 77건 제거
- `await db.flush()` + `await db.refresh()` 는 유지 (flush는 SQL 전송만, commit 아님)

### 3. routers/deal_flows.py — 라우터 레벨 commit 제거
- L44: `await db.commit()` 제거

## 변환 규칙

| Before | After |
|--------|-------|
| `await db.commit()` | 삭제 |
| `await db.flush()` | 유지 (SQL 전송, commit과 별개) |
| `await db.refresh(obj)` | 유지 (객체 갱신) |

## 트랜잭션 흐름

```
Request → get_db() 세션 생성
  → Router → Service (flush + refresh)
  → 정상 종료 → get_db() auto-commit
  → 예외 발생 → get_db() auto-rollback → HTTPException 반환
```

## 대상 파일 (31개)
- database.py (수정)
- routers/deal_flows.py (commit 제거)
- services/ 30개 파일 (commit 제거)

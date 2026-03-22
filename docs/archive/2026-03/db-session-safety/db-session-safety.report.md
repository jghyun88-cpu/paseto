# Report: DB 세션 auto-commit 안전장치 (M1)

## 1. Executive Summary

### 1.1 개요

| 항목 | 값 |
|------|-----|
| **Feature** | db-session-safety |
| **우선순위** | M1 (Medium, 최우선) |
| **완료일** | 2026-03-22 |
| **Match Rate** | 100% (3/3) |
| **Iteration** | 0회 (첫 분석에서 100%) |
| **수정 파일** | 34개 |
| **변경량** | +50줄 / -91줄 (순감 41줄) |
| **커밋** | `23c91aa` |

### 1.2 PDCA 진행

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 100% → [Report] ✅
```

### 1.3 Value Delivered

| 관점 | 결과 |
|------|------|
| **Problem** | 서비스에서 `db.commit()` 누락 시 데이터가 사일런트하게 유실되는 구조적 결함 |
| **Solution** | `get_db()`에 UoW 패턴 도입 (auto-commit/rollback) + 서비스 77건 개별 commit 전수 제거 |
| **Function/UX Effect** | commit 누락 불가능한 구조 — 정상 종료 시 자동 commit, 예외 시 자동 rollback |
| **Core Value** | 데이터 무결성 보장, 향후 새 서비스 작성 시 commit 실수 원천 차단 |

---

## 2. 구현 결과

### 2.1 아키텍처 변경

```
Before:
  Request → get_db() → Router → Service(db.commit()) → Response
  * commit 누락 시 사일런트 유실

After:
  Request → get_db() → Router → Service(db.flush()) → get_db() auto-commit → Response
  * 예외 발생 → get_db() auto-rollback → HTTPException
```

### 2.2 변경 파일

| 범위 | 파일 수 | 변경 내용 |
|------|---------|----------|
| `database.py` | 1 | try/yield/commit + except/rollback/raise 추가 |
| `services/*.py` | 30 | `await db.commit()` 77건 제거 |
| `routers/deal_flows.py` | 1 | 라우터 레벨 commit 1건 제거 |
| `design.md` | 1 | Design 문서 동시 생성 |
| **합계** | **34** | **+50줄 / -91줄** |

### 2.3 변환 규칙

| Before | After | 이유 |
|--------|-------|------|
| `await db.commit()` | 삭제 | get_db()가 auto-commit 담당 |
| `await db.flush()` | 유지 | SQL 전송만, commit과 별개 |
| `await db.refresh(obj)` | 유지 | 객체 갱신용, commit 무관 |

---

## 3. Gap Analysis

### Match Rate: 100% (3/3)

| # | Design 명세 | 상태 |
|---|------------|------|
| 1 | `database.py` — UoW 패턴 (auto-commit/rollback) | ✅ |
| 2 | `services/*.py` — 개별 commit 77건 전수 제거 | ✅ (0건 잔존) |
| 3 | `routers/deal_flows.py` — commit 제거 | ✅ (0건 잔존) |

---

## 4. 설계 결정 기록

- **Option A 채택**: `get_db()`에 auto-commit 추가 + 서비스 개별 commit 전수 제거
- **Option B 기각**: 서비스별 commit 감사 (근본 해결 아님, 향후 실수 재발 가능)
- **핵심 판단**: 코드 41줄 순감(+50/-91)으로 더 적은 코드로 더 강한 보장 달성

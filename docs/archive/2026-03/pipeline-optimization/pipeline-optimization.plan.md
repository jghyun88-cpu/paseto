# Plan: 딜플로우 칸반 데이터 흐름 개선

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | pipeline-optimization |
| 작성일 | 2026-03-23 |
| 예상 변경 파일 | 1개 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 파이프라인 칸반이 전체 스타트업을 표시하여, 딜로 등록되지 않은 마스터 데이터까지 Inbound에 노출됨 |
| **Solution** | 딜 목록과 동일한 `has_deal_flow=true` 필터를 칸반 API 호출에 적용 |
| **Function UX Effect** | 칸반 Inbound에 딜 등록된 기업만 표시되어 실제 업무 흐름과 일치 |
| **Core Value** | 스타트업 등록(마스터) → 딜 등록(업무 시작) → 칸반 파이프라인의 명확한 데이터 계층 확립 |

---

## 1. 현재 문제

### 업무 흐름 (As-Is vs To-Be)

```
[올바른 업무 흐름]
스타트업 등록 (마스터 데이터) → 사전 미팅 → 딜 등록 (업무 시작) → 칸반 파이프라인
                                                    ↑
                                            DealFlow 레코드 생성

[현재 구현 (버그)]
스타트업 등록 → 즉시 칸반 Inbound에 표시 (딜 등록 여부 무관)
```

### 근본 원인

| 페이지 | API 호출 | 필터 |
|--------|---------|------|
| **딜 목록** (`/sourcing/deals`) | `GET /startups/?has_deal_flow=true` | DealFlow 있는 기업만 |
| **파이프라인 칸반** (`/sourcing/pipeline`) | `GET /startups/?page_size=100` | **필터 없음 (전체)** |

칸반 페이지가 `has_deal_flow` 파라미터를 누락하여 전체 스타트업이 표시됨.

---

## 2. 해결 방안

### 변경 내용

**파일**: `frontend/src/app/sourcing/pipeline/page.tsx` (1개 파일)

**변경**: API 호출 URL에 `has_deal_flow=true` 추가

```typescript
// Before
const res = await api.get<{ data: StartupItem[] }>("/startups/?page_size=100");

// After
const res = await api.get<{ data: StartupItem[] }>("/startups/?page_size=100&has_deal_flow=true");
```

### 변경하지 않는 것

- 백엔드: `has_deal_flow` 필터 이미 구현 완료 (`startup_service.get_list`)
- DB 모델: 변경 없음
- 딜 등록 로직: 변경 없음 (이미 `POST /deal-flows/move` → DealFlow 생성)

---

## 3. 데이터 흐름 (수정 후)

```
스타트업 등록 → startups 테이블 (current_deal_stage=inbound, DealFlow 없음)
                    ↓ 딜 등록 (/deal-flows/move, to_stage=inbound)
              DealFlow 레코드 생성
                    ↓
딜 목록: has_deal_flow=true → 표시 ✅
칸반:    has_deal_flow=true → 표시 ✅  ← 이 필터 추가
```

---

## 4. 검증 방법

1. 스타트업만 등록 (딜 미등록) → 칸반에 미표시 확인
2. 딜 등록 후 → 칸반 Inbound에 표시 확인
3. 딜 목록과 칸반 Inbound의 기업 목록 일치 확인

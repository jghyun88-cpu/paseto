# Completion Report: 딜플로우 칸반 데이터 흐름 개선

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | pipeline-optimization |
| 기간 | 2026-03-23 (단일 세션) |
| Match Rate | 100% |
| 변경 파일 | 3개 |
| 커밋 | 4건 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 파이프라인 칸반이 전체 스타트업을 조회하여 딜 미등록 마스터 데이터까지 Inbound에 노출 |
| **Solution** | 기존 `has_deal_flow=true` 필터를 칸반 API 호출에 적용 (백엔드 변경 없음) |
| **Function UX Effect** | 칸반 Inbound = 딜 목록과 동일한 기업만 표시, 업무 흐름과 일치 |
| **Core Value** | 스타트업(마스터) → 딜 등록(업무시작) → 칸반 파이프라인의 데이터 계층 확립 |

---

## 1. 문제 분석

### 근본 원인

파이프라인 칸반 페이지(`/sourcing/pipeline`)가 `GET /startups/?page_size=100`으로 **전체 스타트업**을 조회.
딜 목록 페이지(`/sourcing/deals`)는 이미 `has_deal_flow=true` 필터를 사용하고 있었으나, 칸반에는 누락됨.

### 업무 흐름 불일치

```
[기대] 스타트업 등록(마스터) → 딜 등록 → 칸반 Inbound
[실제] 스타트업 등록 → 즉시 칸반 Inbound (딜 등록 무관)
```

---

## 2. 구현 내역

### 변경 파일

| 파일 | 변경 내용 | 커밋 |
|------|----------|------|
| `frontend/src/app/sourcing/pipeline/page.tsx:36` | API URL에 `&has_deal_flow=true` 추가 | `1c9012d` |
| `frontend/src/lib/menu-data.ts:69` | 좌측 메뉴 "1차 스크리닝 작성" 제거 | `7b61bdc` |
| `frontend/src/app/sourcing/deals/page.tsx` | 스크리닝 버튼 강조 + 완료 건 재진입 차단 | `239a3e0`, `838ef7e` |

### Before / After

```typescript
// Before
const res = await api.get<{ data: StartupItem[] }>("/startups/?page_size=100");

// After
const res = await api.get<{ data: StartupItem[] }>("/startups/?page_size=100&has_deal_flow=true");
```

### 변경하지 않은 것 (의도적)

- **백엔드**: `has_deal_flow` 필터 이미 구현 완료 (`startup_service.get_list`, line 56-63)
- **DB 모델**: startups 테이블, deal_flows 테이블 변경 없음
- **딜 등록**: `/deal-flows/move` API 변경 없음

---

## 3. 검증 결과

| 검증 항목 | 결과 |
|----------|------|
| Plan 요구사항 대비 Match Rate | 100% |
| API 필터 파라미터 적용 | ✅ `has_deal_flow=true` 추가됨 |
| 백엔드 호환성 | ✅ 기존 필터 인프라 재사용 |
| 딜 목록과 칸반 데이터 일관성 | ✅ 동일 필터 사용 |

---

## 4. 수정된 데이터 흐름

```
스타트업 등록
  → startups 테이블 (마스터 데이터, DealFlow 없음)
  → 딜 목록: 미표시 ✅
  → 칸반:    미표시 ✅

딜 등록 (POST /deal-flows/move, to_stage=inbound)
  → DealFlow 레코드 생성
  → 딜 목록: has_deal_flow=true → 표시 ✅
  → 칸반:    has_deal_flow=true → 표시 ✅
```

---

## 5. 스크리닝 업무 흐름

### 최초 스크리닝

```
딜 목록 (/sourcing/deals)
  → [스크리닝] 버튼 클릭 (파란색)
  → 1차 스크리닝 작성 페이지 (/sourcing/screening/new?startup_id={id})
  → 6개 항목 평가 (35점 만점) + 리스크 + 인계 메모 입력
  → [스크리닝 제출] 클릭
  → screenings 테이블에 저장
  → 딜 목록 버튼이 회색 [완료]로 변경
```

### 스크리닝 완료 건 클릭 시

```
딜 목록 → 회색 [완료] 버튼 클릭
  → 알림: "스크리닝 제출 완료했습니다. 재작성하려면 스크리닝 이력에서 삭제 후 다시 진행해주세요."
  → 스크리닝 페이지로 이동하지 않음 (차단)
```

### 스크리닝 재작성 (삭제 후 재진행)

```
스크리닝 이력 (/sourcing/screening)
  → 해당 기업의 스크리닝 행 찾기
  → 🗑️ 삭제 아이콘 클릭 → 확인 다이얼로그 → 삭제
  → screenings 테이블에서 soft delete
  → 딜 목록으로 이동
  → 해당 딜의 버튼이 다시 파란색 [스크리닝]으로 복원
  → [스크리닝] 클릭 → 새로 작성 가능
```

### 진입 경로 정리

| 경로 | 상태 | 동작 |
|------|------|------|
| 딜 목록 → [스크리닝] (파란) | 미제출 | 스크리닝 작성 페이지로 이동 |
| 딜 목록 → [완료] (회색) | 제출 완료 | 알림 표시, 이동 차단 |
| 좌측 메뉴 → 1차 스크리닝 작성 | - | **제거됨** (startup_id 없이 접근 불가) |
| 좌측 메뉴 → 스크리닝 이력 | - | 전체 이력 조회 + 삭제 가능 |

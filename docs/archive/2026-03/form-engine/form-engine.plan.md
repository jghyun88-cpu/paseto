# Plan: 양식 엔진 (Phase 2.5)

> **Feature**: form-engine
> **Author**: eLSA Dev Team
> **Created**: 2026-03-21
> **Status**: Draft
> **Phase**: Phase 2.5 — 양식 엔진

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 14개 양식(SRC-F01~OI-F03)이 각 Phase별로 하드코딩되어 있어, 양식 변경 시 코드 수정 필요. 양식 제출이 Startup/Screening 등 도메인 모델과 연결되지 않아 데이터가 분산됨 |
| **Solution** | JSON 스키마 기반 DynamicFormRenderer + FormTemplate CRUD + FormSubmission 자동 연동 트리거. 14개 양식 시드 데이터 + 양식별 자동화 로직 |
| **Function UX Effect** | 관리자가 양식 필드를 UI에서 추가/수정 가능, 사용자는 통일된 폼 UI로 모든 양식 제출, SRC-F01 제출 시 Startup 자동 생성 |
| **Core Value** | 양식 변경 시 코드 배포 없이 즉시 반영(no-code), 14개 양식 제출 이력 중앙 관리, SOP 워크플로우와 양식 연동 기반 마련 |

---

## 1. 목표 및 범위

### 1.1 Phase 2.5 목표
범용 양식 엔진을 구축하여 14개 양식을 JSON 스키마 기반으로 관리하고, DynamicFormRenderer로 렌더링하며, 제출 시 도메인 모델과 자동 연동되도록 한다.

### 1.2 범위

| 포함 | 제외 |
|------|------|
| FormTemplate CRUD API (기존 구현 활용) | Phase 3.5 심사팀 양식 자동화 (INV-F01~F03 트리거) |
| FormSubmission API (기존 구현 활용) | Phase 5.5 보육팀 양식 자동화 (PRG-F01~F04 트리거) |
| DynamicFormRenderer 컴포넌트 (신규) | OI팀 양식 자동화 (OI-F01~F03 트리거) |
| SRC-F01 제출 → Startup + DealFlow 자동 생성 | 양식 버전 관리 (v2 이후) |
| SRC-F02 제출 → Screening 자동 연동 | 양식 조건부 로직 (고급 기능) |
| 14개 양식 시드 데이터 (fields JSON) | 파일 첨부 (확장 단계) |
| 양식 제출 목록/상세 UI | 양식 에디터 WYSIWYG (확장 단계) |

### 1.3 완료 기준
- DynamicFormRenderer가 JSON fields 배열 기반으로 폼 렌더링
- 지원 필드 타입: text, number, textarea, select, checkbox, slider, date
- SRC-F01 제출 → Startup + DealFlow(inbound) 자동 생성 (마스터 §18 #1)
- SRC-F02 제출 → 기존 screening_service.create() 연동
- 관리자 페이지에서 양식 목록/상세 조회
- 제출 이력 페이지에서 startup_id별 제출 목록 조회

---

## 2. 현재 구현 상태 (이미 존재하는 것)

### 2.1 Backend (구현 완료)
- `models/form_template.py` — FormTemplate 모델 (27줄)
- `models/form_submission.py` — FormSubmission 모델 (27줄)
- `schemas/form.py` — Pydantic 스키마
- `services/form_service.py` — CRUD + 14개 시드 + 제출 로직
- `routers/forms.py` — 7개 API 엔드포인트

### 2.2 Frontend (부분 구현)
- `admin/forms/page.tsx` — 양식 목록 + 시드 버튼
- `admin/forms/submissions/page.tsx` — 제출 목록

### 2.3 미구현 (이번 Phase 대상)
- **DynamicFormRenderer 컴포넌트** — JSON fields → 폼 렌더링
- **양식 제출 페이지** — `/forms/[form-code]/` 경로에서 동적 폼 표시
- **SRC-F01 자동화 트리거** — 제출 시 Startup + DealFlow 자동 생성
- **SRC-F02 자동화 연동** — 제출 시 screening_service 호출
- **양식 필드 JSON 스키마 정의** — 14개 양식의 fields 배열

---

## 3. 기술 요구사항

### 3.1 DynamicFormRenderer 컴포넌트

**경로**: `frontend/src/components/forms/DynamicFormRenderer.tsx`

**fields JSON 스키마**:
```json
[
  {
    "key": "company_name",
    "label": "기업명",
    "type": "text",
    "required": true,
    "placeholder": "기업명을 입력하세요"
  },
  {
    "key": "industry",
    "label": "산업 분야",
    "type": "select",
    "options": ["AI", "Bio", "FinTech", "CleanTech"],
    "required": true
  },
  {
    "key": "score",
    "label": "평가 점수",
    "type": "slider",
    "min": 1,
    "max": 5,
    "step": 1
  }
]
```

**지원 필드 타입 (7종)**:
| type | 컴포넌트 | 비고 |
|------|----------|------|
| `text` | Input | 단일 텍스트 |
| `number` | Input type=number | 숫자 |
| `textarea` | Textarea | 장문 |
| `select` | Select (shadcn) | options 배열 필수 |
| `checkbox` | Checkbox | boolean |
| `slider` | Slider (1-5) | min/max/step |
| `date` | Input type=date | 날짜 |

### 3.2 Backend 추가 서비스 로직

**form_service.py에 추가할 자동화 트리거**:
- `SRC-F01` 제출 → `startup_service.create()` + `deal_flow_service.move_stage(INBOUND)`
- `SRC-F02` 제출 → `screening_service.create()` (data 매핑)

### 3.3 Frontend 신규 페이지

| 페이지 | 경로 | UI |
|--------|------|-----|
| 동적 양식 페이지 | `/forms/[form-code]/` | DynamicFormRenderer + 제출 버튼 |
| 양식 상세 (관리자) | `/admin/forms/[id]/` | 필드 목록 + 편집 (선택) |

### 3.4 14개 양식 fields JSON 정의

| form_code | 팀 | 필드 수 | 자동화 |
|-----------|-----|:------:|--------|
| SRC-F01 | Sourcing | 12 | → Startup + DealFlow 생성 |
| SRC-F02 | Sourcing | 10 | → Screening 연동 |
| INV-F01 | 심사 | 10 | DD 문서 수령 추적 (Phase 3.5) |
| INV-F02 | 심사 | 9 | 투자메모 프리필 (Phase 3.5) |
| INV-F03 | 심사 | 5 | IC 결과 → 인계 (Phase 3.5) |
| OPS-F01 | 백오피스 | 10 | 체크리스트 완료 (Phase 4) |
| OPS-F02 | 백오피스 | 5 | 보고 리마인더 (Phase 4) |
| PRG-F01 | 보육 | 8 | 온보딩 생성 (Phase 5.5) |
| PRG-F02 | 보육 | 6 | 액션플랜 (Phase 5.5) |
| PRG-F03 | 보육 | 7 | 멘토링 기록 (Phase 5.5) |
| PRG-F04 | 보육 | 8 | KPI 점검 (Phase 5.5) |
| OI-F01 | OI | 6 | 수요 생성 (Phase 6) |
| OI-F02 | OI | 8 | PoC 생성 (Phase 6) |
| OI-F03 | OI | 5 | 진행관리 (Phase 6) |

> Phase 2.5에서는 **SRC-F01, SRC-F02만 자동화 트리거 구현**. 나머지 양식은 fields JSON만 시드하고, 자동화는 각 Phase에서 구현.

---

## 4. 구현 순서 (6 Steps)

```
Step 1: DynamicFormRenderer 컴포넌트 (7종 필드 타입)
Step 2: /forms/[form-code]/ 동적 양식 페이지 (form_code로 template 조회 → 렌더링)
Step 3: 14개 양식 fields JSON 시드 데이터 보강 (기존 seed에 상세 fields 추가)
Step 4: SRC-F01 자동화 트리거 (form_service에서 제출 후 startup_service 호출)
Step 5: SRC-F02 자동화 연동 (form_service에서 제출 후 screening_service 호출)
Step 6: 제출 이력 UI 개선 + 양식별 필터 + startup 링크
```

---

## 5. RBAC

| 엔드포인트 | 기존 | 변경 |
|-----------|------|------|
| GET /forms/templates/ | 인증 사용자 | 유지 |
| POST /forms/templates/ | 인증 사용자 | admin/partner만 |
| POST /forms/submissions/ | 인증 사용자 | 팀별 양식에 맞는 권한 체크 |

---

## 6. 의존성

| 의존 | 상태 |
|------|:----:|
| Phase 1 (Startup, User, Auth) | ✅ 완료 |
| Phase 2 (Screening, DealFlow, Handover) | ✅ 완료 |
| shadcn/ui 컴포넌트 (Input, Select, Slider 등) | ✅ 사용 가능 |

---

## 7. 리스크

| 리스크 | 영향도 | 완화 방안 |
|--------|:------:|----------|
| fields JSON 스키마 복잡도 증가 | Medium | 7종으로 제한, 조건부 로직은 확장 단계 |
| SRC-F01 자동화와 기존 Startup API 충돌 | Low | form_service 내부에서 startup_service 호출 (레이어 분리) |
| 양식 수정 시 기존 제출 데이터 비호환 | Low | version 필드로 관리, 기존 제출은 스냅샷 유지 |

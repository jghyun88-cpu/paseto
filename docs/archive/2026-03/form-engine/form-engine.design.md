# Design: 양식 엔진 (Phase 2.5)

> **Feature**: form-engine
> **Plan Reference**: `docs/01-plan/features/form-engine.plan.md`
> **Created**: 2026-03-21
> **Status**: Draft

---

## 1. 기존 구현 활용 (수정 불필요)

이미 완성된 파일들 — 변경하지 않음:

| 파일 | 역할 |
|------|------|
| `models/form_template.py` | FormTemplate 모델 (fields: JSON) |
| `models/form_submission.py` | FormSubmission 모델 (data: JSON) |
| `schemas/form.py` | 6개 Pydantic 스키마 |
| `routers/forms.py` | 7개 API 엔드포인트 |
| `services/form_service.py` | CRUD + 시드 + 제출 (**수정 대상: 자동화 트리거 추가**) |

---

## 2. DynamicFormRenderer 컴포넌트 설계

### 2.1 파일 위치
`frontend/src/components/forms/DynamicFormRenderer.tsx`

### 2.2 Props 인터페이스

```typescript
interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "checkbox" | "slider" | "date";
  required?: boolean;
  placeholder?: string;
  options?: string[];      // select 타입용
  min?: number;            // slider/number 타입용
  max?: number;            // slider/number 타입용
  step?: number;           // slider 타입용
  defaultValue?: string | number | boolean;
}

interface DynamicFormRendererProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
  submitLabel?: string;    // 기본값: "제출"
}
```

### 2.3 필드 타입별 렌더링 매핑

| type | shadcn 컴포넌트 | 비고 |
|------|----------------|------|
| `text` | `<Input />` | placeholder 지원 |
| `number` | `<Input type="number" />` | min/max 지원 |
| `textarea` | `<Textarea />` | 3줄 기본 |
| `select` | `<Select>` + `<SelectItem>` | options 배열 렌더링 |
| `checkbox` | `<Checkbox />` + label | boolean 반환 |
| `slider` | `<Slider />` | min/max/step, 현재값 표시 |
| `date` | `<Input type="date" />` | YYYY-MM-DD 형식 |

### 2.4 컴포넌트 구조

```
DynamicFormRenderer
├── form state: Record<string, unknown> (useState)
├── for each field in fields:
│   ├── <Label>{field.label} {field.required && "*"}</Label>
│   └── renderField(field) → 타입별 컴포넌트
├── validation: required 필드 확인
└── <Button onClick={handleSubmit}>{submitLabel}</Button>
```

### 2.5 핵심 로직

```typescript
function renderField(field: FormField) {
  switch (field.type) {
    case "text":     return <Input ... />;
    case "number":   return <Input type="number" ... />;
    case "textarea": return <Textarea ... />;
    case "select":   return <Select ...>{field.options?.map(...)}</Select>;
    case "checkbox": return <Checkbox ... />;
    case "slider":   return <div><Slider .../><span>{value}/{field.max}</span></div>;
    case "date":     return <Input type="date" ... />;
  }
}
```

---

## 3. 동적 양식 페이지 설계

### 3.1 라우트

`frontend/src/app/forms/[formCode]/page.tsx`

### 3.2 페이지 흐름

```
1. URL params에서 formCode 추출
2. GET /api/v1/forms/templates/?page_size=50 → form_code 매칭으로 template 찾기
   (또는 새 API: GET /api/v1/forms/templates/by-code/{formCode})
3. template.fields → DynamicFormRenderer에 전달
4. 사용자 입력 → onSubmit
5. POST /api/v1/forms/submissions/ { form_template_id, startup_id, data }
6. 성공 → 토스트 + 리디렉트
```

### 3.3 Backend API 추가 (1개)

| Method | Path | 기능 |
|--------|------|------|
| GET | `/api/v1/forms/templates/by-code/{form_code}` | form_code로 템플릿 단건 조회 |

**routers/forms.py에 추가**:
```python
@router.get("/templates/by-code/{form_code}", response_model=FormTemplateResponse)
async def get_template_by_code(form_code: str, db, _user):
    tmpl = await form_service.get_template_by_code(db, form_code)
    if not tmpl: raise form_template_not_found()
    return FormTemplateResponse.model_validate(tmpl)
```

**form_service.py에 추가**:
```python
async def get_template_by_code(db: AsyncSession, form_code: str) -> FormTemplate | None:
    result = await db.execute(
        select(FormTemplate).where(FormTemplate.form_code == form_code, FormTemplate.is_deleted == False)
    )
    return result.scalar_one_or_none()
```

---

## 4. 자동화 트리거 설계

### 4.1 SRC-F01 → Startup + DealFlow 자동 생성 (마스터 §18 #1)

**form_service.submit_form()에 추가할 로직**:

```python
async def submit_form(db, data, user):
    # ... 기존 제출 로직 ...

    # 자동화 트리거
    if form_code == "SRC-F01":
        await _trigger_src_f01(db, submission.data, user)
    elif form_code == "SRC-F02":
        await _trigger_src_f02(db, submission.data, submission.startup_id, user)

    await db.commit()
    ...
```

**_trigger_src_f01 상세**:
```python
async def _trigger_src_f01(db, form_data, user):
    """SRC-F01 제출 → Startup 자동 생성 + DealFlow(inbound)"""
    from app.models.startup import Startup
    from app.services import deal_flow_service
    from app.enums import DealStage

    startup = Startup(
        company_name=form_data.get("company_name"),
        ceo_name=form_data.get("ceo_name"),
        founded_date=form_data.get("founded_date"),  # parse needed
        location=form_data.get("location"),
        industry=form_data.get("industry"),
        stage=form_data.get("stage"),
        core_product=form_data.get("core_product"),
        main_customer=form_data.get("main_customer"),
        current_traction=form_data.get("current_traction"),
        sourcing_channel=form_data.get("sourcing_channel"),
        referrer=form_data.get("referrer"),
        assigned_manager_id=form_data.get("assigned_manager"),  # UUID
        current_deal_stage=DealStage.INBOUND,
    )
    db.add(startup)
    await db.flush()

    # DealFlow inbound 기록
    await deal_flow_service.move_stage(db, startup, DealStage.INBOUND, user)

    return startup
```

### 4.2 SRC-F02 → Screening 연동

**_trigger_src_f02 상세**:
```python
async def _trigger_src_f02(db, form_data, startup_id, user):
    """SRC-F02 제출 → screening_service.create() 호출"""
    from app.schemas.screening import ScreeningCreate
    from app.services import screening_service

    # 상/중/하 → 5/3/1 환산
    RATING_MAP = {"상": 5, "중": 3, "하": 1}

    screening_data = ScreeningCreate(
        startup_id=startup_id,
        fulltime_commitment=RATING_MAP.get(form_data.get("team_capability", "중"), 3),
        problem_clarity=RATING_MAP.get(form_data.get("problem_clarity", "중"), 3),
        tech_differentiation=RATING_MAP.get(form_data.get("tech_diff", "중"), 3),
        market_potential=RATING_MAP.get(form_data.get("market_potential", "중"), 3),
        initial_validation=RATING_MAP.get(form_data.get("traction", "중"), 3),
        legal_clear=True,  # SRC-F02에 법적 이슈 항목 없으면 기본 True
        strategy_fit=RATING_MAP.get(form_data.get("program_fit", "중"), 3),
        risk_notes=form_data.get("overall_opinion"),
        handover_memo=form_data.get("next_action"),
        handover_to_review=form_data.get("handover_to_review", False),
    )

    await screening_service.create(db, screening_data, user)
```

---

## 5. 14개 양식 시드 fields JSON

### 5.1 SRC-F01 (마스터 §15 기준)

```python
{
    "form_code": "SRC-F01",
    "title": "스타트업 초기등록표",
    "owning_team": "sourcing",
    "fields": [
        {"key": "company_name", "label": "기업명", "type": "text", "required": True},
        {"key": "ceo_name", "label": "대표자", "type": "text", "required": True},
        {"key": "founded_date", "label": "설립일", "type": "date"},
        {"key": "location", "label": "소재지", "type": "text"},
        {"key": "industry", "label": "산업분야", "type": "select",
         "options": ["반도체", "모빌리티", "AI", "배터리", "로보틱스", "바이오", "기타"], "required": True},
        {"key": "stage", "label": "단계", "type": "select",
         "options": ["예비창업", "Pre-seed", "Seed"]},
        {"key": "core_product", "label": "핵심 제품/기술", "type": "textarea", "required": True},
        {"key": "main_customer", "label": "주요 고객", "type": "text"},
        {"key": "current_traction", "label": "현재 성과", "type": "textarea"},
        {"key": "sourcing_channel", "label": "유입경로", "type": "select",
         "options": ["대학/연구소", "대기업OI", "포트폴리오추천", "VC/CVC", "공공기관", "경진대회", "온라인모집", "직접발굴", "기술전시회"]},
        {"key": "referrer", "label": "추천인", "type": "text"},
        {"key": "notes", "label": "비고", "type": "textarea"},
    ]
}
```

### 5.2 SRC-F02

```python
{
    "form_code": "SRC-F02",
    "title": "1차 스크리닝 시트",
    "owning_team": "sourcing",
    "fields": [
        {"key": "team_capability", "label": "창업팀 역량", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "problem_clarity", "label": "문제정의 명확성", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "tech_diff", "label": "제품/기술 차별성", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "market_potential", "label": "시장성", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "traction", "label": "현재 진척도", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "program_fit", "label": "프로그램 적합성", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "investment_potential", "label": "투자검토 가능성", "type": "select", "options": ["상", "중", "하"], "required": True},
        {"key": "overall_opinion", "label": "종합의견", "type": "textarea", "required": True},
        {"key": "grade", "label": "추천등급", "type": "select", "options": ["A", "B", "C", "D"], "required": True},
        {"key": "next_action", "label": "후속조치", "type": "textarea"},
        {"key": "handover_to_review", "label": "심사팀 인계 여부", "type": "checkbox"},
    ]
}
```

### 5.3 나머지 12개 양식

INV-F01~F03, OPS-F01~F02, PRG-F01~F04, OI-F01~F03은 각 Phase에서 자동화 트리거를 구현할 때 상세 fields를 보강. 시드 단계에서는 기본 fields(제목, 팀만)를 유지.

---

## 6. 구현 순서 (6 Steps)

```
Step 1: DynamicFormRenderer.tsx 컴포넌트 (7종 필드 타입 + validation)
Step 2: GET /api/v1/forms/templates/by-code/{form_code} API 추가
Step 3: /forms/[formCode]/page.tsx 동적 양식 페이지
Step 4: form_service.py 시드 보강 (SRC-F01, SRC-F02 fields JSON) + get_template_by_code()
Step 5: form_service.py 자동화 트리거 (_trigger_src_f01, _trigger_src_f02)
Step 6: 사이드바에 양식 메뉴 추가 + 제출 성공 토스트 + 리디렉트
```

---

## 7. 에러 코드 (기존 활용)

| 에러 | 파일 | 이미 존재 |
|------|------|:--------:|
| `form_template_not_found()` | `errors.py` | ✅ |
| `form_submission_not_found()` | `errors.py` | ✅ |

---

## 8. RBAC

| 엔드포인트 | 레벨 | 비고 |
|-----------|------|------|
| GET templates (목록/상세/by-code) | 인증 사용자 | 모든 팀 열람 가능 |
| POST templates | admin/partner | 양식 생성은 관리자만 |
| POST submissions | 인증 사용자 | owning_team 체크는 확장 단계 |
| GET submissions | 인증 사용자 | startup_id 필터 가능 |

---

## 9. 체크리스트 (Gap Analysis 기준)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | DynamicFormRenderer 7종 필드 렌더링 | 컴포넌트 코드에 7 case 존재 |
| 2 | FormField 인터페이스 (key, label, type, required, options, min, max, step) | 타입 정의 확인 |
| 3 | /forms/[formCode]/page.tsx 존재 | 파일 존재 + formCode params 사용 |
| 4 | GET /api/v1/forms/templates/by-code/{form_code} | 라우터 + 서비스 함수 |
| 5 | SRC-F01 시드 fields (12개 필드) | form_service.py FORM_SEEDS 확인 |
| 6 | SRC-F02 시드 fields (11개 필드) | form_service.py FORM_SEEDS 확인 |
| 7 | SRC-F01 제출 → Startup + DealFlow 자동 생성 | _trigger_src_f01 함수 존재 |
| 8 | SRC-F02 제출 → Screening 연동 (상/중/하 → 5/3/1) | _trigger_src_f02 함수 + RATING_MAP |
| 9 | required 필드 validation | DynamicFormRenderer 내 체크 로직 |
| 10 | 제출 성공 시 토스트 + 리디렉트 | 페이지 코드에 toast + router.push |
| 11 | form_service.get_template_by_code() | 서비스 함수 존재 |
| 12 | ActivityLog 기록 (기존 유지) | submit_form 내 activity_log 호출 |

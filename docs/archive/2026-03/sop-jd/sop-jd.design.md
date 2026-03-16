# Design: SOP 엔진 + JD 관리 (Phase 9)

> **Feature**: sop-jd
> **Plan Reference**: `docs/01-plan/features/sop-jd.plan.md`
> **Created**: 2026-03-17
> **Status**: Draft

---

## 1. 모델 설계

### 1.1 SOPTemplate (`models/sop_template.py`)
```python
class SOPTemplate(Base):
    __tablename__ = "sop_templates"
    id, document_number(String 20 unique), title(String 200), version(String 20),
    effective_date(Date), revision_date(Date nullable), owning_team(String 50),
    purpose(Text), scope(Text), steps(JSON list), required_forms(JSON list),
    checkpoints(JSON list), exception_rules(Text nullable), is_active(Bool),
    is_deleted, created_at, updated_at
```

### 1.2 SOPExecution (`models/sop_execution.py`)
```python
class SOPExecution(Base):
    __tablename__ = "sop_executions"
    id, sop_template_id(FK→sop_templates), startup_id(FK→startups nullable),
    initiated_by(FK→users), current_step(Int default 1),
    step_statuses(JSON dict), started_at(datetime), completed_at(datetime nullable),
    notes(Text nullable), is_deleted, created_at, updated_at
```

### 1.3 FormTemplate (`models/form_template.py`)
```python
class FormTemplate(Base):
    __tablename__ = "form_templates"
    id, form_code(String 20 unique), title(String 200), description(Text nullable),
    owning_team(String 50), fields(JSON list), version(String 20),
    is_active(Bool), is_deleted, created_at, updated_at
```

### 1.4 FormSubmission (`models/form_submission.py`)
```python
class FormSubmission(Base):
    __tablename__ = "form_submissions"
    id, form_template_id(FK→form_templates), startup_id(FK→startups nullable),
    submitted_by(FK→users), data(JSON dict), status(String 20 default "submitted"),
    submitted_at(datetime server_default), reviewed_by(FK→users nullable),
    reviewed_at(datetime nullable), is_deleted, created_at, updated_at
```

### 1.5 JobDescription (`models/job_description.py`)
```python
class JobDescription(Base):
    __tablename__ = "job_descriptions"
    id, jd_code(String 10 unique), title(String 200), team(String 50),
    reports_to(String 100), purpose(Text),
    core_responsibilities(JSON list), daily_tasks(JSON list),
    weekly_tasks(JSON list), monthly_tasks(JSON list),
    quarterly_annual_tasks(JSON list nullable),
    collaboration_teams(JSON list), deliverables(JSON list),
    kpi_quantitative(JSON list), kpi_qualitative(JSON list nullable),
    required_skills(JSON dict), preferred_qualifications(JSON list),
    authority_scope(JSON list), approval_required(JSON list),
    responsibility_scope(JSON list), version(String 20),
    is_active(Bool), is_deleted, created_at, updated_at
```

---

## 2. API (20 엔드포인트)

### SOPTemplate (5): GET/, GET/{id}, POST/, PUT/{id}, POST/seed
### SOPExecution (4): GET/, GET/{id}, POST/, PATCH/{id}/step
### FormTemplate (4): GET/, GET/{id}, POST/, POST/seed
### FormSubmission (3): GET/, GET/{id}, POST/ (→ ActivityLog #10)
### JobDescription (4): GET/, GET/{id}, POST/, POST/seed

---

## 3. 구현 순서 (7 Steps)

```
Step 1: 5개 모델
Step 2: 3개 스키마 (sop, form, job_description)
Step 3: 3개 서비스 (sop_service, form_service, jd_service) + 시드
Step 4: 4개 라우터
Step 5: main.py + errors.py + __init__.py
Step 6: Frontend 5개 페이지 + types.ts
Step 7: 통합 테스트
```

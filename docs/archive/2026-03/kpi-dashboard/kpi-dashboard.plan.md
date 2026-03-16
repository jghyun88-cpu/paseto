# Plan: KPI 대시보드 + 전사 뷰 (Phase 8)

> **Feature**: kpi-dashboard
> **Author**: eLSA Dev Team
> **Created**: 2026-03-17
> **Status**: Draft
> **Phase**: Phase 8 — KPI 대시보드 + 전사 경영 뷰

---

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 팀별 KPI가 개별 스프레드시트에 산재되어 전사 성과 파악 불가, KPI 집계가 수동이라 월말 보고 시 2~3일 소요, 경영진이 각 팀 현황을 별도 문의해야 하는 비효율 |
| **Solution** | TeamKPI 모델(5팀 × 4계층 39개 지표) + 팀별 KPI 대시보드(4계층 시각화) + 전사 경영 대시보드(8대 KPI 자동 집계 + 상태 판정) + Celery 월간 자동 집계 연동 |
| **Function UX Effect** | 팀별 4계층 KPI 바차트/게이지, 달성률 자동 계산 + 전월 대비 증감 표시, 전사 8대 KPI 한 화면에 양호/보완/개선 상태 자동 판정 |
| **Core Value** | KPI 집계 자동화로 보고 준비 시간 2~3일→즉시, 경영진 실시간 의사결정 지원, 팀간 성과 비교 가능, 목표 미달 영역 즉시 식별 |

---

## 1. 목표 및 범위

### 1.1 Phase 8 목표
5팀의 **39개 KPI를 4계층(Input→Process→Output→Outcome)으로 구조화**하고, **자동 집계 + 달성률 판정 + 전사 경영 뷰**를 제공한다.

### 1.2 범위
| 포함 | 제외 |
|------|------|
| TeamKPI 모델 + CRUD | 외부 BI 도구 연동 (Metabase 등) |
| 팀별 4계층 KPI 대시보드 (5팀) | ML 기반 KPI 예측 |
| 전사 경영 대시보드 (8대 KPI) | 개인별 성과 평가 |
| KPI 자동 집계 엔진 (Phase 7 Celery 확장) | 외부 데이터 소스 연동 |
| 달성률 자동 계산 + 상태 판정 | 복잡한 대시보드 드릴다운 (확장 단계) |

### 1.3 완료 기준
- TeamKPI 테이블에 5팀 × 39개 지표 시드 데이터 입력
- 팀별 KPI 페이지에서 4계층 KPI 목록 + 달성률 + 전월 대비 표시
- 전사 경영 대시보드에서 8대 KPI + 상태 판정(양호/보완/개선) 표시
- 자동 집계 결과가 TeamKPI.actual_value에 반영

---

## 2. 기술 요구사항

### 2.1 Backend 신규 모델 (1개)

| 모델 | 파일 | 주요 필드 |
|------|------|-----------|
| TeamKPI | `models/team_kpi.py` | team, period(YYYY-MM), kpi_layer(4계층), kpi_name, kpi_definition, target_value, actual_value, achievement_rate(자동), mom_change, notes, updated_by |

### 2.2 Backend 신규 API (6개 엔드포인트)

| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/v1/team-kpis/` | 팀별 KPI 목록 (team, period, layer 필터) |
| GET | `/api/v1/team-kpis/{team}/{period}` | 특정 팀·기간 KPI 전체 |
| POST | `/api/v1/team-kpis/` | KPI 값 입력/수정 |
| PUT | `/api/v1/team-kpis/{id}` | 단일 KPI 수정 |
| GET | `/api/v1/kpi/executive` | 전사 경영 대시보드 (8대 KPI 자동 집계) |
| POST | `/api/v1/admin/tasks/kpi-aggregate` | 수동 KPI 집계 트리거 |

### 2.3 Backend 서비스 (2개)

| 서비스 | 파일 | 핵심 로직 |
|--------|------|-----------|
| team_kpi_service | `services/team_kpi_service.py` | CRUD, 달성률 자동 계산, 전월 대비 산정 |
| kpi_executive_service | `services/kpi_executive_service.py` | §19 수식 기반 5팀 KPI 자동 집계, 8대 KPI 산출, 상태 판정 |

### 2.4 Celery Task 확장

| 파일 | 변경 |
|------|------|
| `tasks/kpi_aggregation.py` | §19 수식 기반 실제 집계 로직 구현 (Phase 7 placeholder → 실제 구현) |

### 2.5 Frontend 신규 페이지 (3개)

| 페이지 | 경로 | UI |
|--------|------|-----|
| 팀별 KPI | `/kpi/team/[team]` | 4계층 KPI 테이블 + 달성률 게이지 + 전월 대비 |
| 전사 경영 | `/kpi/executive` | 8대 KPI 카드 + 상태 배지 + 팀별 요약 |
| KPI 관리 | `/kpi/manage` | KPI 값 입력/수정 폼 (관리자용) |

### 2.6 시드 데이터

5팀 × KPI 시드 (39개 지표):
- Sourcing: 8개
- 심사: 8개
- 보육: 8개
- OI: 8개
- 백오피스: 7개

---

## 3. 구현 순서

```
Step 1: TeamKPI 모델 + Alembic 마이그레이션
Step 2: TeamKPI 스키마 + team_kpi_service
Step 3: kpi_executive_service (§19 자동 집계 수식)
Step 4: team_kpis 라우터 + kpi/executive 라우터
Step 5: tasks/kpi_aggregation.py 실제 구현
Step 6: main.py + errors.py + __init__.py 등록
Step 7: Frontend 팀별 KPI + 전사 경영 + KPI 관리
Step 8: 시드 데이터 스크립트 + types.ts + 통합 테스트
```

---

## 4. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| KPI 정의 변경 가능 | 하드코딩 시 유연성 부족 | TeamKPI 테이블로 동적 관리, kpi_name으로 매칭 |
| 자동 집계 복잡도 | 일부 KPI는 수동 입력 필요 | 자동 집계 가능 항목만 자동화, 나머지는 수동 입력 허용 |
| 달성률 100% 초과 시 표시 | UI 깨질 수 있음 | 게이지 max=150%, 초과 시 색상 변경 |
| 전월 대비 데이터 부족 | 첫 월에 비교 불가 | "데이터 없음" 표시, 2개월 이후부터 증감 표시 |

---

## 5. 의존성

| 의존 항목 | 상태 |
|-----------|------|
| Phase 1~7 (모든 모듈) | ✅ 완료 |
| Startup, Review, ICDecision, Contract 모델 | ✅ 구현됨 (Sourcing/심사 KPI 집계용) |
| Incubation, MentoringSession, KPIRecord 모델 | ✅ 구현됨 (보육 KPI 집계용) |
| PartnerDemand, PoCProject 모델 | ✅ 구현됨 (OI KPI 집계용) |
| Celery Beat (kpi_aggregation task) | ✅ 스케줄 등록됨 (Phase 7) |
| Dashboard 라우터 | ✅ 구현됨 (Phase 7 — executive 엔드포인트 확장) |

---

## 6. 파일 목록 (예상)

### Backend 신규 (5파일)
```
backend/app/models/team_kpi.py
backend/app/schemas/team_kpi.py
backend/app/services/team_kpi_service.py
backend/app/services/kpi_executive_service.py
backend/app/routers/team_kpis.py
```

### Backend 수정 (4파일)
```
backend/app/models/__init__.py (TeamKPI 추가)
backend/app/main.py (team_kpis 라우터 등록)
backend/app/errors.py (team_kpi_not_found 추가)
backend/app/tasks/kpi_aggregation.py (실제 집계 로직)
```

### Frontend 신규 (3페이지)
```
frontend/src/app/kpi/team/[team]/page.tsx
frontend/src/app/kpi/executive/page.tsx
frontend/src/app/kpi/manage/page.tsx
```

### Frontend 수정 (1파일)
```
frontend/src/lib/types.ts (TeamKPI 타입 추가)
```

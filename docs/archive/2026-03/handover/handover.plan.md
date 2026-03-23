# Handover (인계 패키지) 개선 Planning Document

> **Summary**: 팀 간 인계 패키지의 6경로 자동화 완성, 에스컬레이션, 수신확인 UX 고도화
>
> **Project**: eLSA (딥테크 액셀러레이터 운영시스템)
> **Author**: AI Assistant
> **Date**: 2026-03-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 6가지 인계 경로 중 sourcing→review만 자동화되어 있고, 나머지 5개 경로는 수동 처리. 24시간 에스컬레이션 미구현으로 인계 누락 위험 존재 |
| **Solution** | 나머지 5개 경로 자동화 트리거 구현, Celery Beat 기반 에스컬레이션, 수신팀별 인계 대시보드 및 수신확인 UX 개선 |
| **Function/UX Effect** | 팀 간 인계 시 자동 문서 생성 + 알림으로 수작업 제거, 미확인 건 자동 에스컬레이션으로 딜 지연 방지 |
| **Core Value** | 릴레이 관리 원칙 실현 — 팀 간 정보 단절 제거, 딜 파이프라인 속도 30% 이상 개선 |

---

## 1. Overview

### 1.1 Purpose

인계 패키지 시스템을 **6가지 경로 완전 자동화**로 고도화하여, 딜이 팀 간 이동할 때 필수 정보가 구조화된 문서로 자동 생성되고, 수신 확인 및 에스컬레이션까지 체계적으로 관리되도록 한다.

### 1.2 Background

- **현재 상태**: sourcing→review 경로만 자동화 (스크리닝 Pass 시 HandoverDocument 자동 생성)
- **문제점**:
  1. 나머지 5개 경로(review→backoffice, review→incubation, incubation→oi, oi→review, backoffice→broadcast)는 수동 인계 또는 미구현
  2. 24시간 에스컬레이션 로직 미구현 (DB 필드만 존재)
  3. 수신팀별 전용 인계 화면 부재 (인계 허브는 관리자용)
  4. 인계 수동 생성 UI가 단순 (UUID 직접 입력 방식)
- **비즈니스 임팩트**: 팀 간 인계 누락 → 딜 지연 → 투자 기회 손실

### 1.3 Related Documents

- 마스터 스펙: `CLAUDE_CODE_MASTER_PROMPT_v6.1_FINAL.md` §3-3, §5, §18
- 기존 코드: `backend/app/services/handover_service.py`, `backend/app/models/handover.py`
- DealStage 상태머신: CLAUDE.md 참조

---

## 2. Scope

### 2.1 In Scope

- [ ] **5개 추가 경로 자동화 트리거** — 각 경로별 비즈니스 이벤트 연동
- [ ] **에스컬레이션 자동화** — Celery Beat 24시간 미확인 체크 + 알림
- [ ] **수신팀별 인계 대시보드** — 심사관리/보육관리/OI관리 메뉴에 인계 수신함 추가
- [ ] **인계 수동 생성 UX 개선** — 기업 검색 자동완성, 경로 선택, 필수항목 폼
- [ ] **인계 상세 보기** — content JSON을 구조화된 카드로 렌더링
- [ ] **인계 통계** — 경로별/팀별 평균 확인 시간, 에스컬레이션 비율

### 2.2 Out of Scope

- 인계 문서 PDF 내보내기
- 인계 문서 버전 관리 (수정 이력)
- 외부 시스템(Slack, 이메일) 알림 연동
- 인계 문서 댓글/피드백 기능

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | review→backoffice 자동 인계: IC 승인(approved) 시 투자조건표+선행조건 포함 HandoverDocument 생성 | High | Pending |
| FR-02 | review→incubation 자동 인계: 계약 체결(closed) 시 투자메모+성장과제 포함 문서 생성 | High | Pending |
| FR-03 | incubation→oi 자동 인계: PoC 매칭 요청 시 기술상태+매칭우선순위 문서 생성 | Medium | Pending |
| FR-04 | oi→review 자동 인계: 후속투자 추천 시 실증성과+투자포인트 문서 생성 | Medium | Pending |
| FR-05 | backoffice→broadcast: 계약 상태 변경/리스크 발생 시 전 조직 브로드캐스트 | Medium | Pending |
| FR-06 | 24시간 에스컬레이션: Celery Beat 주기 태스크로 미확인 인계 escalated=true + 팀리더 알림 | High | Pending |
| FR-07 | 수신팀 대시보드: 각 팀 메뉴에 "인계 수신함" 탭 — 미확인 우선 정렬, 수신확인 버튼 | High | Pending |
| FR-08 | 인계 수동 생성 개선: 기업명 검색(자동완성) + 경로 드롭다운 + 경로별 필수항목 동적 폼 | Medium | Pending |
| FR-09 | 인계 상세 보기: content JSON → 섹션별 카드 렌더링 (기업개요, 스크리닝결과, 리스크 등) | Medium | Pending |
| FR-10 | 인계 허브 통계: 경로별 건수, 평균 확인 소요시간, 에스컬레이션 비율 차트 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 인계 생성 API 응답 < 500ms | API 로그 측정 |
| Reliability | 에스컬레이션 체크 누락률 0% | Celery Beat 실행 로그 |
| UX | 수신확인까지 평균 클릭 2회 이내 | UI 플로우 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 6개 인계 경로 모두 자동/수동 생성 가능
- [ ] 에스컬레이션 Celery 태스크 동작 확인
- [ ] 각 팀 메뉴에서 인계 수신함 접근 가능
- [ ] 기존 sourcing→review 자동 인계 정상 동작 유지 (회귀 없음)
- [ ] ActivityLog에 모든 인계 이벤트 기록

### 4.2 Quality Criteria

- [ ] 기존 인계 API 테스트 통과
- [ ] 새 경로별 인계 content 구조 검증
- [ ] 빌드 성공 (frontend + backend)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| DealStage 전환 로직과 인계 트리거 충돌 | High | Medium | 각 경로별 트리거 조건을 명확히 정의하고 단위 테스트 |
| Celery Beat 에스컬레이션 태스크 미실행 | High | Low | 헬스체크 + 실행 로그 모니터링 |
| 경로별 content 스키마 불일치 | Medium | Medium | 경로별 content 스키마를 Pydantic 모델로 타입 검증 |
| 기존 sourcing→review 경로 회귀 | High | Low | 기존 로직 변경 최소화, 새 경로는 별도 함수로 추가 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Enterprise** | 기존 프로젝트 아키텍처 (Router→Service→Model) | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 인계 content 타입 안전성 | 자유 JSON / Pydantic 검증 | Pydantic 검증 | 경로별 필수 필드 보장 |
| 에스컬레이션 실행 | Celery Beat / APScheduler / Cron | Celery Beat | 기존 인프라 활용 (celery_beat 서비스 존재) |
| 수신팀 대시보드 | 별도 페이지 / 기존 허브 확장 | 각 팀 메뉴에 탭 추가 | 팀별 접근성 + 권한 분리 |
| 인계 생성 트리거 | Service 내 직접 호출 / 이벤트 기반 | Service 직접 호출 | 현재 아키텍처 일관성 유지, 이벤트 시스템 없음 |

### 6.3 경로별 자동 트리거 매핑

```
경로                        트리거 조건                              트리거 위치
────────────────────────────────────────────────────────────────────────────────
sourcing → review          스크리닝 Pass + handover_to_review     screening_service.create()       [구현완료]
review → backoffice        IC 승인 (approved)                      deal_flow_service.move_stage()   [신규]
review → incubation        계약 체결 (closed → portfolio)           deal_flow_service.move_stage()   [신규]
incubation → oi            PoC 매칭 요청                            poc_service.create_request()     [신규]
oi → review                후속투자 추천                            follow_on_service.recommend()    [신규]
backoffice → broadcast     계약 상태 변경 / 리스크 알림             contract_service.update()        [신규]
```

### 6.4 Backend 변경 파일 목록

```
backend/app/
├── services/
│   ├── handover_service.py      # 5개 경로별 create 함수 추가
│   └── escalation_service.py    # [신규] 에스컬레이션 Celery 태스크
├── schemas/
│   └── handover.py              # 경로별 content Pydantic 모델 추가, 수동생성 스키마
├── routers/
│   └── handovers.py             # POST /handovers/ 수동생성, GET 필터 확장
├── tasks/
│   └── escalation.py            # [신규] Celery Beat 주기 태스크
└── celery_config.py             # beat_schedule에 에스컬레이션 태스크 등록
```

### 6.5 Frontend 변경 파일 목록

```
frontend/src/app/
├── sourcing/handover/
│   ├── new/page.tsx             # 수동 생성 UX 개선 (기업 검색 + 동적 폼)
│   └── page.tsx                 # 기존 유지
├── review/handover/
│   └── page.tsx                 # [신규] 심사팀 인계 수신함
├── incubation/handover/
│   └── page.tsx                 # [신규] 보육팀 인계 수신함
├── oi/handover/
│   └── page.tsx                 # [신규] OI팀 인계 수신함
├── handover/
│   ├── hub/page.tsx             # 통계 차트 추가
│   └── [id]/page.tsx            # [신규] 인계 상세 보기 (content 카드 렌더링)
└── components/
    └── handover/
        ├── HandoverContentCard.tsx  # [신규] 경로별 content 카드 컴포넌트
        ├── HandoverStatusBadge.tsx   # [신규] 상태 배지 (대기/확인/에스컬레이션)
        └── StartupSearchInput.tsx   # [신규] 기업명 자동완성 검색
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Backend: Router → Service → Model 아키텍처
- [x] Soft delete 전용 (`is_deleted` 필터)
- [x] ActivityLog 모든 변경 기록

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **인계 content 스키마** | 자유 JSON | 경로별 Pydantic 모델 6개 | High |
| **Celery 태스크 네이밍** | 기존 패턴 확인 필요 | `tasks.escalation.check_unacknowledged` | Medium |
| **팀별 라우트 구조** | `/sourcing/`, `/review/` 등 존재 | 각 팀 메뉴에 `/handover/` 서브경로 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `ESCALATION_HOURS` | 에스컬레이션 기준 시간 (기본 24) | Server | ☐ |
| `ESCALATION_CHECK_INTERVAL` | Celery Beat 실행 간격 (기본 1h) | Server | ☐ |

---

## 8. Implementation Priority (구현 순서)

| Phase | Items | 근거 |
|-------|-------|------|
| **1단계** | FR-06 에스컬레이션 + FR-07 수신팀 대시보드 | 가장 시급 — 현재 인계 누락 리스크 해소 |
| **2단계** | FR-01, FR-02 (review→backoffice/incubation) | 핵심 파이프라인 경로 |
| **3단계** | FR-08, FR-09 (UX 개선 + 상세 보기) | 사용성 향상 |
| **4단계** | FR-03, FR-04, FR-05 (나머지 경로) | 완성도 |
| **5단계** | FR-10 (통계) | 부가 기능 |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`handover.design.md`)
2. [ ] 팀 리뷰 및 우선순위 확인
3. [ ] 1단계 구현 시작 (에스컬레이션 + 수신함)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial draft — 6경로 자동화 + 에스컬레이션 + UX 개선 계획 | AI Assistant |

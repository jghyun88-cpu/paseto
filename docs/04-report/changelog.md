# Changelog

All notable changes to the eLSA project are documented in this file.

## [2026-03-16] - Phase 2 Sourcing 모듈 완료

### Added
- **Backend Models**: Screening (7개 평가항목, 자동 점수 계산), HandoverDocument (팀 간 인계 추적)
- **Backend Services**: screening_service (점수 계산 + 등급 산정), deal_flow_service (칸반 이동), handover_service (인계 문서 + 이중확인 방지), notification_service (팀 알림)
- **Backend APIs**: 8개 엔드포인트 (DealFlow 2개, Screening 3개, Handover 3개)
- **Frontend Pages**:
  - `/sourcing/pipeline` — 4컬럼 칸반보드 with DnD
  - `/sourcing/screening/new` — 7항목 슬라이더 폼
  - `/sourcing/screening` — 스크리닝 이력 테이블
  - `/sourcing/handover` — 인계 관리 (상태 추적)
  - `/sourcing/reports` — 채널별 + 단계별 분석 차트
- **Frontend Components**:
  - KanbanBoard (4컬럼, @hello-pangea/dnd)
  - KanbanColumn, KanbanCard
- **Automation #2**: SRC-F02 A등급 + handover=Y → HandoverDocument + DealFlow→DEEP_REVIEW + Notification 자동 생성
- **Alembic Migration**: screenings + handover_documents 테이블 생성

### Changed
- DealStage: INBOUND → FIRST_SCREENING → DEEP_REVIEW → INTERVIEW (+ later stages)
- Notification 모델: team_id 대신 user_id로 개별 알림 지원
- ActivityLog: 모든 screening/handover/deal_flow 변경 자동 기록

### Fixed
- `handover_already_acknowledged`: acknowledge() 시작 시 중복 확인 방지 로직 추가 (409 에러)
- Timezone: datetime.now() 호출 시 Asia/Seoul 지정 (CLAUDE.md 규칙)

### Deferred to Phase 7
- `invalid_deal_stage_transition` 에러 추가 (상태머신 강화 시)
- 월간 딜플로우 LineChart (분석 강화 시)
- `recommendation_reason` JSON 필드 추가 (인계 문서 상세정보)
- Celery Beat 에스컬레이션 자동화 (인계 24h 타임아웃)

## Metrics

| 메트릭 | 값 |
|--------|-----|
| Design Match Rate | 92% |
| API Implementation | 100% (8/8) |
| Automation #2 | ✅ |
| RBAC Compliance | 100% (6/6) |
| Backend Files | 13 |
| Frontend Files | 8 |
| Test Coverage | Manual (Phase 5 이후 E2E) |

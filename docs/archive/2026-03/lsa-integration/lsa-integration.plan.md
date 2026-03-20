---
feature: lsa-integration
phase: plan
created: 2026-03-20
author: AI
status: completed
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | LSA(AI 에이전트)와 eLSA(웹 플랫폼)가 별도 시스템으로 분리 → 데이터 이중관리, BHV 중간 레이어 의존 |
| Solution | LSA 전체를 eLSA에 내장 — 에이전트/스킬/규칙 + elsa-mcp로 직접 연동 + 단일 프로젝트 |
| Function/UX | /screen-application 등 9개 스킬이 eLSA 컨텍스트에서 동작, DB 직접 조회/저장 |
| Core Value | 단일 시스템에서 웹 UI + AI 분석 통합 운영 |

## 1. 배경 및 목적

LSA(AI 에이전트 시스템)의 9개 에이전트, 9개 스킬, 7개 규칙, MCP 연동을 eLSA 프로젝트에 완전 내장.
통합 후 두 시스템이 독립적으로 존재하되, eLSA에서 LSA의 모든 AI 기능을 사용 가능.

## 2. 범위

### In Scope
- 9개 에이전트 + 9개 스킬 + 7개 규칙 전체 이전
- elsa-mcp 서버 구축 (bhv-mcp 대체, 14개 MCP 도구)
- 새 API 3개 (ai-analysis, portfolio-issues, service-token)
- 데이터/보고서 → ai-agent/ 이전
- 외부 MCP 7개 연동 설정 (.mcp.json)
- 훅 + settings.json 병합
- 통합 레이어 (score_mapper, report_parser, data_converter)

### Out of Scope
- 스크립트 13개 이전 → 추후 별도 진행
- eLSA 프론트엔드 AI 보고서 뷰어 UI
- 포트폴리오 데이터 DB 마이그레이션 (file→PostgreSQL)
- lsa/ 폴더 삭제 (사용자가 다른 용도로 사용 예정)

## 3. 접근 방식

**Progressive Embedding** (5단계 점진적 이전):

| Phase | 내용 |
|-------|------|
| 1 | .claude/ 아티팩트 이전 (agents/skills/rules/hooks) |
| 2 | elsa-mcp 서버 구축 + 새 API 3개 + 모델 2개 |
| 3 | 데이터/보고서 → ai-agent/ 이동 + 통합 레이어 |
| 4 | settings.json 병합 + 경로 전체 검증 |
| 5 | 통합 테스트 + 삭제 검증 체크리스트 |

## 4. 성공 기준

- 13개 체크리스트 항목 전체 통과
- bhv/BHV 참조 0건
- lsa/ 경로 참조 0건
- elsa-mcp 빌드 성공

/**
 * eLSA 전체 메뉴 구조 — 마스터 §39 화면 목록 기반
 * K-SENS II 스타일 트리 메뉴 데이터
 */

import type { NavTab } from "./types";

export const NAV_TABS: NavTab[] = [
  {
    id: "dashboard",
    label: "전체업무",
    menu: [
      {
        id: "dash-main",
        label: "대시보드",
        type: "folder",
        children: [
          { id: "dash-overview", label: "전사 대시보드", type: "page", href: "/" },
          { id: "dash-alerts", label: "긴급 알림", type: "page", href: "/notifications" },
        ],
      },
      {
        id: "dash-startup",
        label: "스타트업관리",
        type: "folder",
        children: [
          { id: "dash-startup-list", label: "스타트업 목록", type: "page", href: "/startup" },
          { id: "dash-startup-new", label: "스타트업 등록", type: "page", href: "/startup/new" },
        ],
      },
      {
        id: "dash-handover",
        label: "인계관리",
        type: "folder",
        children: [
          { id: "dash-handover-list", label: "인계 현황", type: "page", href: "/handovers" },
        ],
      },
      {
        id: "dash-meeting",
        label: "회의관리",
        type: "folder",
        children: [
          { id: "dash-meeting-list", label: "회의 일정", type: "page", href: "/meetings" },
          { id: "dash-meeting-minutes", label: "회의록", type: "page", href: "/meetings/minutes" },
        ],
      },
    ],
  },
  {
    id: "sourcing",
    label: "소싱관리",
    menu: [
      {
        id: "src-pipeline",
        label: "딜플로우관리",
        type: "folder",
        children: [
          { id: "src-kanban", label: "딜플로우 칸반보드", type: "page", href: "/sourcing/pipeline" },
          { id: "src-list", label: "딜 목록", type: "page", href: "/sourcing/deals" },
        ],
      },
      {
        id: "src-screening",
        label: "스크리닝관리",
        type: "folder",
        children: [
          { id: "src-screen-new", label: "1차 스크리닝 작성", type: "page", href: "/sourcing/screening/new" },
          { id: "src-screen-list", label: "스크리닝 이력", type: "page", href: "/sourcing/screening" },
        ],
      },
      {
        id: "src-handover",
        label: "심사팀 인계",
        type: "folder",
        children: [
          { id: "src-handover-pkg", label: "인계 패키지 생성", type: "page", href: "/sourcing/handover/new" },
          { id: "src-handover-list", label: "인계 이력", type: "page", href: "/sourcing/handover" },
        ],
      },
      {
        id: "src-report",
        label: "소싱분석",
        type: "folder",
        children: [
          { id: "src-report-channel", label: "채널별 분석", type: "page", href: "/sourcing/reports/channel" },
          { id: "src-report-funnel", label: "전환율 분석", type: "page", href: "/sourcing/reports/funnel" },
        ],
      },
    ],
  },
  {
    id: "review",
    label: "심사관리",
    menu: [
      {
        id: "rev-pipeline",
        label: "심사파이프라인",
        type: "folder",
        children: [
          { id: "rev-board", label: "심사 현황", type: "page", href: "/review/pipeline" },
        ],
      },
      {
        id: "rev-eval",
        label: "평가관리",
        type: "folder",
        children: [
          { id: "rev-doc", label: "서류심사 (5축)", type: "page", href: "/review/document" },
          { id: "rev-interview", label: "구조화 인터뷰", type: "page", href: "/review/interview" },
          { id: "rev-dd", label: "DD 체크리스트", type: "page", href: "/review/dd" },
        ],
      },
      {
        id: "rev-memo",
        label: "투자메모관리",
        type: "folder",
        children: [
          { id: "rev-memo-write", label: "투자메모 작성", type: "page", href: "/review/memo/new" },
          { id: "rev-memo-list", label: "투자메모 목록", type: "page", href: "/review/memo" },
        ],
      },
      {
        id: "rev-ic",
        label: "투자위원회",
        type: "folder",
        children: [
          { id: "rev-ic-agenda", label: "IC 안건 관리", type: "page", href: "/review/ic" },
          { id: "rev-ic-decision", label: "IC 결정 이력", type: "page", href: "/review/ic/history" },
        ],
      },
    ],
  },
  {
    id: "incubation",
    label: "보육관리",
    menu: [
      {
        id: "inc-portfolio",
        label: "포트폴리오관리",
        type: "folder",
        children: [
          { id: "inc-port-dash", label: "포트폴리오 대시보드", type: "page", href: "/incubation/portfolio" },
          { id: "inc-port-grade", label: "등급 관리", type: "page", href: "/incubation/portfolio/grade" },
        ],
      },
      {
        id: "inc-onboard",
        label: "온보딩관리",
        type: "folder",
        children: [
          { id: "inc-onboard-flow", label: "온보딩 워크플로우", type: "page", href: "/incubation/onboarding" },
          { id: "inc-action", label: "90일 액션플랜", type: "page", href: "/incubation/action-plan" },
        ],
      },
      {
        id: "inc-mentor",
        label: "멘토링관리",
        type: "folder",
        children: [
          { id: "inc-mentor-session", label: "멘토링 세션", type: "page", href: "/incubation/mentoring" },
          { id: "inc-mentor-new", label: "세션 등록", type: "page", href: "/incubation/mentoring/new" },
        ],
      },
      {
        id: "inc-kpi",
        label: "KPI트래커",
        type: "folder",
        children: [
          { id: "inc-kpi-record", label: "KPI 입력", type: "page", href: "/incubation/kpi" },
          { id: "inc-kpi-trend", label: "KPI 추이", type: "page", href: "/incubation/kpi/trend" },
        ],
      },
      {
        id: "inc-demo",
        label: "IR/DemoDay",
        type: "folder",
        children: [
          { id: "inc-demo-prep", label: "Demo Day 준비", type: "page", href: "/incubation/demo-day" },
          { id: "inc-investor-meet", label: "투자자 미팅", type: "page", href: "/incubation/investor-meetings" },
        ],
      },
    ],
  },
  {
    id: "oi",
    label: "OI관리",
    menu: [
      {
        id: "oi-partner",
        label: "파트너수요관리",
        type: "folder",
        children: [
          { id: "oi-demand-map", label: "수요맵", type: "page", href: "/oi/partners" },
          { id: "oi-matching", label: "매칭 엔진", type: "page", href: "/oi/matching" },
        ],
      },
      {
        id: "oi-poc",
        label: "PoC관리",
        type: "folder",
        children: [
          { id: "oi-poc-list", label: "PoC 프로젝트", type: "page", href: "/oi/poc" },
          { id: "oi-poc-new", label: "PoC 등록", type: "page", href: "/oi/poc/new" },
          { id: "oi-conversion", label: "전환결과 추적", type: "page", href: "/oi/conversion" },
        ],
      },
      {
        id: "oi-gov",
        label: "정부사업관리",
        type: "folder",
        children: [
          { id: "oi-gov-list", label: "정부사업 연계", type: "page", href: "/oi/government" },
          { id: "oi-gov-new", label: "사업 등록", type: "page", href: "/oi/government/new" },
        ],
      },
    ],
  },
  {
    id: "backoffice",
    label: "백오피스",
    menu: [
      {
        id: "bo-contract",
        label: "계약관리",
        type: "folder",
        children: [
          { id: "bo-contract-center", label: "계약 관리센터", type: "page", href: "/backoffice/contracts" },
          { id: "bo-execution", label: "투자 집행관리", type: "page", href: "/backoffice/execution" },
          { id: "bo-captable", label: "Cap Table", type: "page", href: "/backoffice/cap-table" },
        ],
      },
      {
        id: "bo-fund",
        label: "조합관리",
        type: "folder",
        children: [
          { id: "bo-fund-list", label: "조합 현황", type: "page", href: "/backoffice/funds" },
          { id: "bo-fund-lp", label: "LP 관리", type: "page", href: "/backoffice/funds/lp" },
          { id: "bo-fund-report", label: "LP 보고서", type: "page", href: "/backoffice/funds/report" },
        ],
      },
      {
        id: "bo-report",
        label: "보고센터",
        type: "folder",
        children: [
          { id: "bo-report-list", label: "보고서 관리", type: "page", href: "/backoffice/reports" },
          { id: "bo-report-new", label: "보고서 생성", type: "page", href: "/backoffice/reports/new" },
        ],
      },
      {
        id: "bo-compliance",
        label: "컴플라이언스",
        type: "folder",
        children: [
          { id: "bo-compliance-check", label: "컴플라이언스 체크", type: "page", href: "/backoffice/compliance" },
        ],
      },
    ],
  },
  {
    id: "kpi",
    label: "KPI",
    menu: [
      {
        id: "kpi-team",
        label: "팀별KPI",
        type: "folder",
        children: [
          { id: "kpi-sourcing", label: "소싱팀 KPI", type: "page", href: "/kpi/team/sourcing" },
          { id: "kpi-review", label: "심사팀 KPI", type: "page", href: "/kpi/team/review" },
          { id: "kpi-incubation", label: "보육팀 KPI", type: "page", href: "/kpi/team/incubation" },
          { id: "kpi-oi", label: "OI팀 KPI", type: "page", href: "/kpi/team/oi" },
          { id: "kpi-backoffice", label: "백오피스 KPI", type: "page", href: "/kpi/team/backoffice" },
        ],
      },
      {
        id: "kpi-exec",
        label: "경영대시보드",
        type: "folder",
        children: [
          { id: "kpi-executive", label: "전사 경영 대시보드", type: "page", href: "/kpi/executive" },
        ],
      },
      {
        id: "kpi-startup",
        label: "기업별KPI",
        type: "folder",
        children: [
          { id: "kpi-startup-trend", label: "기업별 KPI 추이", type: "page", href: "/kpi/startup" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "관리",
    menu: [
      {
        id: "adm-sop",
        label: "SOP관리",
        type: "folder",
        children: [
          { id: "adm-sop-list", label: "SOP 템플릿", type: "page", href: "/admin/sop" },
          { id: "adm-sop-exec", label: "SOP 실행 이력", type: "page", href: "/admin/sop/executions" },
        ],
      },
      {
        id: "adm-form",
        label: "양식관리",
        type: "folder",
        children: [
          { id: "adm-form-list", label: "양식 템플릿", type: "page", href: "/admin/forms" },
          { id: "adm-form-submit", label: "양식 제출 이력", type: "page", href: "/admin/forms/submissions" },
        ],
      },
      {
        id: "adm-kpi-target",
        label: "KPI목표설정",
        type: "folder",
        children: [
          { id: "adm-kpi-set", label: "KPI 목표 관리", type: "page", href: "/admin/kpi-targets" },
        ],
      },
      {
        id: "adm-jd",
        label: "JD관리",
        type: "folder",
        children: [
          { id: "adm-jd-list", label: "직무기술서", type: "page", href: "/admin/jd" },
        ],
      },
      {
        id: "adm-company",
        label: "기업정보관리",
        type: "folder",
        children: [
          { id: "adm-company-list", label: "기업 목록", type: "page", href: "/admin/companies" },
          { id: "adm-company-new", label: "기업 등록", type: "page", href: "/admin/companies/new" },
          { id: "adm-company-industry", label: "산업분류 관리", type: "page", href: "/admin/companies/industry" },
        ],
      },
      {
        id: "adm-fund-mgmt",
        label: "조합정보관리",
        type: "folder",
        children: [
          { id: "adm-fund-list", label: "조합 목록", type: "page", href: "/admin/funds" },
          { id: "adm-fund-new", label: "조합 등록", type: "page", href: "/admin/funds/new" },
          { id: "adm-fund-lp-mgmt", label: "LP 정보관리", type: "page", href: "/admin/funds/lp" },
        ],
      },
      {
        id: "adm-settings",
        label: "시스템설정",
        type: "folder",
        children: [
          { id: "adm-org", label: "조직/배치 설정", type: "page", href: "/admin/settings" },
          { id: "adm-thesis", label: "투자 Thesis", type: "page", href: "/admin/settings/thesis" },
          { id: "adm-mentor-pool", label: "멘토 풀 관리", type: "page", href: "/admin/mentors" },
          { id: "adm-users", label: "사용자 관리", type: "page", href: "/admin/users" },
        ],
      },
    ],
  },
];

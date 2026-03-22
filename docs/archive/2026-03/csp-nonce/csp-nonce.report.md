# Report: CSP unsafe-inline → nonce 기반 전환 (M10)

## 1. Executive Summary

### 1.1 개요

| 항목 | 값 |
|------|-----|
| **Feature** | csp-nonce |
| **우선순위** | M10 (Medium) |
| **완료일** | 2026-03-22 |
| **Match Rate** | 100% (5/5) |
| **Iteration** | 0회 |
| **신규 파일** | 1개 |
| **수정 파일** | 2개 |
| **총 라인** | 60줄 (신규+수정) |

### 1.2 PDCA 진행

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 100% → [Report] ✅
```

### 1.3 Value Delivered

| 관점 | 결과 |
|------|------|
| **Problem** | CSP에 `unsafe-inline` + `unsafe-eval` 허용 → XSS 공격에 취약 |
| **Solution** | middleware.ts에서 요청별 랜덤 nonce 생성, CSP 헤더에 nonce 기반 정책 적용 |
| **Function/UX Effect** | nonce 미일치 인라인 스크립트 차단, 개발 환경 HMR은 정상 동작 (unsafe-eval 분기) |
| **Core Value** | OWASP 보안 표준 준수, 금융 데이터 XSS 방어 강화 |

---

## 2. 구현 결과

### 2.1 파일 목록

| 파일 | 유형 | 라인 | 역할 |
|------|------|------|------|
| `frontend/src/middleware.ts` | 신규 | 30 | nonce 생성 + CSP 헤더 주입 |
| `frontend/next.config.js` | 수정 | — | 정적 CSP 헤더 제거 (-4줄) |
| `frontend/src/app/layout.tsx` | 수정 | 30 | async + nonce 읽기 + Toaster/meta 전달 |

### 2.2 아키텍처

```
Before:
  next.config.js → 정적 CSP (unsafe-inline, unsafe-eval 허용)
  → XSS 공격자 인라인 스크립트 실행 가능

After:
  Browser → middleware.ts (요청별 nonce 생성)
    → CSP: script-src 'nonce-{random}', style-src 'nonce-{random}'
    → layout.tsx (headers() → nonce → Toaster/meta에 전달)
    → 개발: unsafe-eval 허용 (HMR), 프로덕션: nonce만 허용
```

### 2.3 핵심 구현 사항

- **nonce 생성**: `crypto.randomUUID()` → base64 인코딩 (요청마다 고유)
- **개발/프로덕션 분기**: `NODE_ENV=development`일 때만 `unsafe-eval` 추가 (HMR용)
- **matcher**: API, `_next/static`, `_next/image`, `favicon.ico` 제외
- **layout nonce 전달**: `headers().get("x-nonce")` → `<meta>`, `<Toaster nonce={nonce}>`
- **기존 보안 헤더 유지**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

---

## 3. 보안 개선 비교

| 항목 | Before | After |
|------|--------|-------|
| script-src | `'self' 'unsafe-inline' 'unsafe-eval'` | `'self' 'nonce-{random}'` |
| style-src | `'self' 'unsafe-inline'` | `'self' 'nonce-{random}'` |
| XSS 방어 | 인라인 스크립트 무조건 실행 | nonce 일치 시에만 실행 |
| eval() 공격 | 허용됨 | 프로덕션에서 차단 |

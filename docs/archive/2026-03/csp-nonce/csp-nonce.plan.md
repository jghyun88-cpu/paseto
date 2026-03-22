# Plan: CSP unsafe-inline → nonce 기반 전환 (M10)

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | CSP에 `unsafe-inline`과 `unsafe-eval`이 허용되어 XSS 방어력이 약화됨 |
| **Solution** | Next.js의 nonce 기반 CSP 전환 — 요청별 랜덤 nonce 생성, script/style 태그에 적용 |
| **Function/UX Effect** | 인라인 스크립트 실행이 nonce 일치 시에만 허용, XSS 공격 차단 강화 |
| **Core Value** | OWASP 보안 표준 준수, 금융 데이터 보호 강화 |

## 배경

현재 `next.config.js`의 CSP:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
```

- `unsafe-inline`: 공격자가 주입한 인라인 스크립트도 실행됨
- `unsafe-eval`: `eval()` 기반 공격 가능
- Next.js 14 App Router에서 nonce 기반 CSP 지원

## 구현 계획

### 1. Middleware에서 nonce 생성
```typescript
// middleware.ts
import { NextResponse } from "next/server";

export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
    ...
  `;
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);
  return response;
}
```

### 2. Layout에서 nonce 전달
```typescript
// app/layout.tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }) {
  const nonce = headers().get("x-nonce") || "";
  return (
    <html>
      <body>
        <Script nonce={nonce} ... />
        {children}
      </body>
    </html>
  );
}
```

### 3. next.config.js에서 정적 CSP 제거
- `headers()` 함수의 CSP 설정 제거 (middleware로 이동)
- nonce 미적용 정적 헤더는 유지 (X-Frame-Options 등)

### 4. 서드파티 스크립트 대응
- Tailwind CSS: 빌드 시 외부 파일로 추출되므로 `'self'`로 충분
- 인라인 style 사용 부분 감사 → className으로 전환 필요

## 영향 범위
- `middleware.ts` 신규 생성 (또는 기존에 있다면 수정)
- `app/layout.tsx` 수정
- `next.config.js` CSP 헤더 제거
- 인라인 style 사용하는 컴포넌트 감사 (AuthGuard 등)

## 위험 요소
- 서드파티 라이브러리(sonner, shadcn)가 인라인 스타일 사용 시 깨질 수 있음
- Docker 환경에서 middleware 동작 확인 필요 (`output: "standalone"` 호환)
- 개발 환경에서 HMR이 `unsafe-eval` 필요 → 개발/프로덕션 분기 필요

## 검증 계획
1. 브라우저 콘솔에서 CSP 위반 에러 0건 확인
2. 인라인 스크립트 주입 시 차단 확인
3. 모든 페이지 정상 렌더링 확인
4. Lighthouse 보안 점수 확인

# Design: CSP unsafe-inline → nonce 기반 전환 (M10)

## 아키텍처

```
요청 흐름:
  Browser → middleware.ts (nonce 생성 + CSP 헤더 주입)
    → layout.tsx (headers()에서 nonce 읽기 → Script/Toaster에 전달)
    → 컴포넌트 렌더링 (인라인 style= → className 전환)

개발/프로덕션 분기:
  NODE_ENV=development → unsafe-eval 허용 (HMR용)
  NODE_ENV=production  → nonce만 허용
```

## 변경 사항

### 1. middleware.ts (신규)

요청마다 랜덤 nonce 생성, CSP 헤더 + `x-nonce` 헤더 설정.

```typescript
// frontend/src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}'`;

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' http://backend:8000`,
  ].join("; ");

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  return response;
}

export const config = {
  matcher: [
    // API, _next/static, _next/image, favicon 제외
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### 2. layout.tsx (수정)

`headers()`에서 nonce를 읽어 `<Script>` 및 서드파티에 전달.

```typescript
// 변경 전
export default function RootLayout({ children }) {

// 변경 후
export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";
```

- `<Toaster>` 등 서드파티: sonner는 인라인 style 사용 → `'nonce-${nonce}'`가 style-src에 포함되므로 정상 동작
- `<html>` 태그에 `<meta property="csp-nonce" content={nonce} />` 추가 (클라이언트 참조용)

### 3. next.config.js (수정)

정적 CSP 헤더 제거 (middleware로 이동). 나머지 보안 헤더는 유지.

```javascript
// 제거 대상
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
},

// 유지 대상
{ key: "X-Content-Type-Options", value: "nosniff" },
{ key: "X-Frame-Options", value: "DENY" },
{ key: "X-XSS-Protection", value: "1; mode=block" },
{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
```

### 4. 인라인 style 감사 및 전환

24건의 `style=` 사용 (9개 파일):

| 파일 | 건수 | 조치 |
|------|------|------|
| `page.tsx` (랜딩) | 15 | 진행률 바 등 동적 width → 유지 (nonce style-src로 허용) |
| `kpi-targets/page.tsx` | 2 | className 전환 검토 |
| `sop/page.tsx` | 1 | className 전환 검토 |
| `compliance/page.tsx` | 1 | 진행률 바 동적 width → 유지 |
| `sop/executions/page.tsx` | 1 | className 전환 검토 |
| `kpi/team/[team]/page.tsx` | 1 | className 전환 검토 |
| `sourcing/reports/channel/page.tsx` | 1 | className 전환 검토 |
| `sourcing/reports/funnel/page.tsx` | 1 | className 전환 검토 |
| `incubation/[id]/page.tsx` | 1 | className 전환 검토 |

**판단**: 동적 `style={{ width: ... }}` 패턴은 nonce 기반 `style-src`로 허용되므로 className 전환 불필요. CSP `style-src 'nonce-${nonce}'`가 서버 렌더링 인라인 style을 커버함.

## 구현 순서

1. `middleware.ts` 신규 생성
2. `next.config.js`에서 CSP 헤더 제거
3. `layout.tsx`에서 nonce 읽기 + async 전환
4. Docker 환경 테스트 (standalone 모드 호환성)
5. 브라우저 콘솔 CSP 위반 0건 확인

## 파일 목록

- `frontend/src/middleware.ts` (신규)
- `frontend/next.config.js` (수정 — CSP 헤더 제거)
- `frontend/src/app/layout.tsx` (수정 — async + nonce 전달)

## 위험 완화

| 위험 | 대응 |
|------|------|
| sonner(Toaster) 인라인 style 깨짐 | nonce가 style-src에 포함되어 서버 렌더링 style 허용 |
| HMR에 unsafe-eval 필요 | NODE_ENV=development 분기로 개발 시만 허용 |
| standalone 모드 middleware 호환 | Next.js 14 standalone은 middleware 지원 (server.js에 포함) |
| 클라이언트 컴포넌트 동적 style | React의 style prop은 CSP style-src nonce로 허용됨 |

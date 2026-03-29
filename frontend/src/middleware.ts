import { NextRequest, NextResponse } from "next/server";
import { PHASE2_ROUTES, PHASE2_TAB_PREFIXES } from "@/lib/menu-data";

/** phase:2 라우트인지 확인 */
function isPhase2Route(pathname: string): boolean {
  if (PHASE2_TAB_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return PHASE2_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // phase:2 라우트 → /coming-soon 리다이렉트
  if (isPhase2Route(pathname)) {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
  }

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
    `connect-src 'self'${process.env.CSP_CONNECT_EXTRA ? ` ${process.env.CSP_CONNECT_EXTRA}` : ''}`,
  ].join("; ");

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

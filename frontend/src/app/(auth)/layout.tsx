/**
 * (auth) Route Group 레이아웃 — DashboardLayout 미적용
 * 로그인 페이지는 사이드바/GNB 없이 독립 레이아웃 사용
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

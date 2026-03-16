"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "./AuthGuard";
import DashboardLayout from "./DashboardLayout";

const AUTH_PATHS = ["/login"];

/**
 * 앱 셸 — 인증 경로는 DashboardLayout 제외, 나머지는 포함
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}

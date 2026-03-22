import type { Metadata } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "eLSA — 딥테크 액셀러레이터 운영시스템",
  description: "소싱→심사→투자→보육→수요기업연결→회수 전주기 운영 플랫폼",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get("x-nonce") ?? "";

  return (
    <html lang="ko">
      <head>
        <meta property="csp-nonce" content={nonce} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster position="top-right" richColors closeButton nonce={nonce} />
      </body>
    </html>
  );
}

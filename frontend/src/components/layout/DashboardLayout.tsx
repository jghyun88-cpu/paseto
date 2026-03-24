"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopNav from "./TopNav";
import LeftToolbar, { type SidebarMode } from "./LeftToolbar";
import TreeMenu from "./TreeMenu";
import BottomBar from "./BottomBar";
import { NAV_TABS } from "@/lib/menu-data";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * URL pathname에서 활성 탭 ID를 자동 감지
 * /admin/* → "admin", /sourcing/* → "sourcing" 등
 */
function detectActiveTab(pathname: string): string {
  const pathTabMap: [string, string][] = [
    ["/admin", "admin"],
    ["/sourcing", "sourcing"],
    ["/review", "review"],
    ["/incubation", "incubation"],
    ["/oi/", "oi"],
    ["/backoffice", "backoffice"],
    ["/kpi", "kpi"],
    ["/handover", "dashboard"],
    ["/meetings", "dashboard"],
    ["/notifications", "dashboard"],
    ["/dashboard", "dashboard"],
    ["/startup", "dashboard"],
  ];

  for (const [prefix, tabId] of pathTabMap) {
    if (pathname.startsWith(prefix)) {
      return tabId;
    }
  }
  return "dashboard";
}

/**
 * K-SENS II 스타일 대시보드 전체 레이아웃
 *
 * 구조:
 * ┌─────────────── TopNav (GNB) ─────────────────┐
 * │ LeftToolbar │ TreeMenu + BottomBar │ Content  │
 * └──────────────────────────────────────────────┘
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => detectActiveTab(pathname));
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("menu");
  const [panelOpen, setPanelOpen] = useState(true);

  // URL 변경 시 활성 탭 자동 업데이트
  useEffect(() => {
    const detected = detectActiveTab(pathname);
    setActiveTab(detected);
  }, [pathname]);

  const activeTabData = NAV_TABS.find((t) => t.id === activeTab);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSidebarMode("menu");
    setPanelOpen(true);
  }, []);

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleTogglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const handleSearch = useCallback((_query: string) => {
    // TODO: 메뉴 검색 기능 구현 예정
  }, []);

  return (
    <div className="dashboard">
      <TopNav
        tabs={NAV_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="dashboard-body">
        <LeftToolbar
          activeMode={sidebarMode}
          onModeChange={setSidebarMode}
          onScrollTop={handleScrollTop}
          onTogglePanel={handleTogglePanel}
        />

        {panelOpen && (
          <div className="dashboard-panel">
            <div className="dashboard-panel-content">
              {sidebarMode === "menu" && activeTabData && (
                <TreeMenu
                  rootLabel={activeTabData.label}
                  nodes={activeTabData.menu}
                  onNavigate={handleNavigate}
                />
              )}
              {sidebarMode === "my-menu" && (
                <div className="dashboard-panel-empty">
                  <p>즐겨찾기한 메뉴가 없습니다.</p>
                  <p className="text-xs mt-1">메뉴의 ★ 아이콘을 클릭하여 추가하세요.</p>
                </div>
              )}
              {sidebarMode === "recent" && (
                <div className="dashboard-panel-empty">
                  <p>최근 사용한 메뉴가 없습니다.</p>
                </div>
              )}
            </div>
            <BottomBar onSearch={handleSearch} />
          </div>
        )}

        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}

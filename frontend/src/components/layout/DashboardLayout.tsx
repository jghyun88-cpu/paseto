"use client";

import { useState, useCallback } from "react";
import TopNav from "./TopNav";
import LeftToolbar, { type SidebarMode } from "./LeftToolbar";
import TreeMenu from "./TreeMenu";
import BottomBar from "./BottomBar";
import { NAV_TABS } from "@/lib/menu-data";

interface DashboardLayoutProps {
  children: React.ReactNode;
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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("menu");
  const [panelOpen, setPanelOpen] = useState(true);

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
    // Phase 1: 단순 alert, 추후 Next.js router 연동
    window.location.href = href;
  }, []);

  const handleSearch = useCallback((query: string) => {
    // Phase 1: 메뉴 검색 placeholder
    alert(`메뉴 검색: ${query}`);
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

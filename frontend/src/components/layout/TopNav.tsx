"use client";

import { Button } from "@/components/ui/button";
import type { NavTab } from "@/lib/types";

interface TopNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * 상단 GNB — K-SENS II 스타일 수평 탭 네비게이션
 * 활성 탭: 주황색 텍스트 + 하단 도트 인디케이터
 */
export default function TopNav({ tabs, activeTab, onTabChange }: TopNavProps) {
  return (
    <header className="topnav">
      <div className="topnav-logo">
        <span className="topnav-logo-icon">◆</span>
        <span className="topnav-logo-text">eLSA</span>
        <span className="topnav-logo-sub">딥테크 액셀러레이터</span>
      </div>

      <nav className="topnav-tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`topnav-tab ${isActive ? "topnav-tab--active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
              {isActive && <span className="topnav-tab-dot" />}
            </Button>
          );
        })}
      </nav>
    </header>
  );
}

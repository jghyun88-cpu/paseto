"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NavTab } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

interface TopNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * 상단 GNB — K-SENS II 스타일 수평 탭 네비게이션
 * 활성 탭: 주황색 텍스트 + 하단 도트 인디케이터
 * 우측: 사용자 정보 + 로그아웃 버튼
 */
export default function TopNav({ tabs, activeTab, onTabChange }: TopNavProps) {
  const { user, logout } = useAuth();

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

      <div className="topnav-user">
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
              <User size={14} />
              <span className="font-medium text-slate-800">{user.name}</span>
              <span className="text-slate-400">({user.team})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs h-7 px-2"
              onClick={logout}
            >
              <LogOut size={14} className="mr-1" />
              로그아웃
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

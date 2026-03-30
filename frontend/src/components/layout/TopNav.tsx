"use client";

import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NavTab } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

interface TopNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface UserInfo {
  name: string;
  team: string;
}

export default function TopNav({ tabs, activeTab, onTabChange }: TopNavProps) {
  const { user, logout } = useAuth();
  const [localUser, setLocalUser] = useState<UserInfo | null>(null);

  // zustand user가 없으면 API로 직접 조회
  useEffect(() => {
    if (user) {
      setLocalUser({ name: user.name, team: user.team });
      return;
    }
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (token) {
      api.get<UserInfo>("/auth/me")
        .then((res) => setLocalUser({ name: res.data.name, team: res.data.team }))
        .catch(() => setLocalUser(null));
    }
  }, [user]);

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  };

  const displayUser = user ?? localUser;

  return (
    <header className="topnav">
      <div className="topnav-logo">
        <span className="topnav-logo-icon">◆</span>
        <span className="topnav-logo-text">NEXA</span>
        <span className="topnav-logo-sub">딥테크 액셀러레이터</span>
      </div>

      <nav className="topnav-tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const isPhase2 = tab.phase === 2;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`topnav-tab ${isActive ? "topnav-tab--active" : ""} ${isPhase2 ? "topnav-tab--disabled" : ""}`}
              onClick={() => !isPhase2 && onTabChange(tab.id)}
              disabled={isPhase2}
              title={isPhase2 ? "2차 배포 예정" : undefined}
            >
              {tab.label}
              {isActive && <span className="topnav-tab-dot" />}
            </Button>
          );
        })}
      </nav>

      <div className="topnav-user">
        {displayUser && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-xs mr-2">
            <User size={14} className="text-slate-500" />
            <span className="font-medium text-slate-800">{displayUser.name}</span>
            <span className="text-slate-400">({displayUser.team})</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={14} />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
}

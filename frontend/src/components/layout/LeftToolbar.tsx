"use client";

import {
  ArrowUpToLine,
  PanelLeft,
  List,
  Star,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SidebarMode = "menu" | "my-menu" | "recent";

interface LeftToolbarProps {
  activeMode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onScrollTop: () => void;
  onTogglePanel: () => void;
}

/**
 * 좌측 도구 사이드바 — K-SENS II 스타일
 * TOP / LEFT / 메뉴 / MY메뉴 + 하단 최근메뉴
 */
export default function LeftToolbar({
  activeMode,
  onModeChange,
  onScrollTop,
  onTogglePanel,
}: LeftToolbarProps) {
  return (
    <aside className="left-toolbar">
      <div className="left-toolbar-top">
        <Button
          variant="ghost"
          className={`left-toolbar-btn`}
          onClick={onScrollTop}
          title="맨 위로"
        >
          <ArrowUpToLine size={16} />
          <span>TOP</span>
        </Button>

        <Button
          variant="ghost"
          className={`left-toolbar-btn`}
          onClick={onTogglePanel}
          title="패널 토글"
        >
          <PanelLeft size={16} />
          <span>LEFT</span>
        </Button>

        <Button
          variant="ghost"
          className={`left-toolbar-btn ${activeMode === "menu" ? "left-toolbar-btn--active" : ""}`}
          onClick={() => onModeChange("menu")}
          title="메뉴"
        >
          <List size={16} />
          <span>메뉴</span>
        </Button>

        <Button
          variant="ghost"
          className={`left-toolbar-btn ${activeMode === "my-menu" ? "left-toolbar-btn--active" : ""}`}
          onClick={() => onModeChange("my-menu")}
          title="MY메뉴"
        >
          <Star size={16} />
          <span>MY메뉴</span>
        </Button>
      </div>

      <div className="left-toolbar-bottom">
        <Button
          variant="ghost"
          className={`left-toolbar-btn ${activeMode === "recent" ? "left-toolbar-btn--active" : ""}`}
          onClick={() => onModeChange("recent")}
          title="최근메뉴"
        >
          <Clock size={16} />
          <span>최근메뉴</span>
        </Button>
      </div>
    </aside>
  );
}

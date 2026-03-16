"use client";

import { useState, useCallback } from "react";
import {
  Search,
  LayoutGrid,
  LayoutList,
  Monitor,
  Columns2,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomBarProps {
  onSearch: (query: string) => void;
}

/**
 * 하단 검색 바 — K-SENS II 스타일
 * 검색창 + GO 버튼 + 메뉴검색 버튼 + 레이아웃 아이콘
 */
export default function BottomBar({ onSearch }: BottomBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-search">
        <input
          type="text"
          className="bottom-bar-input"
          placeholder=""
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button size="sm" className="bottom-bar-go" onClick={handleSubmit}>
          GO
        </Button>
        <Button size="sm" className="bottom-bar-menu-search" onClick={handleSubmit}>
          <Search size={12} />
          메뉴검색
        </Button>
      </div>
      <div className="bottom-bar-icons">
        <Button variant="outline" size="icon" className="bottom-bar-icon" title="그리드뷰">
          <LayoutGrid size={16} />
        </Button>
        <Button variant="outline" size="icon" className="bottom-bar-icon" title="리스트뷰">
          <LayoutList size={16} />
        </Button>
        <Button variant="outline" size="icon" className="bottom-bar-icon" title="전체화면">
          <Monitor size={16} />
        </Button>
        <Button variant="outline" size="icon" className="bottom-bar-icon" title="분할뷰">
          <Columns2 size={16} />
        </Button>
        <Button variant="outline" size="icon" className="bottom-bar-icon" title="테이블뷰">
          <Table2 size={16} />
        </Button>
      </div>
    </div>
  );
}

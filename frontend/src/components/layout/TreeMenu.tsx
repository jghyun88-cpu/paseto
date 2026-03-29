"use client";

import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Star,
} from "lucide-react";
import type { MenuNode } from "@/lib/types";

interface TreeMenuProps {
  rootLabel: string;
  nodes: MenuNode[];
  onNavigate: (href: string) => void;
}

/**
 * 트리 메뉴 — K-SENS II 스타일 계층형 폴더/문서 트리
 * 폴더: 접기/펼치기, 문서: 클릭 시 네비게이션
 */
export default function TreeMenu({ rootLabel, nodes, onNavigate }: TreeMenuProps) {
  return (
    <div className="tree-menu">
      <div className="tree-root">
        <Folder size={16} className="tree-icon tree-icon--folder" />
        <span className="tree-root-label">{rootLabel}</span>
        <Star size={14} className="tree-root-star" />
      </div>
      <div className="tree-children">
        {nodes.filter((node) => node.phase !== 2).map((node) => (
          <TreeNode key={node.id} node={node} depth={1} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: MenuNode;
  depth: number;
  onNavigate: (href: string) => void;
}

/** 들여쓰기 기준값 (px) */
const INDENT = 16;
/** 체브론 영역 너비: 아이콘(12px) + 간격(4px) = 16px */
const CHEVRON_AREA = 16;

function TreeNode({ node, depth, onNavigate }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleClick = useCallback(() => {
    if (node.type === "page" && node.href) {
      onNavigate(node.href);
    }
  }, [node, onNavigate]);

  /** 폴더: depth 기반 들여쓰기 */
  const folderIndent = depth * INDENT;
  /** 리프: 폴더 들여쓰기 + 체브론 영역만큼 추가 → 아이콘이 폴더 아이콘과 정렬 */
  const leafIndent = depth * INDENT + CHEVRON_AREA;

  if (node.type === "folder") {
    return (
      <div className="tree-node">
        <button
          type="button"
          className="tree-node-header"
          style={{ paddingLeft: folderIndent }}
          onClick={handleToggle}
        >
          {expanded ? (
            <ChevronDown size={12} className="tree-chevron" />
          ) : (
            <ChevronRight size={12} className="tree-chevron" />
          )}
          {expanded ? (
            <FolderOpen size={16} className="tree-icon tree-icon--folder" />
          ) : (
            <Folder size={16} className="tree-icon tree-icon--folder" />
          )}
          <span className="tree-node-label">{node.label}</span>
        </button>
        {expanded && node.children && (
          <div className="tree-children">
            {node.children.filter((child) => child.phase !== 2).map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="tree-node-leaf"
      style={{ paddingLeft: leafIndent }}
      onClick={handleClick}
    >
      <FileText size={14} className="tree-icon tree-icon--page" />
      <span className="tree-leaf-label">{node.label}</span>
    </button>
  );
}

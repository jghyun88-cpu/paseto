import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  /** 아이콘 (기본: Inbox) */
  icon?: ReactNode;
  /** 제목 */
  title: string;
  /** 설명 (선택) */
  description?: string;
  /** CTA 버튼 텍스트 */
  actionLabel?: string;
  /** CTA 클릭 핸들러 */
  onAction?: () => void;
  className?: string;
}

/**
 * 빈 데이터 상태 컴포넌트
 * 기존 "데이터가 없습니다." 텍스트를 대체하여 행동 유도(CTA) 포함
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox size={24} />}
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="max-w-xs text-xs text-slate-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

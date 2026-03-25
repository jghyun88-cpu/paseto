import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** 페이지 제목 */
  title: string;
  /** 우측 액션 영역 (버튼 등) */
  actions?: ReactNode;
  /** 제목 아래 설명 */
  description?: string;
  className?: string;
}

/**
 * 페이지 헤더 — 제목 + 액션 버튼
 * 기존 인라인 flex + h2 패턴을 표준화
 */
export function PageHeader({
  title,
  actions,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

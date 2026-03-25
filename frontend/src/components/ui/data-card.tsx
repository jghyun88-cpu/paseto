import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "warning" | "danger" | "success";

interface DataCardProps {
  /** 아이콘 */
  icon?: ReactNode;
  /** 라벨 */
  label: string;
  /** 주요 값 */
  value: ReactNode;
  /** 보조 텍스트 */
  sub?: string;
  /** 색상 변형 */
  variant?: CardVariant;
  /** 클릭 핸들러 (있으면 커서 포인터 + 호버 효과) */
  onClick?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: "bg-white border-slate-200",
  warning: "bg-amber-50 border-amber-200",
  danger: "bg-red-50 border-red-200",
  success: "bg-emerald-50 border-emerald-200",
};

/**
 * 데이터/KPI 카드 — 아이콘 + 라벨 + 값 + 보조 텍스트
 * 기존 대시보드 인라인 KPICard를 표준화
 */
export function DataCard({
  icon,
  label,
  value,
  sub,
  variant = "default",
  onClick,
  className,
}: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg shadow-sm border p-4",
        VARIANT_STYLES[variant],
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 mb-1 text-slate-500">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

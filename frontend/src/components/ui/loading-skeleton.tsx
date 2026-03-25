import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  /** 표시할 행 수 */
  rows?: number;
  /** 추가 className */
  className?: string;
}

/**
 * 데이터 로딩 중 스켈레톤 UI
 * 기존 "로딩 중..." 텍스트를 대체
 */
export function LoadingSkeleton({ rows = 4, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-3 p-6", className)}>
      {/* 제목 스켈레톤 */}
      <div className="h-5 w-48 rounded bg-slate-200" />
      {/* 행 스켈레톤 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-4 flex-1 rounded bg-slate-100" />
          <div className="h-4 w-24 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

interface LoadingSpinnerProps {
  /** 메시지 */
  message?: string;
  className?: string;
}

/**
 * 전체 페이지 로딩 스피너
 */
export function LoadingSpinner({
  message = "로딩 중...",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-slate-400",
        className,
      )}
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

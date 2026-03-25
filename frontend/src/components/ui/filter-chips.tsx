import { cn } from "@/lib/utils";

interface FilterOption {
  key: string;
  label: string;
}

interface FilterChipsProps {
  /** 필터 옵션 목록 */
  options: FilterOption[];
  /** 현재 선택된 키 (null = "전체") */
  value: string | null;
  /** 선택 변경 핸들러 */
  onChange: (key: string | null) => void;
  /** "전체" 라벨 */
  allLabel?: string;
  className?: string;
}

/**
 * 필터 칩 그룹 — 전체 + 옵션 버튼
 * 기존 인라인 rounded-full 버튼 반복 패턴을 표준화
 */
export function FilterChips({
  options,
  value,
  onChange,
  allLabel = "전체",
  className,
}: FilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1 mb-4", className)}>
      <button
        type="button"
        className={cn(
          "px-3 py-1 text-xs rounded-full border transition-colors",
          !value
            ? "bg-slate-800 text-white border-slate-800"
            : "bg-white text-slate-600 border-slate-300 hover:border-slate-400",
        )}
        onClick={() => onChange(null)}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={cn(
            "px-3 py-1 text-xs rounded-full border transition-colors",
            value === opt.key
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400",
          )}
          onClick={() => onChange(opt.key === value ? null : opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

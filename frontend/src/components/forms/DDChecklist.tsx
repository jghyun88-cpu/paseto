"use client";

import { DD_ITEMS, type DDStatus } from "@/lib/types";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface DDChecklistProps {
  checklist: Record<string, string>;
  onChange: (key: string, status: DDStatus) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: { value: DDStatus; label: string }[] = [
  { value: "pending", label: "대기" },
  { value: "completed", label: "완료" },
  { value: "issue", label: "이슈" },
];

function statusIcon(status: string) {
  if (status === "completed") return <CheckCircle size={16} className="text-green-500" />;
  if (status === "issue") return <AlertTriangle size={16} className="text-amber-500" />;
  return <Clock size={16} className="text-slate-400" />;
}

export default function DDChecklist({ checklist, onChange, disabled }: DDChecklistProps) {
  const completedCount = DD_ITEMS.filter((k) => checklist[k] === "completed").length;
  const pct = Math.round((completedCount / DD_ITEMS.length) * 100);

  return (
    <div className="space-y-3">
      {/* 진행률 바 */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 font-medium">DD 진행률</span>
          <span className="font-bold text-slate-800">{completedCount}/{DD_ITEMS.length} ({pct}%)</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 항목 리스트 */}
      <div className="space-y-2">
        {DD_ITEMS.map((item) => {
          const status = (checklist[item] ?? "pending") as DDStatus;
          return (
            <div key={item} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
              {statusIcon(status)}
              <span className="text-sm font-medium text-slate-700 flex-1">{item}</span>
              <select
                value={status}
                onChange={(e) => onChange(item, e.target.value as DDStatus)}
                disabled={disabled}
                className="text-sm px-2 py-1 border border-slate-300 rounded-md bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {pct === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <span className="text-sm font-bold text-green-700">DD 전항목 완료 — IC 상정 가능</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  lastChecked: string | null;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "investment_contract", label: "투자계약 검토 완료", checked: false, lastChecked: null },
  { key: "legal_docs", label: "법적 서류 제출 완료", checked: false, lastChecked: null },
  { key: "regulatory", label: "규제 준수 확인", checked: false, lastChecked: null },
  { key: "lp_reporting", label: "LP 보고 의무 이행", checked: false, lastChecked: null },
  { key: "conflict_of_interest", label: "이해충돌 검토", checked: false, lastChecked: null },
  { key: "aml", label: "자금세탁방지 확인", checked: false, lastChecked: null },
];

const STORAGE_KEY = "elsa_compliance_checklist";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "미확인";
  return dateStr.slice(0, 10).replace(/-/g, ".");
}

export default function CompliancePage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ChecklistItem[] = JSON.parse(stored);
        setChecklist(parsed);
      } catch {
        /* 파싱 실패 시 기본값 유지 */
      }
    }
  }, []);

  const handleToggle = useCallback((key: string) => {
    setSaved(false);
    setChecklist((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              checked: !item.checked,
              lastChecked: !item.checked ? new Date().toISOString() : item.lastChecked,
            }
          : item
      )
    );
  }, []);

  const handleSave = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
    setSaved(true);
  }, [checklist]);

  const completedCount = checklist.filter((c) => c.checked).length;
  const totalCount = checklist.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">컴플라이언스 체크</h2>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600">저장 완료</span>}
          <Button size="sm" onClick={handleSave}>저장</Button>
        </div>
      </div>

      {/* 진행률 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-600">준수 현황</span>
          <span className={`text-sm font-bold ${completedCount === totalCount ? "text-green-600" : "text-amber-600"}`}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completedCount === totalCount ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* 체크리스트 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-100">
        {checklist.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer"
            onClick={() => handleToggle(item.key)}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggle(item.key)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`text-sm ${item.checked ? "text-slate-500 line-through" : "text-slate-800 font-medium"}`}>
                {item.label}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              최종확인: {formatDate(item.lastChecked)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

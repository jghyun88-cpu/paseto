"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { fmtDate } from "@/lib/formatters";
import api from "@/lib/api";
import { showError, showSuccess } from "@/lib/toast";

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

export default function CompliancePage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadChecklist() {
      try {
        const { data } = await api.get("/compliance/checklists/");
        if (data) {
          setChecklist(data.items);
          return;
        }
        // 서버에 데이터 없음 — localStorage 마이그레이션 시도
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: ChecklistItem[] = JSON.parse(stored);
          setChecklist(parsed);
          // 서버로 마이그레이션
          await api.patch("/compliance/checklists/", { items: parsed });
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // API 실패 시 localStorage fallback
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setChecklist(JSON.parse(stored));
          } catch {
            showError("저장된 체크리스트를 불러오는 데 실패했습니다.");
          }
        }
      }
    }
    loadChecklist();
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

  const handleSave = useCallback(async () => {
    try {
      await api.patch("/compliance/checklists/", { items: checklist });
      setSaved(true);
      showSuccess("저장 완료");
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // API 실패 시 localStorage에 임시 저장
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
      setSaved(false);
      showError("서버 저장 실패. 로컬에 임시 저장되었습니다.");
    }
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
              최종확인: {fmtDate(item.lastChecked)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface ExitItem {
  id: string; startup_id: string; exit_type: string; exit_amount: number | null;
  multiple: number | null; exit_date: string | null;
  cap_table_clean: boolean; preferred_terms_reviewed: boolean; drag_tag_reviewed: boolean;
  ip_ownership_clean: boolean; accounting_transparent: boolean; customer_contracts_stable: boolean;
  management_issue_clear: boolean;
}

const EXIT_LABELS: Record<string, string> = {
  secondary_sale: "구주매각", ma: "M&A", strategic_sale: "전략매각", ipo: "IPO",
  secondary_market: "세컨더리", tech_transfer: "기술이전", jv: "합작법인", writeoff: "손실처리",
};

const CHECKLIST_ITEMS = [
  { key: "cap_table_clean", label: "Cap Table 정리" },
  { key: "preferred_terms_reviewed", label: "우선주 조건 검토" },
  { key: "drag_tag_reviewed", label: "Drag/Tag Along 검토" },
  { key: "ip_ownership_clean", label: "IP 소유권 정리" },
  { key: "accounting_transparent", label: "회계 투명성" },
  { key: "customer_contracts_stable", label: "고객 계약 안정성" },
  { key: "management_issue_clear", label: "경영권 이슈 정리" },
];

export default function ExitsPage() {
  const [items, setItems] = useState<ExitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startupId, setStartupId] = useState("");
  const [exitType, setExitType] = useState("secondary_sale");
  const [exitAmount, setExitAmount] = useState("");
  const [multiple, setMultiple] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try { const res = await api.get<{ data: ExitItem[] }>("/exit-records/?page_size=100"); setItems(res.data.data); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!startupId) { setError("스타트업 ID는 필수입니다."); return; }
    setError(""); setSaving(true);
    try {
      await api.post("/exit-records/", {
        startup_id: startupId, exit_type: exitType,
        exit_amount: exitAmount ? parseInt(exitAmount, 10) : null,
        multiple: multiple ? parseFloat(multiple) : null,
      });
      setShowForm(false); setStartupId(""); setExitAmount(""); setMultiple(""); await fetchData();
    } catch { setError("등록에 실패했습니다."); } finally { setSaving(false); }
  }, [startupId, exitType, exitAmount, multiple, fetchData]);

  const checklistCount = (item: ExitItem) => CHECKLIST_ITEMS.filter((c) => item[c.key as keyof ExitItem]).length;

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-slate-800">회수 관리</h2><Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={16} className="mr-1" /> 등록</Button></div>
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">스타트업 ID *</label><input type="text" value={startupId} onChange={(e) => setStartupId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">회수방식</label><select value={exitType} onChange={(e) => setExitType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">{Object.entries(EXIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">금액 (원)</label><input type="number" value={exitAmount} onChange={(e) => setExitAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">배수 (x)</label><input type="number" step="0.1" value={multiple} onChange={(e) => setMultiple(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "등록 중..." : "등록"}</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button></div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left py-2 px-3 text-slate-600 font-semibold">회수방식</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">금액</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">배수</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">체크리스트</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">회수일</th></tr></thead>
          <tbody>{items.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="py-2 px-3 font-medium text-slate-800">{EXIT_LABELS[r.exit_type] ?? r.exit_type}</td>
              <td className="py-2 px-3">{r.exit_amount ? `${(r.exit_amount / 100000000).toFixed(1)}억` : "-"}</td>
              <td className="py-2 px-3">{r.multiple ? `${r.multiple}x` : "-"}</td>
              <td className="py-2 px-3"><span className={`text-xs font-semibold ${checklistCount(r) === 7 ? "text-green-600" : "text-amber-600"}`}>{checklistCount(r)}/7</span></td>
              <td className="py-2 px-3">{r.exit_date ?? "-"}</td>
            </tr>
          ))}</tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">회수 기록이 없습니다.</div>}
      </div>
    </div>
  );
}

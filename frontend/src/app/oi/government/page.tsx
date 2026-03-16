"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface GovProgram {
  id: string; startup_id: string; program_type: string; program_name: string;
  managing_agency: string; status: string; amount: number | null;
  period_start: string | null; period_end: string | null; applied_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  tips: "TIPS", pre_tips: "Pre-TIPS", rnd: "R&D 과제", sandbox: "규제샌드박스",
  pilot_support: "실증지원", overseas_voucher: "해외진출 바우처",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-600", applied: "bg-blue-100 text-blue-700",
  selected: "bg-emerald-100 text-emerald-700", in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
};

export default function GovernmentPage() {
  const [items, setItems] = useState<GovProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startupId, setStartupId] = useState("");
  const [programType, setProgramType] = useState("tips");
  const [programName, setProgramName] = useState("");
  const [agency, setAgency] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try { const res = await api.get<{ data: GovProgram[] }>("/government-programs/?page_size=100"); setItems(res.data.data); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!startupId || !programName || !agency) { setError("스타트업 ID, 사업명, 주관기관은 필수입니다."); return; }
    setError(""); setSaving(true);
    try {
      await api.post("/government-programs/", { startup_id: startupId, program_type: programType, program_name: programName, managing_agency: agency });
      setShowForm(false); setStartupId(""); setProgramName(""); setAgency(""); await fetchData();
    } catch { setError("등록에 실패했습니다."); } finally { setSaving(false); }
  }, [startupId, programType, programName, agency, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">정부사업 연계 트래커</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={16} className="mr-1" /> 등록</Button>
      </div>
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">스타트업 ID *</label><input type="text" value={startupId} onChange={(e) => setStartupId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">사업 유형</label><select value={programType} onChange={(e) => setProgramType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">사업명 *</label><input type="text" value={programName} onChange={(e) => setProgramName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">주관기관 *</label><input type="text" value={agency} onChange={(e) => setAgency(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "등록 중..." : "등록"}</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button></div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left py-2 px-3 text-slate-600 font-semibold">사업유형</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">사업명</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">주관기관</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">금액</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">기간</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th></tr></thead>
          <tbody>{items.map((g) => (
            <tr key={g.id} className="border-t border-slate-100">
              <td className="py-2 px-3">{TYPE_LABELS[g.program_type] ?? g.program_type}</td>
              <td className="py-2 px-3 font-medium text-slate-800">{g.program_name}</td>
              <td className="py-2 px-3">{g.managing_agency}</td>
              <td className="py-2 px-3">{g.amount ? `${(g.amount / 100000000).toFixed(1)}억` : "-"}</td>
              <td className="py-2 px-3 text-xs">{g.period_start && g.period_end ? `${g.period_start} ~ ${g.period_end}` : "-"}</td>
              <td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[g.status] ?? "bg-slate-100 text-slate-600"}`}>{g.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">등록된 정부사업이 없습니다.</div>}
      </div>
    </div>
  );
}

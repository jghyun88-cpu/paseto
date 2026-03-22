"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface FollowOnItem {
  id: string; startup_id: string; round_type: string; target_amount: number | null;
  lead_investor: string | null; ir_meetings_count: number; status: string; closed_at: string | null;
}

const ROUND_LABELS: Record<string, string> = { bridge: "브릿지", pre_a: "Pre-A", series_a: "시리즈 A", strategic: "전략투자" };
const STATUS_LABELS: Record<string, string> = { planning: "기획", ir_active: "IR 진행", termsheet: "Term Sheet", closing: "클로징", completed: "완료" };

export default function FollowOnPage() {
  const [items, setItems] = useState<FollowOnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startupId, setStartupId] = useState("");
  const [roundType, setRoundType] = useState("pre_a");
  const [targetAmount, setTargetAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try { const res = await api.get<{ data: FollowOnItem[] }>("/follow-on-investments/?page_size=100"); setItems(res.data.data); } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!startupId) { setError("스타트업 ID는 필수입니다."); return; }
    setError(""); setSaving(true);
    try {
      await api.post("/follow-on-investments/", { startup_id: startupId, round_type: roundType, target_amount: targetAmount ? parseInt(targetAmount, 10) : null });
      setShowForm(false); setStartupId(""); setTargetAmount(""); await fetchData();
    } catch { setError("등록에 실패했습니다."); } finally { setSaving(false); }
  }, [startupId, roundType, targetAmount, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-slate-800">후속투자 관리</h2><Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={16} className="mr-1" /> 등록</Button></div>
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">스타트업 ID *</label><input type="text" value={startupId} onChange={(e) => setStartupId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">라운드</label><select value={roundType} onChange={(e) => setRoundType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">{Object.entries(ROUND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">목표금액 (원)</label><input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "등록 중..." : "등록"}</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button></div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left py-2 px-3 text-slate-600 font-semibold">라운드</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">목표금액</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">리드투자자</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">미팅 수</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th></tr></thead>
          <tbody>{items.map((f) => (
            <tr key={f.id} className="border-t border-slate-100">
              <td className="py-2 px-3 font-medium text-slate-800">{ROUND_LABELS[f.round_type] ?? f.round_type}</td>
              <td className="py-2 px-3">{f.target_amount ? `${(f.target_amount / 100000000).toFixed(1)}억` : "-"}</td>
              <td className="py-2 px-3">{f.lead_investor ?? "-"}</td>
              <td className="py-2 px-3">{f.ir_meetings_count}</td>
              <td className="py-2 px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{STATUS_LABELS[f.status] ?? f.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">후속투자 기록이 없습니다.</div>}
      </div>
    </div>
  );
}

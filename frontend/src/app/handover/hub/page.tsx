"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface HandoverItem {
  id: string; from_team: string; to_team: string; handover_type: string;
  acknowledged_by: string | null; acknowledged_at: string | null;
  escalated: boolean; created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  sourcing_to_review: "Sourcing → 심사", review_to_backoffice: "심사 → 백오피스",
  review_to_incubation: "심사 → 보육", incubation_to_oi: "보육 → OI",
  oi_to_review: "OI → 심사 (역인계)", backoffice_broadcast: "백오피스 → 전체",
};

export default function HandoverHubPage() {
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/handovers/?page_size=100";
      if (filterType) url += `&from_team=${filterType.split("_to_")[0]}`;
      const res = await api.get<HandoverItem[]>(url);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = items.length;
  const acknowledged = items.filter((h) => h.acknowledged_by).length;
  const pending = items.filter((h) => !h.acknowledged_by && !h.escalated).length;
  const escalated = items.filter((h) => h.escalated).length;

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">인계 허브</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-600 border-slate-200">전체 <b>{total}</b></span>
        <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-green-50 text-green-700 border-green-200">확인 <b>{acknowledged}</b></span>
        <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-amber-50 text-amber-700 border-amber-200">대기 <b>{pending}</b></span>
        <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-red-50 text-red-700 border-red-200">에스컬레이션 <b>{escalated}</b></span>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`px-3 py-1 text-xs rounded-full border ${!filterType ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterType(null)}>전체</button>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <button key={k} className={`px-3 py-1 text-xs rounded-full border ${filterType === k ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterType(k === filterType ? null : k)}>{v}</button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((h) => (
          <div key={h.id} className={`bg-white rounded-lg shadow-sm border p-4 ${h.escalated ? "border-red-300" : h.acknowledged_by ? "border-slate-200" : "border-amber-300"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">{TYPE_LABELS[h.handover_type] ?? `${h.from_team} → ${h.to_team}`}</span>
                {h.escalated && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">에스컬레이션</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${h.acknowledged_by ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {h.acknowledged_by ? "확인됨" : "대기중"}
                </span>
                <span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">인계 기록이 없습니다.</div>}
      </div>
    </div>
  );
}

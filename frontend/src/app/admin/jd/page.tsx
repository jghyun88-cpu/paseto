"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface JDItem { id: string; jd_code: string; title: string; team: string; purpose: string; is_active: boolean; }
const TEAM_LABELS: Record<string, string> = { sourcing: "Sourcing", review: "심사", backoffice: "백오피스", incubation: "보육", oi: "OI" };

export default function JDPage() {
  const router = useRouter();
  const [items, setItems] = useState<JDItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try { const res = await api.get<{ data: JDItem[] }>("/jd/?page_size=20"); setItems(res.data.data); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = useCallback(async () => { await api.post("/jd/seed"); await fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">직무기술서 (JD) 관리</h2>
        <Button size="sm" variant="outline" onClick={handleSeed}>10개 시드 생성</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((j) => (
          <div key={j.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/admin/jd/${j.id}`)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-600">{j.jd_code}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{TEAM_LABELS[j.team] ?? j.team}</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">{j.title}</h4>
            <p className="text-xs text-slate-500 line-clamp-2">{j.purpose}</p>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">JD가 없습니다. 시드를 생성하세요.</div>}
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface FormItem { id: string; form_code: string; title: string; owning_team: string; is_active: boolean; }
const TEAM_LABELS: Record<string, string> = { sourcing: "Sourcing", review: "심사", backoffice: "백오피스", incubation: "보육", oi: "OI" };

export default function FormsPage() {
  const [items, setItems] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try { const res = await api.get<{ data: FormItem[] }>("/forms/templates/?page_size=50"); setItems(res.data.data); } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = useCallback(async () => { await api.post("/forms/templates/seed"); await fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">양식 관리</h2>
        <Button size="sm" variant="outline" onClick={handleSeed}>14개 시드 생성</Button>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left py-2 px-3 text-slate-600 font-semibold">코드</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">양식명</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">소속팀</th><th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th></tr></thead>
          <tbody>{items.map((f) => (
            <tr key={f.id} className="border-t border-slate-100">
              <td className="py-2 px-3 font-bold text-blue-600">{f.form_code}</td>
              <td className="py-2 px-3 text-slate-800">{f.title}</td>
              <td className="py-2 px-3">{TEAM_LABELS[f.owning_team] ?? f.owning_team}</td>
              <td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{f.is_active ? "활성" : "비활성"}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">양식 템플릿이 없습니다. 시드를 생성하세요.</div>}
      </div>
    </div>
  );
}

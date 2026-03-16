"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface SOPItem { id: string; document_number: string; title: string; owning_team: string; steps: { step: number; name: string }[]; is_active: boolean; }
interface ExecItem { id: string; sop_template_id: string; current_step: number; step_statuses: Record<string, string>; completed_at: string | null; started_at: string; }

const TEAM_LABELS: Record<string, string> = { sourcing: "Sourcing", review: "심사", backoffice: "백오피스", incubation: "보육", oi: "OI" };

export default function SOPPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SOPItem[]>([]);
  const [executions, setExecutions] = useState<ExecItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, eRes] = await Promise.all([
        api.get<{ data: SOPItem[] }>("/sop/templates/?page_size=50"),
        api.get<{ data: ExecItem[] }>("/sop/executions/?page_size=50"),
      ]);
      setTemplates(tRes.data.data); setExecutions(eRes.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = useCallback(async () => {
    await api.post("/sop/templates/seed"); await fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">SOP 관리</h2>
        <Button size="sm" variant="outline" onClick={handleSeed}>6개 시드 생성</Button>
      </div>
      <h3 className="text-sm font-bold text-slate-700 mb-2">SOP 템플릿 ({templates.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-600">{t.document_number}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{TEAM_LABELS[t.owning_team] ?? t.owning_team}</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">{t.title}</h4>
            <p className="text-xs text-slate-500">{t.steps.length}단계: {t.steps.map((s) => s.name).join(" → ")}</p>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-bold text-slate-700 mb-2">실행 중 ({executions.length})</h3>
      <div className="space-y-2">
        {executions.map((e) => {
          const total = Object.keys(e.step_statuses).length;
          const completed = Object.values(e.step_statuses).filter((s) => s === "completed").length;
          return (
            <div key={e.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 cursor-pointer hover:shadow-md" onClick={() => router.push(`/admin/sop/${e.id}`)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-800">Step {e.current_step}/{total}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${e.completed_at ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{e.completed_at ? "완료" : "진행중"}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
              </div>
            </div>
          );
        })}
        {executions.length === 0 && <p className="text-sm text-slate-400">실행 중인 SOP가 없습니다.</p>}
      </div>
    </div>
  );
}

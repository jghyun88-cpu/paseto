"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface ExecDetail { id: string; sop_template_id: string; current_step: number; step_statuses: Record<string, string>; started_at: string; completed_at: string | null; notes: string | null; }
interface SOPDetail { id: string; document_number: string; title: string; steps: { step: number; name: string; forms?: string[] }[]; }

export default function SOPExecutionPage() {
  const params = useParams(); const router = useRouter();
  const [exec, setExec] = useState<ExecDetail | null>(null);
  const [sop, setSop] = useState<SOPDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api.get<ExecDetail>(`/sop/executions/${params.id}`)
      .then(async (res) => { setExec(res.data); try { const s = await api.get<SOPDetail>(`/sop/templates/${res.data.sop_template_id}`); setSop(s.data); } catch { showError("SOP 템플릿을 불러오는 데 실패했습니다."); } })
      .catch(() => router.push("/admin/sop")).finally(() => setLoading(false));
  }, [params.id, router]);

  const handleAdvance = useCallback(async (stepNum: number) => {
    await api.patch(`/sop/executions/${params.id}/step`, { step_number: stepNum, status: "completed" });
    const res = await api.get<ExecDetail>(`/sop/executions/${params.id}`); setExec(res.data);
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!exec) return <div className="p-8 text-center text-slate-400">SOP 실행을 찾을 수 없습니다.</div>;

  const steps = sop?.steps ?? [];
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/sop")}><ArrowLeft size={18} /></Button>
        <div><h2 className="text-lg font-bold text-slate-800">{sop?.title ?? "SOP 실행"}</h2><p className="text-xs text-slate-500">{sop?.document_number}</p></div>
      </div>
      <div className="space-y-3">
        {steps.map((s) => {
          const status = exec.step_statuses[String(s.step)] ?? "pending";
          return (
            <div key={s.step} className={`bg-white rounded-lg shadow-sm border p-4 ${status === "in_progress" ? "border-blue-300" : status === "completed" ? "border-green-300" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${status === "completed" ? "bg-green-500 text-white" : status === "in_progress" ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>{s.step}</span>
                  <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                  {s.forms && <span className="text-xs text-slate-500">({s.forms.join(", ")})</span>}
                </div>
                {status === "in_progress" && <Button size="sm" onClick={() => handleAdvance(s.step)}>완료 처리</Button>}
                {status === "completed" && <span className="text-xs text-green-600 font-semibold">완료</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

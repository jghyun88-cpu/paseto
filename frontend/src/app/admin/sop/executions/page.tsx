"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";
import { fmtDate } from "@/lib/formatters";

interface ExecItem {
  id: string;
  sop_template_id: string;
  template_name?: string;
  started_by?: string;
  started_at: string;
  completed_at: string | null;
  current_step: number;
  step_statuses: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
};

function getExecStatus(item: ExecItem): string {
  if (item.completed_at) return "completed";
  return "in_progress";
}

export default function SOPExecutionsPage() {
  const [items, setItems] = useState<ExecItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: ExecItem[] }>("/sop/executions/?page_size=100");
      setItems(res.data.data);
    } catch {
      try {
        const res = await api.get<{ data: ExecItem[] }>("/sop/?page_size=100");
        const execs = (res.data.data ?? []).filter(
          (item: Record<string, unknown>) => "step_statuses" in item
        ) as ExecItem[];
        setItems(execs);
      } catch {
        showError("데이터를 불러오는 데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">SOP 실행 이력</h2>
        <span className="text-xs text-slate-500">총 {items.length}건</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">템플릿</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">실행자</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">시작일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">완료일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">진행</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const status = getExecStatus(e);
              const totalSteps = Object.keys(e.step_statuses).length;
              const completedSteps = Object.values(e.step_statuses).filter(
                (s) => s === "completed"
              ).length;
              return (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {e.template_name ?? e.sop_template_id.slice(0, 8)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{e.started_by ?? "-"}</td>
                  <td className="py-2.5 px-3 text-slate-600">{fmtDate(e.started_at)}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {e.completed_at ? fmtDate(e.completed_at) : "-"}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: totalSteps > 0 ? `${(completedSteps / totalSteps) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {completedSteps}/{totalSteps}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">SOP 실행 이력이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

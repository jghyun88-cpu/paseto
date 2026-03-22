"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface PoCItem {
  id: string;
  project_name: string;
  startup_id: string;
  status: string;
  conversion_likelihood: string | null;
  conversion_result: string | null;
  kickoff_date: string | null;
  completion_date: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "설계",
  in_progress: "진행중",
  completed: "완료",
  failed: "실패",
  demand_identified: "수요발굴",
  matching: "매칭",
  kickoff: "킥오프",
  mid_review: "중간점검",
  commercial_contract: "상용계약",
  joint_development: "공동개발",
  strategic_investment: "전략투자",
  retry: "재실증",
  terminated: "종료",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  demand_identified: "bg-slate-100 text-slate-600",
  matching: "bg-purple-100 text-purple-700",
  kickoff: "bg-amber-100 text-amber-700",
  mid_review: "bg-amber-100 text-amber-700",
  commercial_contract: "bg-emerald-100 text-emerald-700",
  joint_development: "bg-emerald-100 text-emerald-700",
  strategic_investment: "bg-emerald-100 text-emerald-700",
  retry: "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
};

export default function ConversionPage() {
  const [items, setItems] = useState<PoCItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/poc-projects/?page_size=100";
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await api.get<{ data: PoCItem[] }>(url);
      setItems(res.data.data);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusFilters = ["planning", "in_progress", "completed", "failed"];

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">전환결과 추적</h2>
        <span className="text-xs text-slate-500">총 {items.length}건</span>
      </div>

      <div className="flex gap-1 mb-4">
        <button
          className={`px-3 py-1 text-xs rounded-full border ${!filterStatus ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
          onClick={() => setFilterStatus(null)}
        >
          전체
        </button>
        {statusFilters.map((s) => (
          <button
            key={s}
            className={`px-3 py-1 text-xs rounded-full border ${filterStatus === s ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
            onClick={() => setFilterStatus(s === filterStatus ? null : s)}
          >
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">프로젝트명</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">시작일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">종료일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">전환가능성</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">전환결과</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800">{p.project_name}</td>
                <td className="py-2.5 px-3 text-slate-600">{p.kickoff_date ?? "-"}</td>
                <td className="py-2.5 px-3 text-slate-600">{p.completion_date ?? "-"}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {p.conversion_likelihood ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.conversion_likelihood === "높음"
                        ? "bg-red-100 text-red-700"
                        : p.conversion_likelihood === "중간"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {p.conversion_likelihood}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{p.conversion_result ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">PoC 프로젝트가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

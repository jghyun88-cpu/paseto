"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface IncubationItem {
  id: string;
  startup_id: string;
  status: string;
  onboarding_status: string | null;
  assigned_pm_id: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  onboarding: "온보딩",
  active: "활성",
  graduated: "졸업",
  paused: "일시중지",
};

export default function OnboardingPage() {
  const [items, setItems] = useState<IncubationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      let url = "/incubations/?page_size=200";
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await api.get<{ data: IncubationItem[] }>(url);
      setItems(res.data.data ?? []);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">온보딩 워크플로우</h2>

      <div className="flex gap-1 mb-5">
        <button
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            !filterStatus
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
          }`}
          onClick={() => setFilterStatus("")}
        >
          전체
        </button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterStatus === key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
            onClick={() => setFilterStatus(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">스타트업 ID</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">온보딩 상태</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">담당 PM</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">등록일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800 font-mono text-xs">
                  {item.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {item.onboarding_status ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">
                  {item.assigned_pm_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("ko-KR") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            온보딩 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

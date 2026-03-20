"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface IncubationItem {
  id: string;
  startup_id: string;
  status: string;
  growth_plan: Record<string, unknown> | string | null;
  kpi_targets: Record<string, unknown> | string | null;
}

const STATUS_LABELS: Record<string, string> = {
  onboarding: "온보딩",
  active: "활성",
  graduated: "졸업",
  paused: "일시중지",
};

function summarize(value: Record<string, unknown> | string | null): string {
  if (!value) return "-";
  if (typeof value === "string") return value.slice(0, 60) || "-";
  const keys = Object.keys(value);
  if (keys.length === 0) return "-";
  return keys.slice(0, 3).join(", ") + (keys.length > 3 ? " ..." : "");
}

export default function ActionPlanPage() {
  const router = useRouter();
  const [items, setItems] = useState<IncubationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: IncubationItem[] }>(
        "/incubations/?page_size=200"
      );
      setItems(res.data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">90일 액션플랜</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">스타트업 ID</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">성장 계획</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">KPI 목표</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push(`/incubation/${item.id}/action-plan`)}
              >
                <td className="py-2.5 px-3 font-medium text-slate-800 font-mono text-xs">
                  {item.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600 text-xs">
                  {summarize(item.growth_plan)}
                </td>
                <td className="py-2.5 px-3 text-slate-600 text-xs">
                  {summarize(item.kpi_targets)}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            액션플랜 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

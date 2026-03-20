"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface KPIItem {
  id: string;
  team: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  period: string;
}

const TEAM_LABELS: Record<string, string> = {
  sourcing: "Sourcing",
  review: "심사",
  incubation: "보육",
  oi: "OI",
  backoffice: "백오피스",
};

const TEAM_ORDER = ["sourcing", "review", "incubation", "oi", "backoffice"];

function getProgressColor(current: number, target: number): string {
  if (target === 0) return "bg-slate-200";
  const ratio = current / target;
  if (ratio >= 1) return "bg-green-500";
  if (ratio >= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

export default function KPITargetsPage() {
  const [items, setItems] = useState<KPIItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: KPIItem[] }>("/team-kpis/?page_size=200");
      setItems(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedByTeam: Record<string, KPIItem[]> = {};
  for (const item of items) {
    const team = item.team ?? "unknown";
    if (!groupedByTeam[team]) groupedByTeam[team] = [];
    groupedByTeam[team].push(item);
  }

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">KPI 목표 관리</h2>
        <span className="text-xs text-slate-500">총 {items.length}개 지표</span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">
          등록된 KPI가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {TEAM_ORDER.filter((t) => groupedByTeam[t]).map((team) => (
            <div key={team}>
              <h3 className="text-sm font-bold text-slate-700 mb-2">
                {TEAM_LABELS[team] ?? team}팀
              </h3>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-slate-600 font-semibold">지표명</th>
                      <th className="text-left py-2 px-3 text-slate-600 font-semibold">기간</th>
                      <th className="text-left py-2 px-3 text-slate-600 font-semibold">목표</th>
                      <th className="text-left py-2 px-3 text-slate-600 font-semibold">현재</th>
                      <th className="text-left py-2 px-3 text-slate-600 font-semibold">달성률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByTeam[team].map((k) => {
                      const ratio = k.target_value > 0
                        ? Math.round((k.current_value / k.target_value) * 100)
                        : 0;
                      return (
                        <tr key={k.id} className="border-t border-slate-100">
                          <td className="py-2 px-3 font-medium text-slate-800">{k.metric_name}</td>
                          <td className="py-2 px-3 text-slate-600">{k.period}</td>
                          <td className="py-2 px-3 text-slate-600">{k.target_value}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium">{k.current_value}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getProgressColor(k.current_value, k.target_value)}`}
                                  style={{ width: `${Math.min(ratio, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">{ratio}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {Object.keys(groupedByTeam)
            .filter((t) => !TEAM_ORDER.includes(t))
            .map((team) => (
              <div key={team}>
                <h3 className="text-sm font-bold text-slate-700 mb-2">{team}</h3>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-2 px-3 text-slate-600 font-semibold">지표명</th>
                        <th className="text-left py-2 px-3 text-slate-600 font-semibold">기간</th>
                        <th className="text-left py-2 px-3 text-slate-600 font-semibold">목표</th>
                        <th className="text-left py-2 px-3 text-slate-600 font-semibold">현재</th>
                        <th className="text-left py-2 px-3 text-slate-600 font-semibold">달성률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByTeam[team].map((k) => {
                        const ratio = k.target_value > 0
                          ? Math.round((k.current_value / k.target_value) * 100)
                          : 0;
                        return (
                          <tr key={k.id} className="border-t border-slate-100">
                            <td className="py-2 px-3 font-medium text-slate-800">{k.metric_name}</td>
                            <td className="py-2 px-3 text-slate-600">{k.period}</td>
                            <td className="py-2 px-3 text-slate-600">{k.target_value}</td>
                            <td className="py-2 px-3 text-slate-800 font-medium">{k.current_value}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-100 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getProgressColor(k.current_value, k.target_value)}`}
                                    style={{ width: `${Math.min(ratio, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500">{ratio}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

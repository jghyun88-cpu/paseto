"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface TeamSummary {
  team: string; total_kpis: number; achieved: number; needs_improvement: number;
  highlight_kpis: { kpi_name: string; kpi_layer: string; target_value: number;
    actual_value: number | null; achievement_rate: number | null; status: string }[];
}

interface ExecutiveData {
  period: string;
  teams: Record<string, TeamSummary>;
  overall_health: string;
}

const TEAM_ORDER = ["sourcing", "review", "incubation", "oi", "backoffice"];
const TEAM_LABELS: Record<string, string> = { sourcing: "Sourcing", review: "심사팀", incubation: "보육팀", oi: "OI팀", backoffice: "백오피스" };

const HEALTH_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  "양호": { bg: "bg-emerald-50", text: "text-emerald-700", emoji: "🟢" },
  "보완필요": { bg: "bg-amber-50", text: "text-amber-700", emoji: "🟡" },
  "개선필요": { bg: "bg-red-50", text: "text-red-700", emoji: "🔴" },
  "데이터없음": { bg: "bg-slate-50", text: "text-slate-500", emoji: "⚪" },
};

export default function ExecutiveKPIPage() {
  const router = useRouter();
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<ExecutiveData>(`/team-kpis/executive?period=${period}`);
      setData(res.data);
    } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!data) return <div className="p-8 text-center text-slate-400">데이터를 불러올 수 없습니다.</div>;

  const health = HEALTH_COLORS[data.overall_health] ?? HEALTH_COLORS["데이터없음"];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">전사 경영 대시보드</h2>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded-md text-sm" />
      </div>

      <div className={`rounded-lg p-4 mb-5 ${health.bg}`}>
        <span className={`text-lg font-bold ${health.text}`}>{health.emoji} 전체 상태: {data.overall_health}</span>
      </div>

      {/* 팀별 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {TEAM_ORDER.map((team) => {
          const ts = data.teams[team];
          if (!ts) return null;
          const rate = ts.total_kpis > 0 ? Math.round((ts.achieved / ts.total_kpis) * 100) : 0;
          const teamHealth = HEALTH_COLORS[rate >= 90 ? "양호" : rate >= 70 ? "보완필요" : "개선필요"];
          return (
            <div key={team} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/kpi/team/${team}`)}>
              <div className="text-xs font-semibold text-slate-500 mb-1">{TEAM_LABELS[team]}</div>
              <div className={`text-2xl font-bold ${teamHealth.text}`}>{teamHealth.emoji} {rate}%</div>
              <div className="text-xs text-slate-500 mt-1">{ts.achieved}/{ts.total_kpis} 달성</div>
            </div>
          );
        })}
      </div>

      {/* 개선 필요 지표 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">개선 필요 지표</h3>
        <div className="space-y-2">
          {TEAM_ORDER.flatMap((team) => {
            const ts = data.teams[team];
            if (!ts) return [];
            return ts.highlight_kpis
              .filter((k) => k.status !== "양호" && k.status !== "데이터없음")
              .map((k, i) => (
                <div key={`${team}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${k.status === "개선필요" ? "bg-red-500" : "bg-amber-500"}`} />
                  <span className="text-slate-500 w-16">{TEAM_LABELS[team]}</span>
                  <span className="text-slate-800 font-medium">{k.kpi_name}</span>
                  <span className="text-slate-500">{k.actual_value ?? "-"}/{k.target_value}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${k.status === "개선필요" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {k.status}
                  </span>
                </div>
              ));
          })}
        </div>
      </div>
    </div>
  );
}

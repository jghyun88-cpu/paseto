"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

interface KPIItem {
  id: string; kpi_layer: string; kpi_name: string; target_value: number;
  actual_value: number | null; achievement_rate: number | null; mom_change: string | null;
}

const LAYER_ORDER = ["input", "process", "output", "outcome"];
const LAYER_LABELS: Record<string, string> = { input: "Input", process: "Process", output: "Output", outcome: "Outcome" };
const TEAM_LABELS: Record<string, string> = { sourcing: "Sourcing팀", review: "심사팀", incubation: "보육팀", oi: "OI팀", backoffice: "백오피스팀" };

function statusColor(rate: number | null): string {
  if (rate === null) return "bg-slate-200";
  if (rate >= 90) return "bg-emerald-500";
  if (rate >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function statusLabel(rate: number | null): string {
  if (rate === null) return "데이터없음";
  if (rate >= 90) return "양호";
  if (rate >= 70) return "보완필요";
  return "개선필요";
}

export default function TeamKPIPage() {
  const params = useParams();
  const team = params.team as string;
  const [items, setItems] = useState<KPIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: KPIItem[] }>(`/team-kpis/${team}/${period}`);
      setItems(res.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [team, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  const grouped = LAYER_ORDER.map((layer) => ({
    layer,
    label: LAYER_LABELS[layer],
    kpis: items.filter((k) => k.kpi_layer === layer),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">{TEAM_LABELS[team] ?? team} KPI</h2>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded-md text-sm" />
      </div>

      {grouped.map((group) => (
        <div key={group.layer} className="mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">{group.label}</h3>
          <div className="space-y-2">
            {group.kpis.map((k) => (
              <div key={k.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">{k.kpi_name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusColor(k.achievement_rate)}`}>
                      {statusLabel(k.achievement_rate)}
                    </span>
                    {k.mom_change && <span className="text-xs text-slate-500">{k.mom_change}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${statusColor(k.achievement_rate)}`}
                      style={{ width: `${Math.min(k.achievement_rate ?? 0, 150)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-20 text-right">
                    {k.actual_value ?? "-"} / {k.target_value}
                  </span>
                  <span className="text-xs text-slate-500 w-12 text-right">
                    {k.achievement_rate !== null ? `${k.achievement_rate}%` : "-"}
                  </span>
                </div>
              </div>
            ))}
            {group.kpis.length === 0 && <p className="text-sm text-slate-400 px-2">이 계층의 KPI가 없습니다.</p>}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          <p className="text-sm">해당 기간의 KPI 데이터가 없습니다. KPI 관리에서 시드 데이터를 생성하세요.</p>
        </div>
      )}
    </div>
  );
}

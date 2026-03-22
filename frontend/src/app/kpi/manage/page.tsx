"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface KPIItem {
  id: string; team: string; kpi_layer: string; kpi_name: string;
  target_value: number; actual_value: number | null; achievement_rate: number | null;
}

const TEAMS = ["sourcing", "review", "incubation", "oi", "backoffice"];
const TEAM_LABELS: Record<string, string> = { sourcing: "Sourcing", review: "심사팀", incubation: "보육팀", oi: "OI팀", backoffice: "백오피스" };

export default function KPIManagePage() {
  const [items, setItems] = useState<KPIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState("sourcing");
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: KPIItem[] }>(`/team-kpis/${selectedTeam}/${period}`);
      setItems(res.data.data);
      const vals: Record<string, string> = {};
      for (const k of res.data.data) {
        vals[k.id] = k.actual_value !== null ? String(k.actual_value) : "";
      }
      setEditValues(vals);
    } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, [selectedTeam, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = useCallback(async () => {
    setError(""); setSuccess("");
    try {
      const res = await api.post<{ seeded: number }>(`/team-kpis/seed?period=${period}`);
      setSuccess(`${res.data.seeded}개 KPI 시드 생성 완료`);
      await fetchData();
    } catch { setError("시드 생성에 실패했습니다."); }
  }, [period, fetchData]);

  const handleSave = useCallback(async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      for (const item of items) {
        const val = editValues[item.id];
        const numVal = val !== "" ? parseFloat(val) : null;
        if (numVal !== item.actual_value) {
          await api.patch(`/team-kpis/${item.id}`, { actual_value: numVal });
        }
      }
      setSuccess("저장 완료");
      await fetchData();
    } catch { setError("저장에 실패했습니다."); } finally { setSaving(false); }
  }, [items, editValues, fetchData]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">KPI 관리</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSeed}>시드 생성</Button>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded-md text-sm" />
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {TEAMS.map((t) => (
          <button key={t} className={`px-3 py-1 text-xs rounded-full border ${selectedTeam === t ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
            onClick={() => setSelectedTeam(t)}>{TEAM_LABELS[t]}</button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">로딩 중...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold">지표</th>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold w-20">계층</th>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold w-20">목표</th>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold w-28">실적</th>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold w-20">달성률</th>
              </tr>
            </thead>
            <tbody>
              {items.map((k) => (
                <tr key={k.id} className="border-t border-slate-100">
                  <td className="py-2 px-3 font-medium text-slate-800">{k.kpi_name}</td>
                  <td className="py-2 px-3 text-xs text-slate-500">{k.kpi_layer}</td>
                  <td className="py-2 px-3">{k.target_value}</td>
                  <td className="py-2 px-3">
                    <input type="number" step="0.1" value={editValues[k.id] ?? ""}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [k.id]: e.target.value }))}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="py-2 px-3 text-xs font-semibold">
                    {k.achievement_rate !== null ? `${k.achievement_rate}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">KPI 데이터가 없습니다. 시드 생성을 실행하세요.</div>}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mt-3">{success}</p>}

      {items.length > 0 && (
        <div className="mt-4">
          <Button onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "실적 저장"}</Button>
        </div>
      )}
    </div>
  );
}

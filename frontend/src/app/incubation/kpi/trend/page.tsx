"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface StartupOption {
  id: string;
  company_name: string;
}

interface KpiRecord {
  id: string;
  startup_id: string;
  metric_name: string;
  value: number | string | null;
  period: string;
}

interface GroupedMetric {
  metric: string;
  periods: Record<string, string>;
}

export default function KpiTrendPage() {
  const [startups, setStartups] = useState<StartupOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const fetchStartups = useCallback(async () => {
    try {
      const res = await api.get<{ data: StartupOption[] }>(
        "/startups/?is_portfolio=true&page_size=200"
      );
      setStartups(res.data.data ?? []);
    } catch {
      setStartups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStartups();
  }, [fetchStartups]);

  const fetchRecords = useCallback(async (startupId: string) => {
    if (!startupId) {
      setRecords([]);
      return;
    }
    setLoadingRecords(true);
    try {
      const res = await api.get<{ data: KpiRecord[] }>(
        `/kpi-records/?startup_id=${startupId}&page_size=500`
      );
      setRecords(res.data.data ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchRecords(selectedId);
    } else {
      setRecords([]);
    }
  }, [selectedId, fetchRecords]);

  const allPeriods = [...new Set(records.map((r) => r.period))].sort();

  const grouped: GroupedMetric[] = [];
  const metricMap = new Map<string, Record<string, string>>();
  for (const r of records) {
    if (!metricMap.has(r.metric_name)) {
      metricMap.set(r.metric_name, {});
    }
    const periods = metricMap.get(r.metric_name)!;
    periods[r.period] = r.value != null ? String(r.value) : "-";
  }
  for (const [metric, periods] of metricMap) {
    grouped.push({ metric, periods });
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">KPI 추이</h2>

      <div className="mb-5">
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          스타트업 선택
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          <option value="">-- 선택 --</option>
          {startups.map((s) => (
            <option key={s.id} value={s.id}>
              {s.company_name}
            </option>
          ))}
        </select>
      </div>

      {loadingRecords && (
        <div className="p-8 text-center text-slate-400">로딩 중...</div>
      )}

      {!loadingRecords && selectedId && grouped.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-2.5 px-3 text-slate-600 font-semibold sticky left-0 bg-slate-50">
                  지표
                </th>
                {allPeriods.map((p) => (
                  <th key={p} className="text-center py-2.5 px-3 text-slate-600 font-semibold">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={g.metric} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800 sticky left-0 bg-white">
                    {g.metric}
                  </td>
                  {allPeriods.map((p) => (
                    <td key={p} className="py-2.5 px-3 text-center text-slate-600">
                      {g.periods[p] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingRecords && selectedId && grouped.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">
          KPI 데이터가 없습니다.
        </div>
      )}

      {!selectedId && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">
          스타트업을 선택하세요.
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface StartupOption {
  id: string;
  name: string;
}

interface KPIRecord {
  id: string;
  metric_name: string;
  value: number | string;
  target?: number | string;
  period?: string;
  recorded_at?: string;
  created_at?: string;
}

export default function StartupKPIPage() {
  const [startups, setStartups] = useState<StartupOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [records, setRecords] = useState<KPIRecord[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(true);
  const [loadingKPI, setLoadingKPI] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const res = await api.get("/startups/", { params: { is_portfolio: true } });
        const body = res.data;
        let list: StartupOption[] = [];
        if (Array.isArray(body)) {
          list = body.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
        } else if (body.data && Array.isArray(body.data)) {
          list = body.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
        }
        setStartups(list);
      } catch {
        setError("포트폴리오 기업 목록을 불러오는 데 실패했습니다.");
      } finally {
        setLoadingStartups(false);
      }
    };
    fetchStartups();
  }, []);

  const fetchKPI = useCallback(async (startupId: string) => {
    if (!startupId) {
      setRecords([]);
      return;
    }
    setLoadingKPI(true);
    setError("");
    try {
      const res = await api.get("/kpi-records/", { params: { startup_id: startupId } });
      const body = res.data;
      if (Array.isArray(body)) {
        setRecords(body);
      } else if (body.data && Array.isArray(body.data)) {
        setRecords(body.data);
      } else {
        setRecords([]);
      }
    } catch {
      setError("KPI 데이터를 불러오는 데 실패했습니다.");
      setRecords([]);
    } finally {
      setLoadingKPI(false);
    }
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    fetchKPI(id);
  };

  // KPI 레코드를 metric_name으로 그룹핑
  const grouped: Record<string, KPIRecord[]> = {};
  for (const rec of records) {
    const key = rec.metric_name || "기타";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(rec);
  }
  const metricNames = Object.keys(grouped).sort();

  if (loadingStartups) {
    return <div className="p-8 text-center text-slate-400">불러오는 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">기업별 KPI 추이</h2>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {/* 기업 선택 드롭다운 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-slate-600 mb-1">포트폴리오 기업 선택</label>
        <select
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
        >
          <option value="">-- 기업을 선택하세요 --</option>
          {startups.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {startups.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">포트폴리오 기업이 없습니다.</p>
        )}
      </div>

      {/* KPI 테이블 */}
      {loadingKPI ? (
        <div className="p-8 text-center text-slate-400">불러오는 중...</div>
      ) : selectedId && records.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">데이터가 없습니다</div>
      ) : selectedId && metricNames.length > 0 ? (
        <div className="space-y-6">
          {metricNames.map((metric) => (
            <div key={metric}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{metric}</h3>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">기간</th>
                      <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">실적</th>
                      <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">목표</th>
                      <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">기록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[metric].map((rec) => (
                      <tr key={rec.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-600">{rec.period || "-"}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{rec.value ?? "-"}</td>
                        <td className="py-2.5 px-3 text-slate-500">{rec.target ?? "-"}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {fmtDate(rec.recorded_at ?? rec.created_at ?? "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface KpiRecord {
  id: string;
  startup_id: string;
  metric_name: string;
  value: number | string | null;
  period: string;
  created_at: string;
}

export default function KpiRecordPage() {
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      let url = "/kpi-records/?page_size=200";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get<{ data: KpiRecord[] }>(url);
      setRecords(res.data.data ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">KPI 입력</h2>

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="스타트업 검색..."
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">스타트업 ID</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">지표명</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">값</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">기간</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">등록일</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-xs text-slate-800">
                  {r.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{r.metric_name || "-"}</td>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  {r.value != null ? String(r.value) : "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{r.period || "-"}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleDateString("ko-KR")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            KPI 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

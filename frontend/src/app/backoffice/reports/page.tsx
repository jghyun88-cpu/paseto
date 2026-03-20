"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface ReportItem {
  id: string;
  title: string;
  report_type: string;
  period: string | null;
  status: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  monthly_ops: "월간운영",
  quarterly_lp: "분기LP",
  annual: "연간",
  ad_hoc: "수시",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  submitted: "제출됨",
  approved: "승인됨",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10).replace(/-/g, ".");
}

export default function ReportsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/reports/?page_size=100";
      if (filterType) url += `&report_type=${filterType}`;
      const res = await api.get<{ data: ReportItem[] }>(url);
      setItems(res.data.data);
    } catch {
      /* 조회 실패 무시 */
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">보고서 관리</h2>
        <Button size="sm" onClick={() => router.push("/backoffice/reports/new")}>
          <Plus size={16} className="mr-1" /> 보고서 작성
        </Button>
      </div>

      {/* 유형 필터 */}
      <div className="flex gap-1 mb-4">
        <button
          className={`px-3 py-1 text-xs rounded-full border ${!filterType ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
          onClick={() => setFilterType(null)}
        >
          전체
        </button>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <button
            key={k}
            className={`px-3 py-1 text-xs rounded-full border ${filterType === k ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
            onClick={() => setFilterType(k === filterType ? null : k)}
          >
            {v}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">제목</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">유형</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">기간</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">작성일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((report) => (
              <tr key={report.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">{report.title}</td>
                <td className="py-2 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {TYPE_LABELS[report.report_type] ?? report.report_type}
                  </span>
                </td>
                <td className="py-2 px-3">{report.period ?? "-"}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[report.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[report.status] ?? report.status}
                  </span>
                </td>
                <td className="py-2 px-3">{formatDate(report.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">보고서가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

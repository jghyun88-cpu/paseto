"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface LPReport {
  id: string;
  fund_name: string;
  report_period: string;
  report_type: string;
  created_at: string;
  status?: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  quarterly: "분기보고",
  annual: "연간보고",
  ad_hoc: "수시보고",
  distribution: "배분보고",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10).replace(/-/g, ".");
}

export default function LPReportPage() {
  const [items, setItems] = useState<LPReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: LPReport[] }>("/reports/?page_size=100&report_type=quarterly_lp");
      setItems(res.data.data);
    } catch {
      /* 조회 실패 무시 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setMessage("");
    try {
      await api.post("/reports/generate", { report_type: "quarterly_lp" });
      setMessage("LP 보고서 생성이 요청되었습니다.");
      await fetchData();
    } catch {
      setMessage("보고서 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">LP 보고서</h2>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          <Plus size={16} className="mr-1" />
          {generating ? "생성 중..." : "보고서 생성"}
        </Button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("실패") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message}
        </div>
      )}

      {/* 카드 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-blue-600" />
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">{report.fund_name}</h3>
            <p className="text-xs text-slate-500 mb-2">기간: {report.report_period}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{formatDate(report.created_at)}</span>
              {report.status && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {report.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">
          LP 보고서가 없습니다.
        </div>
      )}
    </div>
  );
}

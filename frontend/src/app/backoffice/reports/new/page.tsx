"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const TYPE_OPTIONS = [
  { value: "monthly_ops", label: "월간운영 보고서" },
  { value: "quarterly_lp", label: "분기 LP 보고서" },
  { value: "annual", label: "연간 보고서" },
  { value: "ad_hoc", label: "수시 보고서" },
];

export default function NewReportPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState("monthly_ops");
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        setError("제목은 필수입니다.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const period = periodStart && periodEnd ? `${periodStart} ~ ${periodEnd}` : null;
        await api.post("/reports/", {
          title,
          report_type: reportType,
          period,
          content,
          status: "draft",
        });
        router.push("/backoffice/reports");
      } catch {
        setError("보고서 생성에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [title, reportType, periodStart, periodEnd, content, router],
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">보고서 작성</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        {/* 보고서 유형 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">보고서 유형 *</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="보고서 제목을 입력하세요"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 기간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">시작일</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">종료일</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="보고서 내용을 작성하세요..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "생성 중..." : "보고서 생성"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

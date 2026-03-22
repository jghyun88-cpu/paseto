"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";
import { fmtDate, fmtAmount } from "@/lib/formatters";

interface ExecutionItem {
  id: string;
  startup_id: string;
  startup_name?: string;
  investment_amount: number | null;
  amount: number | null;
  status: string;
  scheduled_date: string | null;
  actual_date: string | null;
  disbursement_status?: string;
  created_at: string;
}

const DISBURSEMENT_LABELS: Record<string, string> = {
  pending: "대기",
  scheduled: "예정",
  in_progress: "진행중",
  completed: "완료",
  delayed: "지연",
};

const DISBURSEMENT_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  delayed: "bg-red-100 text-red-700",
};

export default function ExecutionPage() {
  const [items, setItems] = useState<ExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: ExecutionItem[] }>("/contracts/?page_size=100&status=disbursement");
      setItems(res.data.data);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = {
    total: items.length,
    completed: items.filter((i) => (i.disbursement_status ?? i.status) === "completed").length,
    inProgress: items.filter((i) => ["in_progress", "scheduled", "disbursement"].includes(i.disbursement_status ?? i.status)).length,
    delayed: items.filter((i) => (i.disbursement_status ?? i.status) === "delayed").length,
  };

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">투자 집행관리</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">전체 건수</div>
          <div className="text-2xl font-bold text-slate-800">{summary.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">집행 완료</div>
          <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">진행중</div>
          <div className="text-2xl font-bold text-blue-600">{summary.inProgress}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">지연</div>
          <div className="text-2xl font-bold text-red-600">{summary.delayed}</div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">투자금액</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">집행상태</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">예정일</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">실행일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const disbStatus = item.disbursement_status ?? item.status;
              return (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-800">
                    {item.startup_name ?? item.startup_id?.slice(0, 8) ?? "-"}
                  </td>
                  <td className="py-2 px-3">{fmtAmount(item.investment_amount ?? item.amount)}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DISBURSEMENT_COLORS[disbStatus] ?? "bg-slate-100 text-slate-600"}`}>
                      {DISBURSEMENT_LABELS[disbStatus] ?? disbStatus}
                    </span>
                  </td>
                  <td className="py-2 px-3">{fmtDate(item.scheduled_date)}</td>
                  <td className="py-2 px-3">{fmtDate(item.actual_date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">집행 대상 계약이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

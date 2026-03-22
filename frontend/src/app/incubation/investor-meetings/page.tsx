"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface InvestorMeeting {
  id: string;
  startup_id: string;
  investor_name: string | null;
  meeting_date: string;
  purpose: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  cancelled: "취소",
};

export default function InvestorMeetingsPage() {
  const [meetings, setMeetings] = useState<InvestorMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: InvestorMeeting[] }>(
        "/investor-meetings/?page_size=200"
      );
      setMeetings(res.data.data ?? []);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">투자자 미팅</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">스타트업 ID</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">투자자</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">미팅일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">목적</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">등록일</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-xs text-slate-800">
                  {m.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {m.investor_name ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {m.meeting_date
                    ? new Date(m.meeting_date).toLocaleDateString("ko-KR")
                    : "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{m.purpose ?? "-"}</td>
                <td className="py-2.5 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {m.created_at
                    ? new Date(m.created_at).toLocaleDateString("ko-KR")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meetings.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            투자자 미팅 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

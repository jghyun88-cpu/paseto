"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface MentoringSession {
  id: string;
  startup_id: string;
  mentor_name: string | null;
  mentor_id: string | null;
  session_date: string;
  topic: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  cancelled: "취소",
};

export default function MentoringListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: MentoringSession[] }>(
        "/mentoring-sessions/?page_size=200"
      );
      const data = res.data.data ?? [];
      const sorted = [...data].sort(
        (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );
      setSessions(sorted);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
      setSessions([]);
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">멘토링 세션</h2>
        <Button size="sm" onClick={() => router.push("/incubation/mentoring/new")}>
          <Plus size={16} className="mr-1" /> 세션 등록
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">스타트업 ID</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">멘토</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">일시</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">주제</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-xs text-slate-800">
                  {s.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {s.mentor_name ?? s.mentor_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {s.session_date
                    ? new Date(s.session_date).toLocaleDateString("ko-KR")
                    : "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{s.topic || "-"}</td>
                <td className="py-2.5 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            멘토링 세션이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

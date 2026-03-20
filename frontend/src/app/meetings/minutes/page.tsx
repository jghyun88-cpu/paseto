"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface MeetingItem {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string;
  location?: string;
  has_minutes?: boolean;
  minutes?: string | null;
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  weekly_deal: "주간 딜 회의",
  weekly_portfolio: "포트폴리오 회의",
  monthly_ops: "월간 운영",
  ic: "투자위원회",
  mentoring: "멘토링",
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MeetingMinutesPage() {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/meetings/");
        const body = res.data;
        if (Array.isArray(body)) {
          setItems(body);
        } else if (body.data && Array.isArray(body.data)) {
          setItems(body.data);
        } else {
          setItems([]);
        }
      } catch {
        setError("회의록을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">불러오는 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">회의록</h2>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">제목</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">회의 유형</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">일시</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">장소</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">회의록</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const hasMinutes = item.has_minutes ?? (item.minutes != null && item.minutes !== "");
              return (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{item.title}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {MEETING_TYPE_LABELS[item.meeting_type] ?? item.meeting_type}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {formatDateTime(item.scheduled_at)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{item.location || "-"}</td>
                  <td className="py-2.5 px-3">
                    {hasMinutes ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        작성됨
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        미작성
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && !error && (
          <div className="p-8 text-center text-slate-400 text-sm">데이터가 없습니다</div>
        )}
      </div>
    </div>
  );
}

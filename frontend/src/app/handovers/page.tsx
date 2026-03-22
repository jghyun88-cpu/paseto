"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface HandoverItem {
  id: string;
  startup_name?: string;
  startup_id?: string;
  status: string;
  summary: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  confirmed: "확인",
  rejected: "반려",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function HandoversPage() {
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/handovers/");
        const body = res.data;
        if (Array.isArray(body)) {
          setItems(body);
        } else if (body.data && Array.isArray(body.data)) {
          setItems(body.data);
        } else {
          setItems([]);
        }
      } catch {
        setError("인계 현황을 불러오는 데 실패했습니다.");
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
      <h2 className="text-lg font-bold text-slate-800 mb-5">인계 현황</h2>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">요약</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">생성일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  {item.startup_name ?? item.startup_id ?? "-"}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                  {item.summary || "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !error && (
          <div className="p-8 text-center text-slate-400 text-sm">데이터가 없습니다</div>
        )}
      </div>
    </div>
  );
}

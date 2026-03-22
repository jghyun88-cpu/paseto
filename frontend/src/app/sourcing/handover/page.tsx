"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface HandoverItem {
  id: string;
  startup_id: string;
  from_team: string;
  to_team: string;
  content: {
    screening_results?: { grade: string; overall_score: number };
    company_overview?: { name: string };
  };
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated: boolean;
}

export default function HandoverPage() {
  const router = useRouter();
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<HandoverItem[]>("/handovers/?from_team=sourcing")
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">인계 관리</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">기업명</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">인계일</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">등급</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">점수</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">인수팀</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">인계 이력이 없습니다.</td></tr>
            ) : (
              items.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-blue-50/50">
                  <td
                    className="px-4 py-2.5 font-medium text-blue-700 cursor-pointer"
                    onClick={() => router.push(`/startup/${h.startup_id}`)}
                  >
                    {h.content.company_overview?.name ?? h.startup_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{fmtDate(h.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                      {h.content.screening_results?.grade ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-bold">{h.content.screening_results?.overall_score ?? "-"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{h.to_team}</td>
                  <td className="px-4 py-2.5">
                    {h.acknowledged_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 size={13} /> 확인됨
                      </span>
                    ) : h.escalated ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle size={13} /> 에스컬레이션
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <Clock size={13} /> 대기중
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

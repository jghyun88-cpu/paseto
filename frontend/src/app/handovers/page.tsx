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
  handover_type: string;
  content: {
    company_overview?: { name: string };
    screening_results?: { grade: string; overall_score: number };
  };
  created_at: string;
  acknowledged_at: string | null;
  escalated: boolean;
}

const TEAM_LABEL: Record<string, string> = {
  sourcing: "소싱팀",
  review: "심사팀",
  incubation: "보육팀",
  oi: "OI팀",
  backoffice: "백오피스",
};

export default function HandoversPage() {
  const router = useRouter();
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: HandoverItem[] }>("/handovers/?page_size=100")
      .then((res) => setItems(res.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">불러오는 중...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">인계 현황</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-4 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2.5 px-4 text-slate-600 font-semibold">경로</th>
              <th className="text-left py-2.5 px-4 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2.5 px-4 text-slate-600 font-semibold">인계일</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">인계 이력이 없습니다.</td></tr>
            ) : items.map((h) => (
              <tr key={h.id} className="border-t border-slate-100 hover:bg-blue-50/50">
                <td
                  className="py-2.5 px-4 font-medium text-blue-700 cursor-pointer"
                  onClick={() => router.push(`/handovers/${h.id}`)}
                >
                  {h.content.company_overview?.name ?? "-"}
                </td>
                <td className="py-2.5 px-4 text-slate-500">
                  {TEAM_LABEL[h.from_team] ?? h.from_team} → {TEAM_LABEL[h.to_team] ?? h.to_team}
                </td>
                <td className="py-2.5 px-4">
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
                <td className="py-2.5 px-4 text-slate-500">{fmtDate(h.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

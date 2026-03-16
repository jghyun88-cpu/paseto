"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ICDecisionModal from "@/components/forms/ICDecisionModal";
import api from "@/lib/api";
import type { ICDecisionItem } from "@/lib/types";

interface StartupOption {
  id: string;
  company_name: string;
}

const DECISION_BADGE: Record<string, { label: string; cls: string }> = {
  approved: { label: "승인", cls: "bg-green-100 text-green-700" },
  conditional: { label: "조건부", cls: "bg-blue-100 text-blue-700" },
  on_hold: { label: "보류", cls: "bg-amber-100 text-amber-700" },
  incubation_first: { label: "보육우선", cls: "bg-purple-100 text-purple-700" },
  rejected: { label: "거절", cls: "bg-red-100 text-red-700" },
};

export default function ICDecisionsPage() {
  const [decisions, setDecisions] = useState<ICDecisionItem[]>([]);
  const [startups, setStartups] = useState<StartupOption[]>([]);
  const [startupMap, setStartupMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [decRes, startupRes] = await Promise.all([
        api.get<ICDecisionItem[]>("/ic-decisions/?startup_id="),
        api.get<{ data: StartupOption[] }>("/startups/?page_size=200"),
      ]);

      // ic-decisions API는 startup_id 필수 → 전체를 가져오려면 우회
      // 대안: 모든 스타트업별로 가져오거나, 빈 값 전달
      const allStartups = startupRes.data.data;
      const sMap: Record<string, string> = {};
      for (const s of allStartups) sMap[s.id] = s.company_name;
      setStartupMap(sMap);
      setStartups(allStartups);

      // 각 스타트업별 IC 결정 수집 (최적화: 백엔드에서 전체 목록 API 추가 필요)
      const allDecisions: ICDecisionItem[] = [];
      for (const s of allStartups.slice(0, 50)) {
        try {
          const res = await api.get<ICDecisionItem[]>(`/ic-decisions/?startup_id=${s.id}`);
          allDecisions.push(...res.data);
        } catch {
          /* 결정 없는 스타트업은 무시 */
        }
      }
      allDecisions.sort((a, b) => b.decided_at.localeCompare(a.decided_at));
      setDecisions(allDecisions);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">IC 안건 관리</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" /> 새 결정
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">기업명</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">결정</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">조건</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">참석자</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">날짜</th>
            </tr>
          </thead>
          <tbody>
            {decisions.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">IC 결정 이력이 없습니다</td>
              </tr>
            )}
            {decisions.map((d) => {
              const badge = DECISION_BADGE[d.decision] ?? { label: d.decision, cls: "bg-slate-100 text-slate-600" };
              return (
                <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {startupMap[d.startup_id] ?? d.startup_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                    {d.conditions ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {d.attendees.length > 0 ? d.attendees.join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(d.decided_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ICDecisionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitted={fetchData}
        startups={startups}
      />
    </div>
  );
}

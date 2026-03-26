"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { TEAM_LABEL, HANDOVER_TYPE_LABEL } from "@/lib/handover-constants";
import HandoverStatusBadge from "./HandoverStatusBadge";

interface HandoverItem {
  id: string;
  startup_id: string;
  from_team: string;
  to_team: string;
  handover_type: string;
  content: {
    screening_results?: { grade: string; overall_score: number };
    company_overview?: { name: string };
    ic_decision?: string;
    contract_status?: string;
  };
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated: boolean;
}

type TabKey = "pending" | "acknowledged" | "escalated";

interface Props {
  /** 수신팀 필터 (to_team 파라미터) */
  toTeam: string;
  /** 페이지 제목 */
  title: string;
}

export default function HandoverInbox({ toTeam, title }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabKey>("pending");

  useEffect(() => {
    setError(false);
    api
      .get<{ data: HandoverItem[] }>(`/handovers/?to_team=${toTeam}&page_size=100`)
      .then((res) => setItems(res.data.data))
      .catch(() => {
        setItems([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [toTeam]);

  const filtered = items.filter((h) => {
    if (tab === "acknowledged") return h.acknowledged_at !== null;
    if (tab === "escalated") return h.escalated && !h.acknowledged_at;
    return !h.acknowledged_at && !h.escalated;
  });

  const counts = {
    pending: items.filter((h) => !h.acknowledged_at && !h.escalated).length,
    acknowledged: items.filter((h) => h.acknowledged_at !== null).length,
    escalated: items.filter((h) => h.escalated && !h.acknowledged_at).length,
  };

  const handleAcknowledge = useCallback(
    async (id: string) => {
      try {
        await api.post(`/handovers/${id}/acknowledge`);
        setItems((prev) =>
          prev.map((h) =>
            h.id === id
              ? { ...h, acknowledged_at: new Date().toISOString(), acknowledged_by: "self" }
              : h,
          ),
        );
      } catch {
        alert("수신 확인에 실패했습니다.");
      }
    },
    [],
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: `미확인 (${counts.pending})` },
    { key: "acknowledged", label: `확인됨 (${counts.acknowledged})` },
    { key: "escalated", label: `에스컬레이션 (${counts.escalated})` },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Inbox size={20} /> {title}
      </h2>

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {loading ? (
          <p className="px-4 py-8 text-center text-slate-400">로딩 중...</p>
        ) : error ? (
          <p className="px-4 py-8 text-center text-red-500">인계 목록을 불러올 수 없습니다. 새로고침해 주세요.</p>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="text-4xl mb-3">📨</div>
            <p className="text-lg font-semibold text-gray-900 mb-1">인계 항목이 없습니다</p>
            <p className="text-sm text-gray-500">새로운 인계가 도착하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <HandoverStatusBadge
                      acknowledgedAt={h.acknowledged_at}
                      escalated={h.escalated}
                    />
                    <span className="text-xs text-slate-400">
                      {HANDOVER_TYPE_LABEL[h.handover_type] ?? h.handover_type}
                    </span>
                  </div>
                  <p
                    className="font-medium text-blue-700 cursor-pointer hover:underline truncate"
                    onClick={() => router.push(`/handovers/${h.id}`)}
                  >
                    {h.content.company_overview?.name ?? "기업명 없음"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {TEAM_LABEL[h.from_team] ?? h.from_team} → {TEAM_LABEL[h.to_team] ?? h.to_team}
                    {" · "}
                    {fmtDate(h.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => router.push(`/handovers/${h.id}`)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50"
                  >
                    상세
                  </button>
                  {!h.acknowledged_at && (
                    <button
                      onClick={() => handleAcknowledge(h.id)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      수신 확인
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

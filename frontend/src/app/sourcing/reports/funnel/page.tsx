"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

// 파이프라인 순서 (이전 단계를 통과해야 다음 단계로 이동)
const STAGE_ORDER = [
  "inbound", "first_screening", "deep_review", "interview",
  "due_diligence", "ic_pending", "ic_review", "approved",
  "conditional", "contract", "closed", "portfolio",
];

const FUNNEL_STAGES = [
  { key: "inbound", label: "유입", color: "bg-gray-400" },
  { key: "first_screening", label: "1차 스크리닝", color: "bg-blue-400" },
  { key: "deep_review", label: "심층검토", color: "bg-indigo-400" },
  { key: "interview", label: "인터뷰", color: "bg-purple-400" },
  { key: "due_diligence", label: "기초실사", color: "bg-yellow-500" },
  { key: "ic_pending", label: "IC 대기", color: "bg-orange-400" },
  { key: "approved", label: "승인", color: "bg-green-500" },
  { key: "portfolio", label: "포트폴리오", color: "bg-emerald-500" },
];

export default function FunnelAnalysisPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: Array<{ current_deal_stage: string }> }>("/startups/?page_size=500");
        // 누적 카운트: 각 단계를 통과한 딜 수 (현재 단계 이상이면 이전 단계 모두 통과)
        const cumulative: Record<string, number> = {};
        for (const s of res.data.data) {
          const st = (s.current_deal_stage || "INBOUND").toLowerCase();
          const stageIdx = STAGE_ORDER.indexOf(st);
          for (const funnelStage of FUNNEL_STAGES) {
            const funnelIdx = STAGE_ORDER.indexOf(funnelStage.key);
            if (funnelIdx >= 0 && stageIdx >= funnelIdx) {
              cumulative[funnelStage.key] = (cumulative[funnelStage.key] || 0) + 1;
            }
          }
        }
        setCounts(cumulative);
      } catch {
        showError("데이터를 불러오는 데 실패했습니다.");
        setCounts({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxCount = Math.max(...FUNNEL_STAGES.map((s) => counts[s.key] || 0), 1);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">전환율 분석</h1>
      <p className="text-sm text-gray-500">소싱 파이프라인 단계별 전환율을 분석합니다.</p>

      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : (
        <div className="space-y-2">
          {FUNNEL_STAGES.map((stage, idx) => {
            const count = counts[stage.key] || 0;
            const prev = idx > 0 ? counts[FUNNEL_STAGES[idx - 1].key] || 0 : 0;
            const convRate = idx > 0 && prev > 0 ? ((count / prev) * 100).toFixed(0) : "-";
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="w-24 text-sm text-gray-700 shrink-0">{stage.label}</span>
                <div className="flex-1 flex items-center">
                  <div
                    className={`${stage.color} h-8 rounded flex items-center justify-center`}
                    style={{ width: `${Math.max(barWidth, 3)}%` }}
                  >
                    <span className="text-xs text-white font-bold">{count}</span>
                  </div>
                </div>
                <span className="w-16 text-right text-sm text-gray-500">
                  {idx > 0 ? `${convRate}%` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PipelineCard from "@/components/review/PipelineCard";
import api from "@/lib/api";

interface StartupItem {
  id: string;
  company_name: string;
  ceo_name: string;
  industry: string;
  stage: string;
  current_deal_stage: string;
}

const COLUMNS = [
  { id: "deep_review", title: "심층검토", stageKey: "deep_review" },
  { id: "interview", title: "인터뷰", stageKey: "interview" },
  { id: "due_diligence", title: "DD", stageKey: "due_diligence" },
  { id: "ic_pending", title: "IC 대기", stageKey: "ic_pending" },
  { id: "ic_review", title: "IC 심의", stageKey: "ic_review" },
] as const;

export default function ReviewPipelinePage() {
  const router = useRouter();
  const [grouped, setGrouped] = useState<Record<string, StartupItem[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: StartupItem[] }>("/startups/?page_size=200");
      const groups: Record<string, StartupItem[]> = {};
      for (const col of COLUMNS) {
        groups[col.id] = [];
      }
      for (const s of res.data.data) {
        const col = COLUMNS.find((c) => c.stageKey === s.current_deal_stage);
        if (col) {
          groups[col.id].push(s);
        }
      }
      setGrouped(groups);
    } catch {
      /* ignore */
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
      <h2 className="text-lg font-bold text-slate-800 mb-4">심사 파이프라인</h2>

      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const items = grouped[col.id] ?? [];
          return (
            <div key={col.id} className="bg-slate-50 rounded-lg p-3 min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700">{col.title}</h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((s) => (
                  <PipelineCard
                    key={s.id}
                    companyName={s.company_name}
                    ceoName={s.ceo_name}
                    industry={s.industry}
                    stage={s.stage}
                    onClick={() => router.push(`/startup/${s.id}`)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">없음</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

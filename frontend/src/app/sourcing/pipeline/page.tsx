"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import KanbanBoard, { type ColumnDef } from "@/components/kanban/KanbanBoard";
import type { KanbanCardData } from "@/components/kanban/KanbanCard";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

const COLUMNS: ColumnDef[] = [
  { id: "inbound", title: "Inbound", stageKey: "inbound" },
  { id: "first_screening", title: "1차 스크리닝", stageKey: "first_screening" },
  { id: "deep_review", title: "심층검토 대기", stageKey: "deep_review" },
  { id: "interview", title: "심사팀 인계 완료", stageKey: "interview" },
];

interface StartupItem {
  id: string;
  company_name: string;
  ceo_name: string;
  industry: string;
  stage: string;
  current_deal_stage: string;
  created_at: string;
  screening_score?: number;
  assigned_manager_name?: string;
}

export default function SourcingPipelinePage() {
  const router = useRouter();
  const [cards, setCards] = useState<Record<string, KanbanCardData[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: StartupItem[] }>("/startups/?page_size=200");
      const grouped: Record<string, KanbanCardData[]> = {};
      for (const col of COLUMNS) {
        grouped[col.id] = [];
      }
      for (const s of res.data.data) {
        const colId = COLUMNS.find((c) => c.stageKey === s.current_deal_stage)?.id;
        const target = colId ?? "inbound";
        if (!grouped[target]) grouped[target] = [];
        grouped[target].push({
          id: s.id,
          company_name: s.company_name,
          ceo_name: s.ceo_name,
          industry: s.industry,
          stage: s.stage,
          created_at: s.created_at,
          screening_score: s.screening_score,
          assigned_manager_name: s.assigned_manager_name,
        });
      }
      setCards(grouped);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMove = useCallback(
    async (cardId: string, _from: string, to: string) => {
      const toStage = COLUMNS.find((c) => c.id === to)?.stageKey;
      if (!toStage) return;

      // 낙관적 업데이트
      setCards((prev) => {
        const updated = { ...prev };
        for (const col of COLUMNS) {
          updated[col.id] = (updated[col.id] ?? []).filter((c) => c.id !== cardId);
        }
        const moved = Object.values(prev).flat().find((c) => c.id === cardId);
        if (moved) {
          updated[to] = [...(updated[to] ?? []), moved];
        }
        return updated;
      });

      try {
        await api.post("/deal-flows/move", {
          startup_id: cardId,
          to_stage: toStage,
        });
      } catch {
        fetchData();
      }
    },
    [fetchData],
  );

  const handleCardClick = useCallback(
    (id: string) => {
      router.push(`/startup/${id}`);
    },
    [router],
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-3">딜플로우 칸반보드</h2>
      <KanbanBoard
        columns={COLUMNS}
        cards={cards}
        onMove={handleMove}
        onCardClick={handleCardClick}
      />
    </div>
  );
}

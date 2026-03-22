"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface PoCItem {
  id: string;
  project_name: string;
  startup_id: string;
  status: string;
  duration_weeks: number;
  conversion_likelihood: string | null;
  kickoff_date: string | null;
  completion_date: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  demand_identified: "수요발굴", matching: "매칭", planning: "설계",
  kickoff: "킥오프", in_progress: "진행중", mid_review: "중간점검",
  completed: "완료", commercial_contract: "상용계약", joint_development: "공동개발",
  strategic_investment: "전략투자", retry: "재실증", terminated: "종료",
};

const LIKELIHOOD_COLORS: Record<string, string> = {
  "높음": "bg-red-100 text-red-700", "중간": "bg-amber-100 text-amber-700", "낮음": "bg-slate-100 text-slate-600",
};

export default function PoCListPage() {
  const router = useRouter();
  const [items, setItems] = useState<PoCItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/poc-projects/?page_size=100";
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await api.get<{ data: PoCItem[] }>(url);
      setItems(res.data.data);
    } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">PoC 프로젝트</h2>
        <Button size="sm" onClick={() => router.push("/oi/poc/new")}><Plus size={16} className="mr-1" /> PoC 생성</Button>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`px-3 py-1 text-xs rounded-full border ${!filterStatus ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterStatus(null)}>전체</button>
        {["demand_identified", "matching", "in_progress", "completed", "commercial_contract"].map((s) => (
          <button key={s} className={`px-3 py-1 text-xs rounded-full border ${filterStatus === s ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterStatus(s === filterStatus ? null : s)}>{STATUS_LABELS[s]}</button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/oi/poc/${p.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">{p.project_name}</h3>
              <div className="flex items-center gap-2">
                {p.conversion_likelihood && <span className={`text-xs px-2 py-0.5 rounded-full ${LIKELIHOOD_COLORS[p.conversion_likelihood] ?? "bg-slate-100 text-slate-600"}`}>전환: {p.conversion_likelihood}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{STATUS_LABELS[p.status] ?? p.status}</span>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>기간: {p.duration_weeks}주</span>
              {p.kickoff_date && <span>시작: {p.kickoff_date}</span>}
              {p.completion_date && <span>종료: {p.completion_date}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">PoC 프로젝트가 없습니다.</div>}
      </div>
    </div>
  );
}

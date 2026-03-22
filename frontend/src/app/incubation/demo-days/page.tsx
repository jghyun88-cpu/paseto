"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface DemoDayItem {
  id: string;
  title: string;
  event_date: string;
  status: string;
  follow_up_deadline: string | null;
  invited_investors: { name: string; company: string; priority: string }[] | null;
  startup_readiness: Record<string, { ir_ready: boolean; rehearsal_done: boolean }> | null;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "기획", rehearsal: "리허설", completed: "완료", follow_up: "후속추적",
};

export default function DemoDaysPage() {
  const router = useRouter();
  const [items, setItems] = useState<DemoDayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: DemoDayItem[] }>("/demo-days/?page_size=50");
      setItems(res.data.data);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!title || !eventDate) { setError("제목과 일정은 필수입니다."); return; }
    setError("");
    setSaving(true);
    try {
      await api.post("/demo-days/", { title, event_date: eventDate });
      setShowForm(false);
      setTitle("");
      setEventDate("");
      await fetchData();
    } catch {
      setError("생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [title, eventDate, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">Demo Day 관리</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> 생성
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">제목 *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="2026-H1 Demo Day"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">일정 *</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "생성 중..." : "생성"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((d) => (
          <div key={d.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">{d.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {STATUS_LABELS[d.status] ?? d.status}
                </span>
              </div>
              <span className="text-sm text-slate-500">{d.event_date}</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>투자자: {d.invited_investors?.length ?? 0}명 초청</span>
              {d.follow_up_deadline && <span>후속추적 마감: {d.follow_up_deadline}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            <p className="text-sm">데모데이가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

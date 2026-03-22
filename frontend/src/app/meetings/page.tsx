"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface MeetingItem {
  id: string; meeting_type: string; title: string; scheduled_at: string;
  duration_minutes: number | null; attendees: { team: string }[];
  agenda_items: { item: string }[]; minutes: string | null; action_items: { status: string }[] | null;
}

const TYPE_LABELS: Record<string, string> = {
  weekly_deal: "주간 딜", ic: "투자위원회", weekly_portfolio: "포트폴리오",
  partner_review: "파트너십", program_ops: "프로그램 운영", risk_review: "리스크",
  monthly_ops: "월간 운영", mentoring: "멘토링",
};

const TYPE_COLORS: Record<string, string> = {
  weekly_deal: "bg-blue-500", ic: "bg-red-500", weekly_portfolio: "bg-green-500",
  partner_review: "bg-purple-500", program_ops: "bg-amber-500", risk_review: "bg-slate-500",
  monthly_ops: "bg-indigo-500", mentoring: "bg-teal-500",
};

export default function MeetingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("weekly_deal");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      let url = "/meetings/?page_size=50";
      if (filterType) url += `&meeting_type=${filterType}`;
      const res = await api.get<{ data: MeetingItem[] }>(url);
      setItems(res.data.data);
    } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!title || !scheduledAt) { setError("제목과 일시는 필수입니다."); return; }
    setError(""); setSaving(true);
    try {
      await api.post("/meetings/", { meeting_type: meetingType, title, scheduled_at: scheduledAt, duration_minutes: parseInt(duration, 10) });
      setShowForm(false); setTitle(""); setScheduledAt(""); await fetchData();
    } catch { setError("생성에 실패했습니다."); } finally { setSaving(false); }
  }, [title, meetingType, scheduledAt, duration, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">회의 관리</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={16} className="mr-1" /> 회의 등록</Button>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`px-3 py-1 text-xs rounded-full border ${!filterType ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterType(null)}>전체</button>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <button key={k} className={`px-3 py-1 text-xs rounded-full border ${filterType === k ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterType(k === filterType ? null : k)}>{v}</button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">유형</label><select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">제목 *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">일시 *</label><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">소요시간 (분)</label><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "등록 중..." : "등록"}</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button></div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((m) => (
          <div key={m.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/meetings/${m.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[m.meeting_type] ?? "bg-slate-400"}`} />
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{TYPE_LABELS[m.meeting_type] ?? m.meeting_type}</span>
                <span className="text-sm font-bold text-slate-800">{m.title}</span>
              </div>
              <span className="text-sm text-slate-500">{new Date(m.scheduled_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>참석: {m.attendees.length}명</span>
              <span>안건: {m.agenda_items.length}건</span>
              <span>회의록: {m.minutes ? "작성됨" : "미작성"}</span>
              {m.action_items && <span>액션: {m.action_items.filter((a) => a.status === "completed").length}/{m.action_items.length}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">등록된 회의가 없습니다.</div>}
      </div>
    </div>
  );
}

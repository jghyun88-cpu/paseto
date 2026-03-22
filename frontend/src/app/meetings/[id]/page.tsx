"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface MeetingDetail {
  id: string; meeting_type: string; title: string; scheduled_at: string;
  duration_minutes: number | null; attendees: { user_id: string; team: string; role: string }[];
  agenda_items: { item: string; priority: string }[]; minutes: string | null;
  action_items: { item: string; assignee_id: string; deadline: string; status: string }[] | null;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!params.id) return;
    api.get<MeetingDetail>(`/meetings/${params.id}`)
      .then((res) => { setMeeting(res.data); setMinutes(res.data.minutes ?? ""); })
      .catch(() => router.push("/meetings"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSaveMinutes = useCallback(async () => {
    setSaving(true); setSuccess("");
    try {
      await api.patch(`/meetings/${params.id}`, { minutes });
      setSuccess("회의록이 저장되었습니다.");
    } catch { showError("회의록 저장에 실패했습니다."); } finally { setSaving(false); }
  }, [params.id, minutes]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!meeting) return <div className="p-8 text-center text-slate-400">회의를 찾을 수 없습니다.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/meetings")}><ArrowLeft size={18} /></Button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{meeting.title}</h2>
          <p className="text-sm text-slate-500">{new Date(meeting.scheduled_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} | {meeting.duration_minutes ?? "-"}분</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">참석자 ({meeting.attendees.length}명)</h3>
          <div className="space-y-1">
            {meeting.attendees.map((a, i) => (
              <div key={i} className="text-sm flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{a.team}</span>
                <span className="text-slate-700">{a.role}</span>
              </div>
            ))}
            {meeting.attendees.length === 0 && <p className="text-sm text-slate-400">참석자 미등록</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">안건 ({meeting.agenda_items.length}건)</h3>
          <div className="space-y-1">
            {meeting.agenda_items.map((a, i) => (
              <div key={i} className="text-sm text-slate-700">• {a.item}</div>
            ))}
            {meeting.agenda_items.length === 0 && <p className="text-sm text-slate-400">안건 미등록</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">회의록</h3>
        <textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} rows={8} placeholder="회의 내용을 기록하세요..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
        {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
        <div className="mt-3"><Button size="sm" onClick={handleSaveMinutes} disabled={saving}>{saving ? "저장 중..." : "회의록 저장"}</Button></div>
      </div>

      {meeting.action_items && meeting.action_items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">액션아이템</h3>
          <div className="space-y-2">
            {meeting.action_items.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${a.status === "completed" ? "bg-green-500" : "bg-amber-500"}`} />
                <span className="text-slate-700">{a.item}</span>
                <span className="text-xs text-slate-500">({a.deadline})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface MentoringSession {
  id: string;
  mentor_name: string;
  mentor_type: string;
  session_date: string;
  discussion_summary: string;
  action_items: { task: string; owner: string; deadline: string; status: string }[];
  action_completion_rate: number | null;
}

const MENTOR_TYPE_LABELS: Record<string, string> = {
  dedicated: "전담", functional: "기능별", industry: "산업별",
  investment: "투자", customer_dev: "고객개발",
};

const STATUS_ICONS: Record<string, string> = {
  completed: "✅", in_progress: "🔄", pending: "⏳",
};

export default function MentoringPage() {
  const params = useParams();
  const router = useRouter();
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // 폼 상태
  const [mentorName, setMentorName] = useState("");
  const [mentorType, setMentorType] = useState("dedicated");
  const [sessionDate, setSessionDate] = useState("");
  const [summary, setSummary] = useState("");
  const [actionItems, setActionItems] = useState<{ task: string; owner: string; deadline: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get<{ data: MentoringSession[] }>(`/mentoring-sessions/?startup_id=${params.id}&page_size=50`);
      setSessions(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    // params.id는 incubation ID이므로 먼저 startup_id를 가져와야 함
    // 현재는 incubation_id를 startup_id로 사용 (실제로는 incubation→startup_id 매핑 필요)
    fetchSessions();
  }, [fetchSessions]);

  const addActionItem = useCallback(() => {
    setActionItems((prev) => [...prev, { task: "", owner: "", deadline: "" }]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!mentorName || !sessionDate || !summary) {
      setError("멘토명, 일시, 주요 논의는 필수입니다.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      // incubation ID에서 startup_id를 가져오기
      const incRes = await api.get<{ startup_id: string }>(`/incubations/${params.id}`);
      await api.post("/mentoring-sessions/", {
        startup_id: incRes.data.startup_id,
        mentor_name: mentorName,
        mentor_type: mentorType,
        session_date: sessionDate,
        discussion_summary: summary,
        action_items: actionItems.filter((a) => a.task),
      });
      setShowForm(false);
      setMentorName("");
      setSummary("");
      setActionItems([]);
      await fetchSessions();
    } catch {
      setError("멘토링 기록 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [params.id, mentorName, mentorType, sessionDate, summary, actionItems, fetchSessions]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/incubation/${params.id}`)}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">멘토링 관리 (PRG-F03)</h2>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> 세션 추가
        </Button>
      </div>

      {/* 세션 기록 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">멘토명 *</label>
              <input type="text" value={mentorName} onChange={(e) => setMentorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">유형</label>
              <select value={mentorType} onChange={(e) => setMentorType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                {Object.entries(MENTOR_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">일시 *</label>
            <input type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">주요 논의 *</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-600">액션아이템</label>
              <button onClick={addActionItem} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus size={12} /> 추가
              </button>
            </div>
            {actionItems.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input type="text" placeholder="과제" value={item.task}
                  onChange={(e) => setActionItems((prev) => prev.map((a, j) => j === i ? { ...a, task: e.target.value } : a))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-blue-500" />
                <input type="text" placeholder="담당자" value={item.owner}
                  onChange={(e) => setActionItems((prev) => prev.map((a, j) => j === i ? { ...a, owner: e.target.value } : a))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-blue-500" />
                <input type="date" value={item.deadline}
                  onChange={(e) => setActionItems((prev) => prev.map((a, j) => j === i ? { ...a, deadline: e.target.value } : a))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </div>
      )}

      {/* 세션 목록 */}
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">{s.session_date.slice(0, 10)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {MENTOR_TYPE_LABELS[s.mentor_type] ?? s.mentor_type}
                </span>
                <span className="text-sm text-slate-600">멘토: {s.mentor_name}</span>
              </div>
              {s.action_completion_rate !== null && (
                <span className="text-xs font-semibold text-blue-600">이행률: {s.action_completion_rate}%</span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{s.discussion_summary}</p>
            {s.action_items.length > 0 && (
              <div className="space-y-1">
                {s.action_items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{STATUS_ICONS[item.status] ?? "⏳"}</span>
                    <span className="font-medium text-slate-700">{item.task}</span>
                    <span>({item.owner}, {item.deadline})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            <p className="text-sm">멘토링 세션이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

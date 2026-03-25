"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Clock, Users, X } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { MEETING_TYPE_LABEL, MEETING_TYPE_OPTIONS } from "@/lib/constants";

interface MeetingItem {
  id: string;
  meeting_type: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  attendees: { user_id?: string; team?: string; role?: string; name?: string }[];
  agenda_items: { item: string; owner_id?: string; priority?: string }[];
  minutes: string | null;
  action_items: { item: string; assignee_id?: string; deadline?: string; status?: string }[] | null;
  related_startup_ids: string[] | null;
  created_at: string;
}

interface UserItem {
  id: string;
  name: string;
}

interface MeetingsTabProps {
  startupId: string;
  startupName: string;
}

const INITIAL_FORM = {
  meeting_type: "weekly_deal",
  title: "",
  scheduled_at: "",
  duration_minutes: "",
  minutes: "",
  agenda_text: "",
};

export default function MeetingsTab({ startupId, startupName }: MeetingsTabProps) {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);

  // 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 상세 보기
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      const res = await api.get(`/meetings/?startup_id=${startupId}&page_size=50`);
      setMeetings(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    loadMeetings();
    api.get("/auth/users").then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setUsers(list.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, [loadMeetings]);

  const getUserName = useCallback((userId: string) => {
    return users.find((u) => u.id === userId)?.name ?? userId;
  }, [users]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setForm({ ...INITIAL_FORM, scheduled_at: local });
    setShowForm(true);
  };

  const openEdit = (m: MeetingItem) => {
    const localDt = new Date(m.scheduled_at);
    const local = new Date(localDt.getTime() - localDt.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setForm({
      meeting_type: m.meeting_type,
      title: m.title,
      scheduled_at: local,
      duration_minutes: m.duration_minutes?.toString() ?? "",
      minutes: m.minutes ?? "",
      agenda_text: m.agenda_items?.map((a) => a.item).join("\n") ?? "",
    });
    setEditingId(m.id);
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("회의 제목을 입력해주세요.");
      return;
    }
    if (!form.scheduled_at) {
      setError("일시를 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      const agendaItems = form.agenda_text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((item) => ({ item }));

      if (editingId) {
        await api.patch(`/meetings/${editingId}`, {
          title: form.title,
          scheduled_at: form.scheduled_at + ":00",
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          minutes: form.minutes || null,
          agenda_items: agendaItems,
        });
      } else {
        await api.post("/meetings/", {
          meeting_type: form.meeting_type,
          title: form.title,
          scheduled_at: form.scheduled_at + ":00",
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          agenda_items: agendaItems,
          related_startup_ids: [startupId],
        });
      }
      resetForm();
      await loadMeetings();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: MeetingItem) => {
    if (!window.confirm(`"${m.title}" 미팅을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/meetings/${m.id}`);
      await loadMeetings();
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 + 등록 버튼 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          미팅 이력 <span className="text-slate-400 font-normal ml-1">{total}건</span>
        </h3>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            미팅 등록
          </Button>
        )}
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-800">
              {editingId ? "미팅 수정" : "새 미팅 등록"}
            </h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">회의 유형</label>
                <select
                  value={form.meeting_type}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value }))}
                  disabled={!!editingId}
                  className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white disabled:bg-slate-50"
                >
                  {MEETING_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">소요시간 (분)</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="60"
                  className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={`${startupName} 관련 미팅`}
                className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">일시 *</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">안건 (줄바꿈으로 구분)</label>
              <textarea
                value={form.agenda_text}
                onChange={(e) => setForm((f) => ({ ...f, agenda_text: e.target.value }))}
                rows={3}
                placeholder={"투자 검토 사항\n기술 실사 일정 논의"}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">회의록 / 메모</label>
              <textarea
                value={form.minutes}
                onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                rows={3}
                placeholder="회의 내용 요약..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-y"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "저장 중..." : editingId ? "수정" : "등록"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                취소
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 미팅 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">로딩 중...</div>
        ) : meetings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">등록된 미팅이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {meetings.map((m) => {
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="px-5 py-3">
                  {/* 요약 행 */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      className="flex-1 text-left flex items-center gap-3 min-w-0"
                    >
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 shrink-0">
                        {MEETING_TYPE_LABEL[m.meeting_type] ?? m.meeting_type}
                      </span>
                      <span className="text-sm font-medium text-slate-800 truncate">{m.title}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <Clock className="w-3 h-3" />
                        {fmtDate(m.scheduled_at)}
                        {m.duration_minutes && ` · ${m.duration_minutes}분`}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                        title="수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 상세 펼침 */}
                  {isExpanded && (
                    <div className="mt-3 pl-2 space-y-3 text-sm">
                      {/* 참석자 */}
                      {m.attendees.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                            <Users className="w-3 h-3" /> 참석자
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.attendees.map((a, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                                {a.name || (a.user_id ? getUserName(a.user_id) : a.team ?? "-")}
                                {a.role && <span className="text-slate-400 ml-0.5">({a.role})</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 안건 */}
                      {m.agenda_items.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">안건</p>
                          <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                            {m.agenda_items.map((a, i) => (
                              <li key={i}>{a.item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 회의록 */}
                      {m.minutes && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">회의록</p>
                          <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-3 text-sm leading-relaxed">
                            {m.minutes}
                          </p>
                        </div>
                      )}

                      {/* 액션 아이템 */}
                      {m.action_items && m.action_items.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">액션 아이템</p>
                          <div className="space-y-1">
                            {m.action_items.map((ai, i) => (
                              <div key={i} className="flex items-center gap-2 text-slate-700">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  ai.status === "done" ? "bg-green-500" : "bg-amber-400"
                                }`} />
                                <span>{ai.item}</span>
                                {ai.deadline && (
                                  <span className="text-xs text-slate-400">~{ai.deadline}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

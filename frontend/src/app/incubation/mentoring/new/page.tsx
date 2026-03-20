"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

export default function MentoringNewPage() {
  const router = useRouter();
  const [startupId, setStartupId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!startupId || !sessionDate || !topic) {
      setError("스타트업 ID, 일시, 주제는 필수입니다.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post("/mentoring-sessions/", {
        startup_id: startupId,
        mentor_id: mentorId || undefined,
        session_date: sessionDate,
        topic,
        notes: notes || undefined,
      });
      router.push("/incubation/mentoring");
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setError(resp?.data?.detail ?? "세션 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [startupId, mentorId, sessionDate, topic, notes, router]);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">멘토링 세션 등록</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            스타트업 ID *
          </label>
          <input
            type="text"
            value={startupId}
            onChange={(e) => setStartupId(e.target.value)}
            placeholder="스타트업 UUID"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            멘토 ID
          </label>
          <input
            type="text"
            value={mentorId}
            onChange={(e) => setMentorId(e.target.value)}
            placeholder="멘토 UUID"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            일시 *
          </label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            주제 *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="멘토링 주제"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            메모
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="세션 관련 메모"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "등록 중..." : "등록"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/incubation/mentoring")}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

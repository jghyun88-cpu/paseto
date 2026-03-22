"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";
import type { MemoItem } from "@/lib/types";

interface StartupOption {
  id: string;
  company_name: string;
}

const DECISIONS = [
  { value: "approved", label: "승인 (Approved)", color: "text-green-600" },
  { value: "conditional", label: "조건부 승인", color: "text-blue-600" },
  { value: "on_hold", label: "보류 (On Hold)", color: "text-amber-600" },
  { value: "incubation_first", label: "보육 우선", color: "text-purple-600" },
  { value: "rejected", label: "거절 (Rejected)", color: "text-red-600" },
] as const;

interface ICDecisionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  startups: StartupOption[];
}

export default function ICDecisionModal({
  open,
  onClose,
  onSubmitted,
  startups,
}: ICDecisionModalProps) {
  const [startupId, setStartupId] = useState("");
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [memoId, setMemoId] = useState("");
  const [decision, setDecision] = useState("approved");
  const [conditions, setConditions] = useState("");
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // startup 선택 시 해당 메모 목록 로드
  useEffect(() => {
    if (!startupId) {
      setMemos([]);
      setMemoId("");
      return;
    }
    (async () => {
      try {
        const res = await api.get<MemoItem[]>(`/investment-memos/?startup_id=${startupId}`);
        setMemos(res.data);
        if (res.data.length > 0) setMemoId(res.data[0].id);
      } catch {
        showError("투자메모를 불러오는 데 실패했습니다.");
        setMemos([]);
      }
    })();
  }, [startupId]);

  const handleSubmit = useCallback(async () => {
    if (!startupId || !memoId) {
      setError("스타트업과 투자메모를 선택하세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/ic-decisions/", {
        startup_id: startupId,
        memo_id: memoId,
        decision,
        conditions: conditions || null,
        attendees: attendees
          ? attendees.split(",").map((s) => s.trim())
          : [],
        notes: notes || null,
      });
      onSubmitted();
      onClose();
    } catch {
      setError("IC 결정 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [startupId, memoId, decision, conditions, attendees, notes, onSubmitted, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">IC 결정 등록</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* 스타트업 선택 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">스타트업</label>
          <select
            value={startupId}
            onChange={(e) => setStartupId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="">선택</option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>{s.company_name}</option>
            ))}
          </select>
        </div>

        {/* 투자메모 선택 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">투자메모</label>
          <select
            value={memoId}
            onChange={(e) => setMemoId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            disabled={memos.length === 0}
          >
            {memos.length === 0 && <option value="">메모 없음</option>}
            {memos.map((m) => (
              <option key={m.id} value={m.id}>v{m.version} ({m.status})</option>
            ))}
          </select>
        </div>

        {/* 결정 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">결정</label>
          <div className="space-y-1">
            {DECISIONS.map((d) => (
              <label key={d.value} className={`flex items-center gap-2 cursor-pointer ${d.color}`}>
                <input
                  type="radio"
                  name="decision"
                  value={d.value}
                  checked={decision === d.value}
                  onChange={() => setDecision(d.value)}
                />
                <span className="text-sm">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 조건 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">조건/모니터링</label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            placeholder="조건부 승인 시 조건 기재"
          />
        </div>

        {/* 참석자 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">참석자 (쉼표 구분)</label>
          <input
            type="text"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            placeholder="파트너A, 심사역B, 심사역C"
          />
        </div>

        {/* 비고 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">비고</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "등록 중..." : "결정 등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}

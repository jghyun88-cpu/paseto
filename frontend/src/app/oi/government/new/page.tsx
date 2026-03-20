"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const TYPE_OPTIONS: Record<string, string> = {
  tips: "TIPS",
  rnd: "R&D 과제",
  sbir: "SBIR",
  other: "기타",
};

export default function GovernmentNewPage() {
  const router = useRouter();

  const [programName, setProgramName] = useState("");
  const [programType, setProgramType] = useState("tips");
  const [agency, setAgency] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [startupId, setStartupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!programName || !agency || !startupId) {
      setError("사업명, 주관기관, 스타트업 ID는 필수입니다.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post("/government-programs/", {
        program_name: programName,
        program_type: programType,
        managing_agency: agency,
        amount: budget ? Number(budget) : null,
        period_end: deadline || null,
        description: description || null,
        startup_id: startupId,
      });
      router.push("/oi/government");
    } catch {
      setError("등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [programName, programType, agency, budget, deadline, description, startupId, router]);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">정부사업 등록</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">사업명 *</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="예: 2026 TIPS 프로그램"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">사업 유형</label>
            <select
              value={programType}
              onChange={(e) => setProgramType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              {Object.entries(TYPE_OPTIONS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">주관기관 *</label>
            <input
              type="text"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="예: 중소벤처기업부"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">예산 (원)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="예: 500000000"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">마감일</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">스타트업 ID *</label>
            <input
              type="text"
              value={startupId}
              onChange={(e) => setStartupId(e.target.value)}
              placeholder="UUID"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="사업 내용을 입력하세요..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "등록 중..." : "등록"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/oi/government")}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

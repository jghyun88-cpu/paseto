"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";

const ITEMS = [
  { key: "fulltime_commitment", label: "전일제 헌신도" },
  { key: "problem_clarity", label: "문제 정의 명확성" },
  { key: "tech_differentiation", label: "기술/제품 차별성" },
  { key: "market_potential", label: "시장성" },
  { key: "initial_validation", label: "초기 검증/진척도" },
  { key: "strategy_fit", label: "프로그램 적합성" },
] as const;

function gradeLabel(score: number): { grade: string; color: string } {
  if (score >= 30) return { grade: "A (Pass)", color: "text-green-600" };
  if (score >= 20) return { grade: "B (Review)", color: "text-amber-600" };
  return { grade: "C/D (Reject)", color: "text-red-600" };
}

export default function NewScreeningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";

  const [scores, setScores] = useState<Record<string, number>>({
    fulltime_commitment: 3,
    problem_clarity: 3,
    tech_differentiation: 3,
    market_potential: 3,
    initial_validation: 3,
    strategy_fit: 3,
  });
  const [legalClear, setLegalClear] = useState(true);
  const [riskNotes, setRiskNotes] = useState("");
  const [handoverMemo, setHandoverMemo] = useState("");
  const [handoverToReview, setHandoverToReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalScore = useMemo(() => {
    const sum = Object.values(scores).reduce((a, b) => a + b, 0);
    return sum + (legalClear ? 5 : 0);
  }, [scores, legalClear]);

  const { grade, color } = gradeLabel(totalScore);

  const handleScore = useCallback((key: string, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!startupId) {
        setError("startup_id가 필요합니다. URL에 ?startup_id=를 포함하세요.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        await api.post("/screenings/", {
          startup_id: startupId,
          ...scores,
          legal_clear: legalClear,
          risk_notes: riskNotes || null,
          handover_memo: handoverMemo || null,
          handover_to_review: handoverToReview,
        });
        router.push("/sourcing/screening");
      } catch {
        setError("스크리닝 제출에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, scores, legalClear, riskNotes, handoverMemo, handoverToReview, router],
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">1차 스크리닝 (SRC-F02)</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        {/* 평가 항목 */}
        {ITEMS.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-600">{item.label}</label>
              <span className="text-sm font-bold text-blue-600">{scores[item.key]}/5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={scores[item.key]}
              onChange={(e) => handleScore(item.key, Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
        ))}

        {/* 법적 이슈 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="legal_clear"
            checked={legalClear}
            onChange={(e) => setLegalClear(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="legal_clear" className="text-sm text-slate-600">법적 이슈 없음 (+5점)</label>
        </div>

        {/* 총점 + 등급 */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-500">총점</div>
          <div className="text-3xl font-extrabold text-slate-800">{totalScore}<span className="text-base font-normal text-slate-400">/35</span></div>
          <div className={`text-sm font-bold mt-1 ${color}`}>등급 제안: {grade}</div>
        </div>

        {/* 리스크 + 메모 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">핵심 리스크 (줄바꿈으로 구분)</label>
          <textarea
            value={riskNotes}
            onChange={(e) => setRiskNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            placeholder="리스크 1&#10;리스크 2&#10;리스크 3"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">심사팀 인계 메모</label>
          <textarea
            value={handoverMemo}
            onChange={(e) => setHandoverMemo(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="handover"
            checked={handoverToReview}
            onChange={(e) => setHandoverToReview(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="handover" className="text-sm font-semibold text-blue-700">심사팀 인계 요청</label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "제출 중..." : "스크리닝 제출"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        </div>
      </form>
    </div>
  );
}

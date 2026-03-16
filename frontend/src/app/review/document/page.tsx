"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ScoreSlider from "@/components/forms/ScoreSlider";
import FiveAxisRadar from "@/components/charts/RadarChart";
import api from "@/lib/api";

const AXES = [
  { key: "team_score", label: "팀 역량" },
  { key: "problem_score", label: "문제 정의" },
  { key: "solution_score", label: "솔루션" },
  { key: "market_score", label: "시장성" },
  { key: "traction_score", label: "트랙션" },
] as const;

const VERDICTS = [
  { value: "proceed", label: "진행 (Proceed)", color: "text-green-600" },
  { value: "concern", label: "우려 (Concern)", color: "text-amber-600" },
  { value: "reject", label: "거절 (Reject)", color: "text-red-600" },
] as const;

export default function DocumentReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";

  const [scores, setScores] = useState<Record<string, number>>({
    team_score: 3,
    problem_score: 3,
    solution_score: 3,
    market_score: 3,
    traction_score: 3,
  });
  const [verdict, setVerdict] = useState("proceed");
  const [showDeeptech, setShowDeeptech] = useState(false);
  const [deeptech, setDeeptech] = useState({
    tech_type: "",
    scalability_score: 3,
    process_compatibility: 3,
    sample_test_status: "",
    certification_stage: "",
    purchase_lead_time_months: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const radarData = useMemo(
    () => AXES.map((a) => ({ axis: a.label, score: scores[a.key] })),
    [scores],
  );

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
        await api.post("/reviews/", {
          startup_id: startupId,
          review_type: "document",
          ...scores,
          overall_verdict: verdict,
          ...(showDeeptech
            ? {
                tech_type: deeptech.tech_type || null,
                scalability_score: deeptech.scalability_score,
                process_compatibility: deeptech.process_compatibility,
                sample_test_status: deeptech.sample_test_status || null,
                certification_stage: deeptech.certification_stage || null,
                purchase_lead_time_months: deeptech.purchase_lead_time_months || null,
              }
            : {}),
        });
        router.push("/review/pipeline");
      } catch {
        setError("서류심사 제출에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, scores, verdict, showDeeptech, deeptech, router],
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">서류심사 (5축 평가)</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5축 슬라이더 */}
          <div className="space-y-4">
            {AXES.map((a) => (
              <ScoreSlider
                key={a.key}
                label={a.label}
                value={scores[a.key]}
                onChange={(v) => setScores((prev) => ({ ...prev, [a.key]: v }))}
              />
            ))}
          </div>

          {/* Radar Chart */}
          <div className="flex items-center justify-center">
            <FiveAxisRadar data={radarData} />
          </div>
        </div>

        {/* 판정 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">종합 판정</label>
          <div className="flex gap-4">
            {VERDICTS.map((v) => (
              <label key={v.value} className={`flex items-center gap-1.5 cursor-pointer ${v.color}`}>
                <input
                  type="radio"
                  name="verdict"
                  value={v.value}
                  checked={verdict === v.value}
                  onChange={() => setVerdict(v.value)}
                />
                <span className="text-sm font-medium">{v.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 딥테크 심화 */}
        <div className="border-t pt-4">
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => setShowDeeptech(!showDeeptech)}
          >
            {showDeeptech ? "▼" : "▶"} 딥테크 심화 필드
          </button>

          {showDeeptech && (
            <div className="mt-3 space-y-3 pl-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">기술 유형</label>
                <select
                  value={deeptech.tech_type}
                  onChange={(e) => setDeeptech((p) => ({ ...p, tech_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">선택</option>
                  <option value="paper_tech">논문 기술</option>
                  <option value="engineering">엔지니어링</option>
                  <option value="mixed">혼합</option>
                </select>
              </div>
              <ScoreSlider
                label="양산성/스케일업"
                value={deeptech.scalability_score}
                onChange={(v) => setDeeptech((p) => ({ ...p, scalability_score: v }))}
              />
              <ScoreSlider
                label="공정 적합성"
                value={deeptech.process_compatibility}
                onChange={(v) => setDeeptech((p) => ({ ...p, process_compatibility: v }))}
              />
              <div>
                <label className="block text-sm text-slate-600 mb-1">샘플 테스트 상태</label>
                <select
                  value={deeptech.sample_test_status}
                  onChange={(e) => setDeeptech((p) => ({ ...p, sample_test_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">선택</option>
                  <option value="not_started">미시작</option>
                  <option value="in_progress">진행중</option>
                  <option value="passed">통과</option>
                  <option value="failed">실패</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">인증 단계</label>
                <input
                  type="text"
                  value={deeptech.certification_stage}
                  onChange={(e) => setDeeptech((p) => ({ ...p, certification_stage: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  placeholder="예: ISO 13485 취득 중"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">구매전환 리드타임 (월)</label>
                <input
                  type="number"
                  min={0}
                  value={deeptech.purchase_lead_time_months}
                  onChange={(e) => setDeeptech((p) => ({ ...p, purchase_lead_time_months: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "제출 중..." : "서류심사 제출"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

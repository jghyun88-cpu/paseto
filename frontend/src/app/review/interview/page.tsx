"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ScoreSlider from "@/components/forms/ScoreSlider";
import api from "@/lib/api";

const AXES = [
  { key: "number_literacy", label: "숫자 리터러시" },
  { key: "customer_experience", label: "고객 경험 이해" },
  { key: "tech_moat", label: "기술 해자" },
  { key: "execution_plan", label: "실행 계획 구체성" },
  { key: "feedback_absorption", label: "피드백 흡수력" },
  { key: "cofounder_stability", label: "공동창업자 안정성" },
] as const;

const VERDICTS = [
  { value: "proceed", label: "진행 (Proceed)", color: "text-green-600" },
  { value: "concern", label: "우려 (Concern)", color: "text-amber-600" },
  { value: "reject", label: "거절 (Reject)", color: "text-red-600" },
] as const;

export default function InterviewReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(AXES.map((a) => [a.key, 3])),
  );
  const [verdict, setVerdict] = useState("proceed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!startupId) {
        setError("startup_id가 필요합니다.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        await api.post("/reviews/", {
          startup_id: startupId,
          review_type: "interview",
          ...scores,
          overall_verdict: verdict,
        });
        router.push("/review/pipeline");
      } catch {
        setError("인터뷰 평가 제출에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, scores, verdict, router],
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">구조화 인터뷰 (8축 평가)</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        {AXES.map((a) => (
          <ScoreSlider
            key={a.key}
            label={a.label}
            value={scores[a.key]}
            onChange={(v) => setScores((prev) => ({ ...prev, [a.key]: v }))}
          />
        ))}

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "제출 중..." : "인터뷰 평가 제출"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

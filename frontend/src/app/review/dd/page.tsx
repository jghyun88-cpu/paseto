"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DDChecklist from "@/components/forms/DDChecklist";
import api from "@/lib/api";
import { DD_ITEMS, type DDStatus, type ReviewItem } from "@/lib/types";
import { showError } from "@/lib/toast";

const VERDICTS = [
  { value: "proceed", label: "진행", color: "text-green-600" },
  { value: "concern", label: "우려", color: "text-amber-600" },
  { value: "reject", label: "거절", color: "text-red-600" },
] as const;

export default function DDReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, string>>(
    Object.fromEntries(DD_ITEMS.map((k) => [k, "pending"])),
  );
  const [riskLog, setRiskLog] = useState("");
  const [verdict, setVerdict] = useState("proceed");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 기존 DD 로드 또는 신규 생성
  useEffect(() => {
    if (!startupId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get<ReviewItem[]>(
          `/reviews/?startup_id=${startupId}&review_type=dd`,
        );
        if (res.data.length > 0) {
          const existing = res.data[0];
          setReviewId(existing.id);
          if (existing.dd_checklist) setChecklist(existing.dd_checklist);
          if (existing.risk_log) setRiskLog(existing.risk_log);
          setVerdict(existing.overall_verdict);
        }
      } catch {
        showError("데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [startupId]);

  const handleChecklistChange = useCallback((key: string, status: DDStatus) => {
    setChecklist((prev) => ({ ...prev, [key]: status }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!startupId) {
      setError("startup_id가 필요합니다.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (reviewId) {
        // 기존 DD 업데이트
        await api.patch(`/reviews/${reviewId}`, {
          dd_checklist: checklist,
          risk_log: riskLog || null,
          overall_verdict: verdict,
        });
      } else {
        // 신규 DD 생성
        const res = await api.post<ReviewItem>("/reviews/", {
          startup_id: startupId,
          review_type: "dd",
          dd_checklist: checklist,
          risk_log: riskLog || null,
          overall_verdict: verdict,
        });
        setReviewId(res.data.id);
      }
      router.push("/review/pipeline");
    } catch {
      setError("DD 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [startupId, reviewId, checklist, riskLog, verdict, router]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">DD 체크리스트</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        <DDChecklist
          checklist={checklist}
          onChange={handleChecklistChange}
        />

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">리스크 로그</label>
          <textarea
            value={riskLog}
            onChange={(e) => setRiskLog(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            placeholder="발견된 리스크를 기록하세요"
          />
        </div>

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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : reviewId ? "DD 업데이트" : "DD 저장"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MemoEditor from "@/components/forms/MemoEditor";
import api from "@/lib/api";
import type { MemoItem } from "@/lib/types";
import { INVESTMENT_VEHICLE_OPTIONS, SHARE_ACQUISITION_OPTIONS } from "@/lib/constants";

const EMPTY_SECTIONS: Record<string, string> = {
  overview: "",
  team_assessment: "",
  market_assessment: "",
  tech_product_assessment: "",
  traction: "",
  risks: "",
  value_add_points: "",
  post_investment_plan: "",
};

export default function NewMemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";

  const [sections, setSections] = useState<Record<string, string>>({ ...EMPTY_SECTIONS });
  const [terms, setTerms] = useState({
    amount: "",
    valuation: "",
    vehicle: "rcps",
    share_acquisition_type: "new_shares",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSectionChange = useCallback((key: string, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (status: "draft" | "submitted") => {
      if (!startupId) {
        setError("startup_id가 필요합니다.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const res = await api.post<MemoItem>("/investment-memos/", {
          startup_id: startupId,
          ...sections,
          proposed_terms: {
            amount: terms.amount ? Number(terms.amount) : null,
            valuation: terms.valuation ? Number(terms.valuation) : null,
            vehicle: terms.vehicle,
            share_acquisition_type: terms.share_acquisition_type,
          },
        });
        // 상태를 submitted로 변경하려면 PATCH
        if (status === "submitted") {
          await api.patch(`/investment-memos/${res.data.id}`, { status: "submitted" });
        }
        router.push("/review/pipeline");
      } catch {
        setError("투자메모 저장에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, sections, terms, router],
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">투자메모 작성</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        {/* 9섹션 아코디언 */}
        <MemoEditor sections={sections} onChange={handleSectionChange} />

        {/* 투자 조건 */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">투자 조건 (Proposed Terms)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">투자금액 (원)</label>
              <input
                type="number"
                value={terms.amount}
                onChange={(e) => setTerms((p) => ({ ...p, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder="300000000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">밸류에이션 (원)</label>
              <input
                type="number"
                value={terms.valuation}
                onChange={(e) => setTerms((p) => ({ ...p, valuation: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder="5000000000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">투자구조</label>
              <select
                value={terms.vehicle}
                onChange={(e) => setTerms((p) => ({ ...p, vehicle: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                {INVESTMENT_VEHICLE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">신주/구주</label>
              <select
                value={terms.share_acquisition_type}
                onChange={(e) => setTerms((p) => ({ ...p, share_acquisition_type: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                {SHARE_ACQUISITION_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => handleSubmit("draft")} disabled={loading} variant="outline">
            {loading ? "저장 중..." : "임시저장 (Draft)"}
          </Button>
          <Button onClick={() => handleSubmit("submitted")} disabled={loading}>
            {loading ? "제출 중..." : "제출 (Submitted)"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

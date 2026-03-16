"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const DIAGNOSIS_ITEMS = [
  { key: "customer", label: "고객" },
  { key: "product", label: "제품" },
  { key: "tech", label: "기술" },
  { key: "org", label: "조직" },
  { key: "sales", label: "영업" },
  { key: "finance", label: "재무" },
  { key: "investment_readiness", label: "투자준비" },
];

export default function NewOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";

  const [assignedPmId, setAssignedPmId] = useState("");
  const [programStart, setProgramStart] = useState("");
  const [programEnd, setProgramEnd] = useState("");
  const [diagnosis, setDiagnosis] = useState<Record<string, number>>(
    Object.fromEntries(DIAGNOSIS_ITEMS.map(({ key }) => [key, 3])),
  );
  const [bottleneck, setBottleneck] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDiagnosis = useCallback((key: string, value: number) => {
    setDiagnosis((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!startupId) {
        setError("startup_id가 필요합니다. URL에 ?startup_id= 파라미터를 추가하세요.");
        return;
      }
      if (!assignedPmId || !programStart || !programEnd) {
        setError("담당 PM, 프로그램 시작일, 종료일은 필수입니다.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        await api.post("/incubations/", {
          startup_id: startupId,
          assigned_pm_id: assignedPmId,
          program_start: programStart,
          program_end: programEnd,
          diagnosis,
          growth_bottleneck: bottleneck || null,
        });
        router.push("/incubation");
      } catch {
        setError("온보딩 생성에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, assignedPmId, programStart, programEnd, diagnosis, bottleneck, router],
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">온보딩 시트 (PRG-F01)</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">담당 PM (ID)</label>
          <input
            type="text"
            value={assignedPmId}
            onChange={(e) => setAssignedPmId(e.target.value)}
            placeholder="PM 사용자 UUID"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">프로그램 시작일</label>
            <input
              type="date"
              value={programStart}
              onChange={(e) => setProgramStart(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">프로그램 종료일</label>
            <input
              type="date"
              value={programEnd}
              onChange={(e) => setProgramEnd(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">성장 진단 (7개 항목, 1-5점)</h3>
          {DIAGNOSIS_ITEMS.map((item) => (
            <div key={item.key} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-slate-600">{item.label}</label>
                <span className="text-sm font-bold text-blue-600">{diagnosis[item.key]}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={diagnosis[item.key]}
                onChange={(e) => handleDiagnosis(item.key, Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">현재 가장 큰 병목 *</label>
          <textarea
            value={bottleneck}
            onChange={(e) => setBottleneck(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "생성 중..." : "온보딩 생성"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

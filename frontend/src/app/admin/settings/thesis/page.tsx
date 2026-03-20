"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ThesisPage() {
  const [industries, setIndustries] = useState(
    "AI/ML, 바이오, 반도체, 양자컴퓨팅, 로보틱스, 신소재"
  );
  const [stageMin, setStageMin] = useState("Pre-Seed");
  const [stageMax, setStageMax] = useState("Series A");
  const [checkMin, setCheckMin] = useState("1");
  const [checkMax, setCheckMax] = useState("10");
  const [criteria, setCriteria] = useState(
    "핵심 기술 차별성\n시장 규모 및 성장성\n창업팀 역량 (기술 + 사업)\nIP 포트폴리오\n글로벌 확장 가능성"
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    try {
      // 추후 API 연동 예정
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess("투자 Thesis가 저장되었습니다.");
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">투자 Thesis</h2>

      <div className="space-y-6">
        {/* 포커스 산업 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">포커스 산업</h3>
          <textarea
            value={industries}
            onChange={(e) => setIndustries(e.target.value)}
            rows={3}
            placeholder="산업 분야를 쉼표(,)로 구분하여 입력"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-slate-400">쉼표(,)로 구분하여 입력</p>
        </div>

        {/* 투자 단계 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">투자 단계 범위</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">최소 단계</label>
              <select
                value={stageMin}
                onChange={(e) => setStageMin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Pre-Seed">Pre-Seed</option>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
                <option value="Series B">Series B</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">최대 단계</label>
              <select
                value={stageMax}
                onChange={(e) => setStageMax(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Pre-Seed">Pre-Seed</option>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
                <option value="Series B">Series B</option>
              </select>
            </div>
          </div>
        </div>

        {/* 투자 규모 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">체크 사이즈 (억원)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">최소</label>
              <input
                type="number"
                value={checkMin}
                onChange={(e) => setCheckMin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">최대</label>
              <input
                type="number"
                value={checkMax}
                onChange={(e) => setCheckMax(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 핵심 기준 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">핵심 투자 기준</h3>
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            rows={6}
            placeholder="투자 기준을 줄 바꿈으로 구분하여 입력"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-slate-400">줄 바꿈으로 항목 구분</p>
        </div>

        {success && <p className="text-sm text-green-600">{success}</p>}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

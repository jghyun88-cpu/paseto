"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

export default function NewPoCPage() {
  const router = useRouter();
  const [startupId, setStartupId] = useState("");
  const [partnerDemandId, setPartnerDemandId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [objective, setObjective] = useState("");
  const [scope, setScope] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("8");
  const [validationMetrics, setValidationMetrics] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [costStructure, setCostStructure] = useState("");
  const [roleDivision, setRoleDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupId || !partnerDemandId || !projectName || !objective || !scope || !successCriteria) {
      setError("필수 항목을 모두 입력하세요."); return;
    }
    setError(""); setSaving(true);
    try {
      await api.post("/poc-projects/", {
        startup_id: startupId, partner_demand_id: partnerDemandId,
        project_name: projectName, objective, scope,
        duration_weeks: parseInt(durationWeeks, 10),
        validation_metrics: validationMetrics ? validationMetrics.split(",").map((s) => s.trim()) : [],
        success_criteria: successCriteria,
        cost_structure: costStructure || null,
        role_division: roleDivision || null,
      });
      router.push("/oi/poc");
    } catch { setError("PoC 생성에 실패했습니다."); } finally { setSaving(false); }
  }, [startupId, partnerDemandId, projectName, objective, scope, durationWeeks, validationMetrics, successCriteria, costStructure, roleDivision, router]);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <h2 className="text-lg font-bold text-slate-800">PoC 제안서 (OI-F02)</h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold text-slate-600 mb-1">스타트업 ID *</label><input type="text" value={startupId} onChange={(e) => setStartupId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm font-semibold text-slate-600 mb-1">파트너 수요 ID *</label><input type="text" value={partnerDemandId} onChange={(e) => setPartnerDemandId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        </div>
        <div><label className="block text-sm font-semibold text-slate-600 mb-1">프로젝트명 *</label><input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm font-semibold text-slate-600 mb-1">목표 *</label><textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm font-semibold text-slate-600 mb-1">범위 *</label><textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold text-slate-600 mb-1">기간 (주)</label><input type="number" value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm font-semibold text-slate-600 mb-1">검증지표 (쉼표 구분)</label><input type="text" value={validationMetrics} onChange={(e) => setValidationMetrics(e.target.value)} placeholder="정확도, 처리속도" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        </div>
        <div><label className="block text-sm font-semibold text-slate-600 mb-1">성공 기준 *</label><textarea value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm font-semibold text-slate-600 mb-1">비용부담 구조</label><input type="text" value={costStructure} onChange={(e) => setCostStructure(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm font-semibold text-slate-600 mb-1">역할 분담</label><input type="text" value={roleDivision} onChange={(e) => setRoleDivision(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2"><Button type="submit" disabled={saving}>{saving ? "생성 중..." : "PoC 생성"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>취소</Button></div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface PoCDetail {
  id: string; project_name: string; startup_id: string; partner_demand_id: string;
  objective: string; scope: string; duration_weeks: number; validation_metrics: string[];
  success_criteria: string; status: string; kickoff_date: string | null; completion_date: string | null;
  weekly_issues: string | null; support_needed: string | null; partner_feedback: string | null;
  startup_feedback: string | null; conversion_likelihood: string | null; result_summary: string | null;
}

const STATUS_OPTIONS = [
  "demand_identified", "matching", "planning", "kickoff", "in_progress",
  "mid_review", "completed", "commercial_contract", "joint_development",
  "strategic_investment", "retry", "terminated",
];

export default function PoCDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [poc, setPoc] = useState<PoCDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyIssues, setWeeklyIssues] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [partnerFeedback, setPartnerFeedback] = useState("");
  const [startupFeedback, setStartupFeedback] = useState("");
  const [likelihood, setLikelihood] = useState("");
  const [resultSummary, setResultSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!params.id) return;
    api.get<PoCDetail>(`/poc-projects/${params.id}`)
      .then((res) => {
        setPoc(res.data);
        setWeeklyIssues(res.data.weekly_issues ?? "");
        setSupportNeeded(res.data.support_needed ?? "");
        setPartnerFeedback(res.data.partner_feedback ?? "");
        setStartupFeedback(res.data.startup_feedback ?? "");
        setLikelihood(res.data.conversion_likelihood ?? "");
        setResultSummary(res.data.result_summary ?? "");
      })
      .catch(() => router.push("/oi/poc"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    setError(""); setSuccess("");
    try {
      await api.patch(`/poc-projects/${params.id}/status`, { status: newStatus });
      setPoc((prev) => prev ? { ...prev, status: newStatus } : prev);
      setSuccess("상태가 변경되었습니다.");
    } catch { setError("상태 변경에 실패했습니다."); }
  }, [params.id]);

  const handleProgressSave = useCallback(async () => {
    setError(""); setSuccess(""); setSaving(true);
    try {
      await api.patch(`/poc-projects/${params.id}/progress`, {
        weekly_issues: weeklyIssues || null, support_needed: supportNeeded || null,
        partner_feedback: partnerFeedback || null, startup_feedback: startupFeedback || null,
        conversion_likelihood: likelihood || null, result_summary: resultSummary || null,
      });
      setSuccess("진행 상황이 저장되었습니다." + (likelihood === "높음" ? " (심사팀에 전략투자 검토 알림 발송됨)" : ""));
    } catch { setError("저장에 실패했습니다."); } finally { setSaving(false); }
  }, [params.id, weeklyIssues, supportNeeded, partnerFeedback, startupFeedback, likelihood, resultSummary]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!poc) return <div className="p-8 text-center text-slate-400">PoC를 찾을 수 없습니다.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/oi/poc")}><ArrowLeft size={18} /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800">{poc.project_name}</h2>
          <p className="text-sm text-slate-500">기간: {poc.duration_weeks}주 | 성공기준: {poc.success_criteria}</p>
        </div>
        <select value={poc.status} onChange={(e) => handleStatusChange(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">프로젝트 개요</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-500">목표:</span> <span className="text-slate-700">{poc.objective}</span></div>
            <div><span className="text-slate-500">범위:</span> <span className="text-slate-700">{poc.scope}</span></div>
            <div><span className="text-slate-500">검증지표:</span> <span className="text-slate-700">{poc.validation_metrics.join(", ")}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">일정</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-500">킥오프:</span> <span className="text-slate-700">{poc.kickoff_date ?? "미정"}</span></div>
            <div><span className="text-slate-500">종료:</span> <span className="text-slate-700">{poc.completion_date ?? "미정"}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">진행관리 (OI-F03)</h3>
        <div><label className="block text-sm text-slate-600 mb-1">주간 이슈</label><textarea value={weeklyIssues} onChange={(e) => setWeeklyIssues(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm text-slate-600 mb-1">필요 지원</label><textarea value={supportNeeded} onChange={(e) => setSupportNeeded(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-600 mb-1">파트너 피드백</label><textarea value={partnerFeedback} onChange={(e) => setPartnerFeedback(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-600 mb-1">스타트업 피드백</label><textarea value={startupFeedback} onChange={(e) => setStartupFeedback(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">전환가능성</label>
            <select value={likelihood} onChange={(e) => setLikelihood(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
              <option value="">선택</option><option value="높음">높음</option><option value="중간">중간</option><option value="낮음">낮음</option>
            </select>
            {likelihood === "높음" && <p className="text-xs text-red-600 mt-1">저장 시 심사팀에 전략투자 검토 알림이 발송됩니다.</p>}
          </div>
          <div><label className="block text-sm text-slate-600 mb-1">결과 요약</label><textarea value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button onClick={handleProgressSave} disabled={saving}>{saving ? "저장 중..." : "진행 상황 저장"}</Button>
      </div>
    </div>
  );
}

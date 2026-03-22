"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface MeetingItem {
  id: string;
  investor_name: string;
  investor_company: string;
  investor_type: string;
  meeting_date: string;
  meeting_type: string;
  outcome: string | null;
  next_step: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  angel: "엔젤", seed_vc: "시드VC", pre_a_vc: "Pre-A VC",
  cvc: "CVC", strategic: "전략투자", overseas: "해외",
};

const MEETING_LABELS: Record<string, string> = {
  onsite_consult: "현장상담", follow_up: "후속미팅",
  ir_meeting: "IR 미팅", termsheet: "Term Sheet",
};

const OUTCOME_COLORS: Record<string, string> = {
  interested: "bg-blue-100 text-blue-700",
  passed: "bg-slate-100 text-slate-600",
  termsheet: "bg-emerald-100 text-emerald-700",
  invested: "bg-purple-100 text-purple-700",
};

export default function InvestorMeetingsPage() {
  const params = useParams();
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [startupId, setStartupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [investorName, setInvestorName] = useState("");
  const [investorCompany, setInvestorCompany] = useState("");
  const [investorType, setInvestorType] = useState("seed_vc");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState("ir_meeting");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (sid: string) => {
    try {
      const res = await api.get<{ data: MeetingItem[] }>(`/investor-meetings/?startup_id=${sid}&page_size=50`);
      setMeetings(res.data.data);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    }
  }, []);

  useEffect(() => {
    if (!params.id) return;
    api.get<{ startup_id: string }>(`/incubations/${params.id}`)
      .then((res) => {
        setStartupId(res.data.startup_id);
        return fetchData(res.data.startup_id);
      })
      .catch(() => router.push("/incubation"))
      .finally(() => setLoading(false));
  }, [params.id, router, fetchData]);

  const handleCreate = useCallback(async () => {
    if (!investorName || !investorCompany || !meetingDate) {
      setError("투자자명, 소속, 미팅일은 필수입니다.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post("/investor-meetings/", {
        startup_id: startupId,
        investor_name: investorName,
        investor_company: investorCompany,
        investor_type: investorType,
        meeting_date: meetingDate,
        meeting_type: meetingType,
        outcome: outcome || null,
      });
      setShowForm(false);
      setInvestorName("");
      setInvestorCompany("");
      setMeetingDate("");
      setOutcome("");
      await fetchData(startupId);
    } catch {
      setError("미팅 기록 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [startupId, investorName, investorCompany, investorType, meetingDate, meetingType, outcome, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/incubation/${params.id}`)}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">투자자 미팅 기록</h2>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> 미팅 추가
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">투자자명 *</label>
              <input type="text" value={investorName} onChange={(e) => setInvestorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">소속 *</label>
              <input type="text" value={investorCompany} onChange={(e) => setInvestorCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">유형</label>
              <select value={investorType} onChange={(e) => setInvestorType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">미팅일 *</label>
              <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">미팅유형</label>
              <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                {Object.entries(MEETING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </div>
      )}

      {/* 미팅 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">투자자</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">소속</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">유형</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">미팅일</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">미팅유형</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">결과</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="py-2 px-3 font-medium text-slate-800">{m.investor_name}</td>
                <td className="py-2 px-3 text-slate-600">{m.investor_company}</td>
                <td className="py-2 px-3">{TYPE_LABELS[m.investor_type] ?? m.investor_type}</td>
                <td className="py-2 px-3">{m.meeting_date}</td>
                <td className="py-2 px-3">{MEETING_LABELS[m.meeting_type] ?? m.meeting_type}</td>
                <td className="py-2 px-3">
                  {m.outcome && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_COLORS[m.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                      {m.outcome}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meetings.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">투자자 미팅 기록이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

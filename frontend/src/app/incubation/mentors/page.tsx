"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface MentorItem {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  mentor_type: string;
  expertise_areas: string[];
  is_active: boolean;
  engagement_count: number;
}

const TYPE_LABELS: Record<string, string> = {
  dedicated: "전담", functional: "기능별", industry: "산업별",
  investment: "투자", customer_dev: "고객개발",
};

export default function MentorsPage() {
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [mentorTitle, setMentorTitle] = useState("");
  const [mentorType, setMentorType] = useState("dedicated");
  const [expertise, setExpertise] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: MentorItem[] }>("/mentors/?page_size=100");
      setMentors(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!name) { setError("멘토명은 필수입니다."); return; }
    setError("");
    setSaving(true);
    try {
      await api.post("/mentors/", {
        name,
        company: company || null,
        title: mentorTitle || null,
        mentor_type: mentorType,
        expertise_areas: expertise ? expertise.split(",").map((s) => s.trim()) : [],
      });
      setShowForm(false);
      setName("");
      setCompany("");
      setMentorTitle("");
      setExpertise("");
      await fetchData();
    } catch {
      setError("멘토 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [name, company, mentorTitle, mentorType, expertise, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">멘토 풀 관리</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> 멘토 등록
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">이름 *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">소속</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">직함</label>
              <input type="text" value={mentorTitle} onChange={(e) => setMentorTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">유형</label>
              <select value={mentorType} onChange={(e) => setMentorType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">전문분야 (쉼표 구분)</label>
              <input type="text" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="반도체, fabless"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "등록 중..." : "등록"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">이름</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">소속</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">유형</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">전문분야</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">세션 수</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {mentors.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="py-2 px-3 font-medium text-slate-800">{m.name}</td>
                <td className="py-2 px-3 text-slate-600">{m.company ?? "-"}</td>
                <td className="py-2 px-3">{TYPE_LABELS[m.mentor_type] ?? m.mentor_type}</td>
                <td className="py-2 px-3">
                  <div className="flex gap-1 flex-wrap">
                    {m.expertise_areas.map((e, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{e}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">{m.engagement_count}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {m.is_active ? "활성" : "비활성"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mentors.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">등록된 멘토가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

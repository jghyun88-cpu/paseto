"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterChips } from "@/components/ui/filter-chips";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface DemandItem {
  id: string;
  partner_company: string;
  department: string | null;
  demand_type: string;
  description: string;
  status: string;
  nda_required: boolean;
  candidate_startups: { startup_id: string; fit_reason: string }[] | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  tech_adoption: "기술도입", joint_dev: "공동개발", vendor: "벤더발굴",
  new_biz: "신규사업", strategic_invest: "전략투자",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([key, label]) => ({ key, label }));

const STATUS_LABELS: Record<string, string> = {
  open: "오픈", matched: "매칭완료", in_poc: "PoC 진행", contracted: "계약", closed: "종료",
};

export default function PartnersPage() {
  const [items, setItems] = useState<DemandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [demandType, setDemandType] = useState("tech_adoption");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      let url = "/partner-demands/?page_size=100";
      if (filterType) url += `&demand_type=${filterType}`;
      const res = await api.get<{ data: DemandItem[] }>(url);
      setItems(res.data.data);
    } catch { showError("데이터를 불러오는 데 실패했습니다."); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!company || !description) { setError("기업명과 설명은 필수입니다."); return; }
    setError(""); setSaving(true);
    try {
      await api.post("/partner-demands/", {
        partner_company: company, department: department || null,
        demand_type: demandType, description,
      });
      setShowForm(false); setCompany(""); setDepartment(""); setDescription("");
      await fetchData();
    } catch { setError("등록에 실패했습니다."); } finally { setSaving(false); }
  }, [company, department, demandType, description, fetchData]);

  if (loading) return <LoadingSpinner message="파트너 수요를 불러오는 중..." />;

  return (
    <div>
      <PageHeader
        title="파트너 수요맵"
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} className="mr-1" /> 수요 등록
          </Button>
        }
      />

      <FilterChips
        options={TYPE_OPTIONS}
        value={filterType}
        onChange={setFilterType}
      />

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">수요기업 *</label><input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">현업부서</label><input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-slate-600 mb-1">수요 유형</label><select value={demandType} onChange={(e) => setDemandType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-600 mb-1">해결하려는 문제 *</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "등록 중..." : "등록"}</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button></div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((d) => (
            <div key={d.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">{d.partner_company}</h3>
                  {d.department && <span className="text-xs text-slate-500">{d.department}</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{TYPE_LABELS[d.demand_type] ?? d.demand_type}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{STATUS_LABELS[d.status] ?? d.status}</span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{d.description}</p>
              {d.nda_required && <span className="inline-block mt-1 text-xs text-red-600">NDA 필요</span>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Handshake size={24} />}
          title="파트너 수요가 없습니다"
          description="수요기업의 기술 니즈를 등록하여 스타트업 매칭을 시작하세요."
          actionLabel="첫 수요 등록"
          onAction={() => setShowForm(true)}
        />
      )}
    </div>
  );
}

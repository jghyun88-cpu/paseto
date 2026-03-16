"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2 } from "lucide-react";
import api from "@/lib/api";

interface StartupItem {
  id: string;
  company_name: string;
  ceo_name: string;
  industry: string;
  stage: string;
  current_deal_stage: string;
  sourcing_channel: string;
  created_at: string;
}

interface ListResponse {
  data: StartupItem[];
  total: number;
  page: number;
  page_size: number;
}

const DEAL_STAGE_LABEL: Record<string, string> = {
  inbound: "유입",
  first_screening: "1차 스크리닝",
  deep_review: "심층검토",
  interview: "인터뷰",
  due_diligence: "기초실사",
  ic_pending: "IC 대기",
  ic_review: "IC 심사중",
  approved: "승인",
  conditional: "조건부",
  on_hold: "보류",
  rejected: "부결",
  contract: "계약",
  closed: "클로징",
  portfolio: "포트폴리오",
};

export default function StartupListPage() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchList = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), page_size: "20" });
      if (q) params.set("search", q);
      const res = await api.get<ListResponse>(`/startups/?${params}`);
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page, search);
  }, [page, search, fetchList]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList(1, search);
  }, [search, fetchList]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">스타트업 목록</h2>
        <Button size="sm" onClick={() => router.push("/startup/new")}>
          <Plus size={16} className="mr-1" />
          스타트업 등록
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          className="h-9 px-3 border border-slate-300 rounded-md text-sm flex-1 max-w-xs outline-none focus:border-blue-500"
          placeholder="기업명, CEO명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="outline" size="sm">
          <Search size={14} className="mr-1" />
          검색
        </Button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">기업명</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">대표</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">산업</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">단계</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">딜 상태</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">등록일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">로딩 중...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <Building2 size={24} className="mx-auto mb-2 text-slate-300" />
                  등록된 스타트업이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer"
                  onClick={() => router.push(`/startup/${s.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium text-blue-700">{s.company_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.ceo_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.industry}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.stage}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                      {DEAL_STAGE_LABEL[s.current_deal_stage] ?? s.current_deal_stage}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{s.created_at.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</Button>
          <span className="text-sm text-slate-500 leading-8">{page} / {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>다음</Button>
        </div>
      )}
    </div>
  );
}

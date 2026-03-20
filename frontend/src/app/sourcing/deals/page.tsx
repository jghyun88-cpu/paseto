"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2 } from "lucide-react";
import api from "@/lib/api";

interface DealItem {
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
  data: DealItem[];
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

const STAGE_COLOR: Record<string, string> = {
  inbound: "bg-gray-100 text-gray-700",
  first_screening: "bg-blue-100 text-blue-700",
  deep_review: "bg-indigo-100 text-indigo-700",
  interview: "bg-purple-100 text-purple-700",
  due_diligence: "bg-yellow-100 text-yellow-700",
  ic_pending: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  portfolio: "bg-emerald-100 text-emerald-700",
};

export default function SourcingDealsPage() {
  const [items, setItems] = useState<DealItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchList = useCallback(async (p: number, q: string, stage: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), page_size: "20" });
      if (q) params.set("search", q);
      if (stage) params.set("current_deal_stage", stage);
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
    fetchList(page, search, stageFilter);
  }, [page, search, stageFilter, fetchList]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">딜 목록</h1>
        <span className="text-sm text-gray-500">총 {total}건</span>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="기업명 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 pr-3 py-2 border rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 단계</option>
          {Object.entries(DEAL_STAGE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">딜이 없습니다</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">기업명</th>
                <th className="text-left px-4 py-3 font-medium">대표자</th>
                <th className="text-left px-4 py-3 font-medium">산업</th>
                <th className="text-left px-4 py-3 font-medium">단계</th>
                <th className="text-left px-4 py-3 font-medium">딜 상태</th>
                <th className="text-left px-4 py-3 font-medium">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/startup/${item.id}`)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {item.company_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.ceo_name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.industry}</td>
                  <td className="px-4 py-3 text-gray-600">{item.stage}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLOR[item.current_deal_stage] ?? "bg-gray-100 text-gray-700"}`}>
                      {DEAL_STAGE_LABEL[item.current_deal_stage] ?? item.current_deal_stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

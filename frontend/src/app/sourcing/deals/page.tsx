"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Plus, ClipboardCheck } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { DEAL_STAGE_LABEL, DEAL_STAGE_COLOR, CHANNEL_LABEL } from "@/lib/constants";
import { showError } from "@/lib/toast";

interface DealItem {
  id: string;
  company_name: string;
  one_liner: string;
  industry: string;
  stage: string;
  current_deal_stage: string;
  sourcing_channel: string;
  assigned_manager_id: string | null;
  assigned_manager_name: string | null;
  created_at: string;
}

interface ListResponse {
  data: DealItem[];
  total: number;
  page: number;
  page_size: number;
}

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
      params.set("has_deal_flow", "true");
      const res = await api.get<ListResponse>(`/startups/?${params}`);
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page, search, stageFilter);
  }, [page, search, stageFilter, fetchList]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">소싱 / CRM</h2>
        <Button size="sm" onClick={() => router.push("/sourcing/deals/new")}>
          <Plus size={16} className="mr-1" />
          딜 등록
        </Button>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-4 pr-10 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
        >
          <option value="">전체 상태</option>
          {Object.entries(DEAL_STAGE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">기업명</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">섹터</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">단계</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">발굴경로</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">발굴자</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">상태</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">등록일</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">딜이 없습니다.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/sourcing/deals/${item.id}`)}
                  className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <div>
                      <span className="font-medium text-blue-700 hover:underline">
                        {item.company_name}
                      </span>
                      {item.one_liner && (
                        <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                          {item.one_liner}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{item.industry || "-"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{item.stage || "-"}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {CHANNEL_LABEL[item.sourcing_channel] ?? item.sourcing_channel}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {item.assigned_manager_name || "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={DEAL_STAGE_COLOR[item.current_deal_stage] ?? "text-slate-500"}>
                      {DEAL_STAGE_LABEL[item.current_deal_stage] ?? item.current_deal_stage}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{fmtDate(item.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sourcing/screening/new?startup_id=${item.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                      title="1차 스크리닝"
                    >
                      <ClipboardCheck size={16} />
                      스크리닝
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 + 총 건수 */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-slate-500">총 {total}건</span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              이전
            </Button>
            <span className="text-sm text-slate-500 leading-8">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

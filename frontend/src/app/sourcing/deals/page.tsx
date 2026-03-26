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

interface ScreeningItem {
  id: string;
  startup_id: string;
}

export default function SourcingDealsPage() {
  const [items, setItems] = useState<DealItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [screenedIds, setScreenedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchList = useCallback(async (p: number, q: string, stage: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), page_size: "20" });
      if (q) params.set("search", q);
      if (stage) params.set("current_deal_stage", stage);
      params.set("has_deal_flow", "true");
      const res = await api.get<ListResponse>(`/startups/?${params}`);
      const deals = res.data.data;
      setItems(deals);
      setTotal(res.data.total);

      // 각 딜의 스크리닝 존재 여부 확인
      const results = await Promise.all(
        deals.map((d) =>
          api.get<ScreeningItem[]>(`/screenings/?startup_id=${d.id}`).catch(() => ({ data: [] as ScreeningItem[] }))
        )
      );
      const ids = new Set<string>();
      results.forEach((r, i) => {
        if (r.data.length > 0) ids.add(deals[i].id);
      });
      setScreenedIds(ids);
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
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">등록된 딜이 없습니다</p>
                  <p className="text-sm text-gray-500 mb-4">새 딜을 등록하여 파이프라인을 시작하세요.</p>
                  <button onClick={() => router.push("/sourcing/deals/new")} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">새 딜 등록</button>
                </td>
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
                    {screenedIds.has(item.id) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.alert("스크리닝 제출 완료했습니다.\n재작성하려면 스크리닝 이력에서 삭제 후 다시 진행해주세요.");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-slate-400 rounded-lg shadow-sm cursor-default"
                        title="스크리닝 완료"
                      >
                        <ClipboardCheck size={16} />
                        완료
                      </button>
                    ) : (
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
                    )}
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

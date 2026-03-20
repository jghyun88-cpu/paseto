"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";

interface ContractItem {
  id: string;
  startup_id: string;
  startup_name?: string;
  contract_type: string;
  status: string;
  amount: number | null;
  signed_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  ic_received: "IC접수",
  term_sheet: "조건협의",
  legal_review: "법률검토",
  signing: "서명중",
  disbursement: "집행",
  completed: "완료",
  post_filing: "사후등기",
};

const STATUS_COLORS: Record<string, string> = {
  ic_received: "bg-slate-100 text-slate-600",
  term_sheet: "bg-amber-100 text-amber-700",
  legal_review: "bg-purple-100 text-purple-700",
  signing: "bg-blue-100 text-blue-700",
  disbursement: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  post_filing: "bg-slate-200 text-slate-700",
};

const TYPE_LABELS: Record<string, string> = {
  investment: "투자계약",
  sha: "주주간계약",
  convertible: "전환사채",
  safe: "SAFE",
  mou: "MOU",
};

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만원`;
  return `${amount.toLocaleString()}원`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10).replace(/-/g, ".");
}

export default function ContractsPage() {
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/contracts/?page_size=100";
      if (filterStatus) url += `&status=${filterStatus}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get<{ data: ContractItem[] }>(url);
      setItems(res.data.data);
    } catch {
      /* 조회 실패 무시 */
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">계약 관리센터</h2>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="기업명 검색..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1">
          <button
            className={`px-3 py-1 text-xs rounded-full border ${!filterStatus ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
            onClick={() => setFilterStatus(null)}
          >
            전체
          </button>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <button
              key={k}
              className={`px-3 py-1 text-xs rounded-full border ${filterStatus === k ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
              onClick={() => setFilterStatus(k === filterStatus ? null : k)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">계약유형</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">금액</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">서명일</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">등록일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">
                  {c.startup_name ?? c.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2 px-3">{TYPE_LABELS[c.contract_type] ?? c.contract_type}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="py-2 px-3">{formatAmount(c.amount)}</td>
                <td className="py-2 px-3">{formatDate(c.signed_at)}</td>
                <td className="py-2 px-3">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">계약 데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

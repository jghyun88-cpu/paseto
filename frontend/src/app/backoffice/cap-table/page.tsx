"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";

interface CapTableEntry {
  id: string;
  startup_id: string;
  startup_name?: string;
  investor_name: string;
  share_type: string;
  share_count: number;
  share_price: number | null;
  ownership_pct: number | null;
  investment_date: string | null;
}

const SHARE_TYPE_LABELS: Record<string, string> = {
  common: "보통주",
  preferred: "우선주",
  convertible: "전환사채",
  safe: "SAFE",
  warrant: "신주인수권",
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

export default function CapTablePage() {
  const [items, setItems] = useState<CapTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      let url = "/cap-table/?page_size=200";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get<{ data: CapTableEntry[] }>(url);
      setItems(res.data.data);
    } catch {
      /* 조회 실패 무시 */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Cap Table</h2>
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="기업명 검색..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">투자자</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">주식유형</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">주식수</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">주당가격</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">지분율</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">투자일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">
                  {entry.startup_name ?? entry.startup_id?.slice(0, 8) ?? "-"}
                </td>
                <td className="py-2 px-3">{entry.investor_name}</td>
                <td className="py-2 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {SHARE_TYPE_LABELS[entry.share_type] ?? entry.share_type}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">{entry.share_count.toLocaleString()}</td>
                <td className="py-2 px-3 text-right">{formatAmount(entry.share_price)}</td>
                <td className="py-2 px-3 text-right">
                  {entry.ownership_pct !== null ? `${entry.ownership_pct.toFixed(2)}%` : "-"}
                </td>
                <td className="py-2 px-3">{formatDate(entry.investment_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">Cap Table 데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

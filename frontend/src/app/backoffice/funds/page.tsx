"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface FundItem {
  id: string;
  fund_name: string;
  total_size: number;
  committed: number | null;
  deployed: number | null;
  remaining: number | null;
  vintage_year: number | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  fundraising: "결성중",
  active: "운용중",
  harvesting: "회수기",
  closed: "청산",
};

const STATUS_COLORS: Record<string, string> = {
  fundraising: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  harvesting: "bg-blue-100 text-blue-700",
  closed: "bg-slate-100 text-slate-600",
};

function toEok(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  return `${(amount / 100000000).toFixed(1)}억`;
}

export default function FundsPage() {
  const [items, setItems] = useState<FundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: FundItem[] }>("/funds/?page_size=100");
      setItems(res.data.data);
    } catch {
      /* 조회 실패 무시 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAUM = items.reduce((sum, f) => sum + (f.total_size ?? 0), 0);
  const totalDeployed = items.reduce((sum, f) => sum + (f.deployed ?? 0), 0);
  const deployedRatio = totalAUM > 0 ? ((totalDeployed / totalAUM) * 100).toFixed(1) : "0";

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">조합 현황</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">조합 수</div>
          <div className="text-2xl font-bold text-slate-800">{items.length}개</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">총 AUM</div>
          <div className="text-2xl font-bold text-slate-800">{toEok(totalAUM)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">집행률</div>
          <div className="text-2xl font-bold text-blue-600">{deployedRatio}%</div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">조합명</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">결성규모</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">약정</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">집행</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">잔여</th>
              <th className="text-center py-2 px-3 text-slate-600 font-semibold">빈티지</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((fund) => (
              <tr key={fund.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">{fund.fund_name}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.total_size)}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.committed)}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.deployed)}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.remaining)}</td>
                <td className="py-2 px-3 text-center">{fund.vintage_year ?? "-"}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[fund.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[fund.status] ?? fund.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">조합 데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

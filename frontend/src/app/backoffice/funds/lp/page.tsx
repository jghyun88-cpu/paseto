"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface FundSummary {
  id: string;
  fund_name: string;
}

interface LPItem {
  id: string;
  fund_id: string;
  fund_name?: string;
  lp_name: string;
  commitment_amount: number;
  paid_in: number | null;
  ownership_pct: number | null;
}

function toEok(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
  return `${amount.toLocaleString()}원`;
}

export default function LPManagementPage() {
  const [funds, setFunds] = useState<FundSummary[]>([]);
  const [lpItems, setLpItems] = useState<LPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);

  const fetchFunds = useCallback(async () => {
    try {
      const res = await api.get<{ data: FundSummary[] }>("/funds/?page_size=100");
      setFunds(res.data.data);
    } catch {
      /* 조회 실패 무시 */
    }
  }, []);

  const fetchLPs = useCallback(async (fundId: string | null) => {
    setLoading(true);
    try {
      const url = fundId
        ? `/funds/${fundId}/lps?page_size=200`
        : "/fund-lps/?page_size=200";
      const res = await api.get<{ data: LPItem[] }>(url);
      setLpItems(res.data.data);
    } catch {
      setLpItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  useEffect(() => {
    fetchLPs(selectedFund);
  }, [selectedFund, fetchLPs]);

  const totalCommitment = lpItems.reduce((sum, lp) => sum + (lp.commitment_amount ?? 0), 0);
  const totalPaidIn = lpItems.reduce((sum, lp) => sum + (lp.paid_in ?? 0), 0);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">LP 관리</h2>

      {/* 조합 필터 */}
      <div className="flex gap-1 mb-4">
        <button
          className={`px-3 py-1 text-xs rounded-full border ${!selectedFund ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
          onClick={() => setSelectedFund(null)}
        >
          전체
        </button>
        {funds.map((f) => (
          <button
            key={f.id}
            className={`px-3 py-1 text-xs rounded-full border ${selectedFund === f.id ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`}
            onClick={() => setSelectedFund(f.id === selectedFund ? null : f.id)}
          >
            {f.fund_name}
          </button>
        ))}
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">LP 수</div>
          <div className="text-2xl font-bold text-slate-800">{lpItems.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">총 약정</div>
          <div className="text-2xl font-bold text-slate-800">{toEok(totalCommitment)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-sm text-slate-500">납입 완료</div>
          <div className="text-2xl font-bold text-green-600">{toEok(totalPaidIn)}</div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">로딩 중...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold">조합명</th>
                <th className="text-left py-2 px-3 text-slate-600 font-semibold">LP명</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">약정금액</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">납입금액</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">지분율</th>
              </tr>
            </thead>
            <tbody>
              {lpItems.map((lp) => (
                <tr key={lp.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-800">
                    {lp.fund_name ?? funds.find((f) => f.id === lp.fund_id)?.fund_name ?? "-"}
                  </td>
                  <td className="py-2 px-3">{lp.lp_name}</td>
                  <td className="py-2 px-3 text-right">{toEok(lp.commitment_amount)}</td>
                  <td className="py-2 px-3 text-right">{toEok(lp.paid_in)}</td>
                  <td className="py-2 px-3 text-right">
                    {lp.ownership_pct !== null ? `${lp.ownership_pct.toFixed(2)}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lpItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">LP 데이터가 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

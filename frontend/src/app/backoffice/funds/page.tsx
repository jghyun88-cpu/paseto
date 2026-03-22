"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface FundItem {
  id: string;
  fund_code: string | null;
  fund_name: string;
  total_amount: number;
  committed_amount: number;
  deployed_amount: number;
  remaining_amount: number;
  formation_date: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  forming: "결성중",
  active: "운용중",
  winding_down: "회수기",
  dissolved: "청산",
};

const STATUS_COLORS: Record<string, string> = {
  forming: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  winding_down: "bg-blue-100 text-blue-700",
  dissolved: "bg-slate-100 text-slate-600",
};

function toEok(amount: number | null): string {
  if (amount === null || amount === undefined || amount === 0) return "-";
  return `${(amount / 100_000_000).toFixed(1)}억`;
}

export default function FundsPage() {
  const router = useRouter();
  const [items, setItems] = useState<FundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/funds/");
      const data = Array.isArray(res.data) ? res.data : res.data.data ?? [];
      setItems(data);
    } catch {
      /* 조회 실패 무시 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAUM = items.reduce((sum, f) => sum + (f.total_amount ?? 0), 0);
  const totalDeployed = items.reduce((sum, f) => sum + (f.deployed_amount ?? 0), 0);
  const deployedRatio = totalAUM > 0 ? ((totalDeployed / totalAUM) * 100).toFixed(1) : "0";

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">조합 현황</h2>
        <Button size="sm" onClick={() => router.push("/backoffice/funds/new")}>
          <Plus size={16} className="mr-1" />
          조합 등록
        </Button>
      </div>

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
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">조합코드</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">조합명</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">결성규모</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">약정</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">집행</th>
              <th className="text-right py-2 px-3 text-slate-600 font-semibold">잔여</th>
              <th className="text-center py-2 px-3 text-slate-600 font-semibold">결성일</th>
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((fund) => (
              <tr key={fund.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/backoffice/funds/${fund.id}`)}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-sm"
                  >
                    {fund.fund_code ?? "-"}
                  </button>
                </td>
                <td className="py-2 px-3 font-medium text-slate-800">{fund.fund_name}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.total_amount)}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.committed_amount)}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.deployed_amount)}</td>
                <td className="py-2 px-3 text-right">{toEok(fund.remaining_amount)}</td>
                <td className="py-2 px-3 text-center text-slate-500">
                  {fmtDate(fund.formation_date)}
                </td>
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

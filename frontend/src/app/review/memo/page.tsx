"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface MemoItem {
  id: string;
  startup_name?: string;
  startup_id?: string;
  title: string;
  overall_recommendation?: string;
  created_at: string;
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_invest: "적극 투자",
  invest: "투자",
  conditional: "조건부",
  hold: "보류",
  pass: "패스",
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  strong_invest: "bg-green-100 text-green-700",
  invest: "bg-emerald-100 text-emerald-700",
  conditional: "bg-yellow-100 text-yellow-700",
  hold: "bg-slate-100 text-slate-600",
  pass: "bg-red-100 text-red-700",
};

export default function InvestmentMemoListPage() {
  const router = useRouter();
  const [items, setItems] = useState<MemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/investment-memos/");
        const body = res.data;
        if (Array.isArray(body)) {
          setItems(body);
        } else if (body.data && Array.isArray(body.data)) {
          setItems(body.data);
        } else {
          setItems([]);
        }
      } catch {
        setError("투자메모를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">불러오는 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">투자메모 목록</h2>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">제목</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">종합 의견</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">작성일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push("/review/memo/new")}
              >
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  {item.startup_name ?? item.startup_id ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{item.title}</td>
                <td className="py-2.5 px-3">
                  {item.overall_recommendation ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${RECOMMENDATION_COLORS[item.overall_recommendation] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {RECOMMENDATION_LABELS[item.overall_recommendation] ?? item.overall_recommendation}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !error && (
          <div className="p-8 text-center text-slate-400 text-sm">데이터가 없습니다</div>
        )}
      </div>
    </div>
  );
}

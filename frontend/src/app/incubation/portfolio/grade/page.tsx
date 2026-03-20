"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface StartupItem {
  id: string;
  company_name: string;
  portfolio_grade: string | null;
  industry: string;
  stage: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-red-100 text-red-700",
};

export default function PortfolioGradePage() {
  const router = useRouter();
  const [startups, setStartups] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: StartupItem[] }>(
        "/startups/?is_portfolio=true&page_size=200"
      );
      setStartups(res.data.data ?? []);
    } catch {
      setStartups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">등급 관리</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">기업명</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">등급</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">산업</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">스테이지</th>
            </tr>
          </thead>
          <tbody>
            {startups.map((s) => (
              <tr
                key={s.id}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push(`/startup/${s.id}`)}
              >
                <td className="py-2.5 px-3 font-medium text-slate-800">{s.company_name}</td>
                <td className="py-2.5 px-3">
                  {s.portfolio_grade ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        GRADE_COLORS[s.portfolio_grade] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.portfolio_grade}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">미설정</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-600">{s.industry || "-"}</td>
                <td className="py-2.5 px-3 text-slate-600">{s.stage || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {startups.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            포트폴리오 기업이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

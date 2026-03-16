"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface ScreeningItem {
  id: string;
  startup_id: string;
  overall_score: number;
  recommendation: string;
  risk_notes: string | null;
  created_at: string;
}

interface StartupMap {
  [id: string]: string;
}

const REC_BADGE: Record<string, { label: string; cls: string }> = {
  pass: { label: "Pass (A)", cls: "bg-green-100 text-green-700" },
  review: { label: "Review (B)", cls: "bg-amber-100 text-amber-700" },
  reject: { label: "Reject (C/D)", cls: "bg-red-100 text-red-700" },
};

export default function ScreeningListPage() {
  const router = useRouter();
  const [items, setItems] = useState<ScreeningItem[]>([]);
  const [startups, setStartups] = useState<StartupMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sRes] = await Promise.all([
          api.get<{ data: { id: string; company_name: string }[] }>("/startups/?page_size=200"),
        ]);
        const map: StartupMap = {};
        for (const s of sRes.data.data) {
          map[s.id] = s.company_name;

          const scRes = await api.get<ScreeningItem[]>(`/screenings/?startup_id=${s.id}`);
          setItems((prev) => [...prev, ...scRes.data.filter((sc) => !prev.some((p) => p.id === sc.id))]);
        }
        setStartups(map);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">스크리닝 이력</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">기업명</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">총점</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">등급</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">핵심 리스크</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">검토일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">스크리닝 이력이 없습니다.</td></tr>
            ) : (
              items.map((sc) => {
                const badge = REC_BADGE[sc.recommendation] ?? REC_BADGE.review;
                return (
                  <tr key={sc.id} className="border-b border-slate-100 hover:bg-blue-50/50">
                    <td className="px-4 py-2.5 font-medium text-blue-700 cursor-pointer" onClick={() => router.push(`/startup/${sc.startup_id}`)}>
                      {startups[sc.startup_id] ?? sc.startup_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5 font-bold">{sc.overall_score}/35</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">{sc.risk_notes ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{sc.created_at.slice(0, 10)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

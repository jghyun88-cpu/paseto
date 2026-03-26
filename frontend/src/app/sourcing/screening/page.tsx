"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { showError } from "@/lib/toast";

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
        // 딜플로우가 있는 스타트업만 조회
        const sRes = await api.get<{ data: { id: string; company_name: string }[] }>(
          "/startups/?page_size=100&has_deal_flow=true"
        );
        const startupList = sRes.data.data ?? [];
        const map: StartupMap = {};
        for (const s of startupList) {
          map[s.id] = s.company_name;
        }
        setStartups(map);

        // 각 스타트업의 스크리닝을 병렬 조회
        const results = await Promise.all(
          startupList.map((s) =>
            api.get<ScreeningItem[]>(`/screenings/?startup_id=${s.id}`).catch(() => ({ data: [] as ScreeningItem[] }))
          )
        );
        const allScreenings = results.flatMap((r) => r.data);
        allScreenings.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setItems(allScreenings);
      } catch {
        showError("데이터를 불러오는 데 실패했습니다.");
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
              <th className="px-4 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-lg font-semibold text-gray-900 mb-1">스크리닝 이력이 없습니다</p>
                <p className="text-sm text-gray-500">딜 상세에서 스크리닝을 시작할 수 있습니다.</p>
              </td></tr>
            ) : (
              items.map((sc) => {
                const badge = REC_BADGE[sc.recommendation] ?? REC_BADGE.review;
                return (
                  <tr
                    key={sc.id}
                    className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer"
                    onClick={() => router.push(`/sourcing/screening/${sc.id}`)}
                  >
                    <td className="px-4 py-2.5 font-medium text-blue-700">
                      {startups[sc.startup_id] ?? sc.startup_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5 font-bold">{sc.overall_score}/35</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">{sc.risk_notes ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{fmtDate(sc.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm("이 스크리닝을 삭제하시겠습니까?")) return;
                          try {
                            await api.delete(`/screenings/${sc.id}`);
                            setItems((prev) => prev.filter((p) => p.id !== sc.id));
                          } catch {
                            showError("삭제에 실패했습니다.");
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface IncubationItem {
  id: string;
  startup_id: string;
  assigned_pm_id: string;
  portfolio_grade: string;
  status: string;
  crisis_flags: Record<string, boolean> | null;
  growth_bottleneck: string | null;
  created_at: string;
}

interface StartupInfo {
  id: string;
  company_name: string;
  industry: string;
}

interface PortfolioCardData extends IncubationItem {
  company_name: string;
  industry: string;
}

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-emerald-100", text: "text-emerald-700" },
  B: { bg: "bg-blue-100", text: "text-blue-700" },
  C: { bg: "bg-amber-100", text: "text-amber-700" },
  D: { bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_LABELS: Record<string, string> = {
  onboarding: "온보딩",
  active: "활성",
  graduated: "졸업",
  paused: "일시중지",
};

export default function IncubationPage() {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/incubations/?page_size=100";
      if (filterGrade) url += `&grade=${filterGrade}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const res = await api.get<{ data: IncubationItem[] }>(url);
      const incubations = res.data.data;

      const startupIds = [...new Set(incubations.map((i) => i.startup_id))];
      const startupMap: Record<string, StartupInfo> = {};
      for (const sid of startupIds) {
        try {
          const sRes = await api.get<StartupInfo>(`/startups/${sid}`);
          startupMap[sid] = sRes.data;
        } catch {
          showError("스타트업 정보를 불러오는 데 실패했습니다.");
        }
      }

      const merged = incubations.map((inc) => ({
        ...inc,
        company_name: startupMap[inc.startup_id]?.company_name ?? "알 수 없음",
        industry: startupMap[inc.startup_id]?.industry ?? "",
      }));
      setItems(merged);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [filterGrade, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasCrisis = (flags: Record<string, boolean> | null) =>
    flags ? Object.values(flags).some(Boolean) : false;

  const gradeCount = (grade: string) => items.filter((i) => i.portfolio_grade === grade).length;
  const crisisCount = items.filter((i) => hasCrisis(i.crisis_flags)).length;

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">포트폴리오 대시보드</h2>
        <Button size="sm" onClick={() => router.push("/incubation/onboarding/new")}>
          <Plus size={16} className="mr-1" /> 온보딩
        </Button>
      </div>

      {/* 요약 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <SummaryBadge label="전체" count={items.length} active={!filterGrade} onClick={() => setFilterGrade(null)} />
        {["A", "B", "C", "D"].map((g) => (
          <SummaryBadge key={g} label={g} count={gradeCount(g)} active={filterGrade === g} onClick={() => setFilterGrade(g === filterGrade ? null : g)} />
        ))}
        <SummaryBadge label="위기" count={crisisCount} active={false} onClick={() => {}} variant="danger" />
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-1 mb-5">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterStatus === key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
            onClick={() => setFilterStatus(key === filterStatus ? null : key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/incubation/${item.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${GRADE_COLORS[item.portfolio_grade]?.bg ?? "bg-slate-100"} ${GRADE_COLORS[item.portfolio_grade]?.text ?? "text-slate-700"}`}>
                  {item.portfolio_grade}
                </span>
                <span className="text-sm font-bold text-slate-800">{item.company_name}</span>
              </div>
              {hasCrisis(item.crisis_flags) && (
                <AlertTriangle size={16} className="text-red-500" />
              )}
            </div>
            {item.industry && (
              <p className="text-xs text-slate-500 mb-2">{item.industry}</p>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{STATUS_LABELS[item.status] ?? item.status}</span>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          <p className="text-sm">포트폴리오 기업이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

function SummaryBadge({ label, count, active, onClick, variant }: {
  label: string; count: number; active: boolean; onClick: () => void; variant?: string;
}) {
  const base = variant === "danger"
    ? "bg-red-50 text-red-700 border-red-200"
    : active
      ? "bg-blue-100 text-blue-700 border-blue-300"
      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

  return (
    <button className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${base} transition-colors`} onClick={onClick}>
      {label} <span className="ml-1 font-bold">{count}</span>
    </button>
  );
}

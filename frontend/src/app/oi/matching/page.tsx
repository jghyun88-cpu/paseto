"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface DemandItem {
  id: string;
  partner_company: string;
  demand_type: string;
  description: string;
  required_industry?: string;
  candidate_startups: { startup_id: string; fit_reason: string }[] | null;
}

interface StartupItem {
  id: string;
  company_name: string;
  industry: string;
}

const TYPE_LABELS: Record<string, string> = {
  tech_adoption: "기술도입",
  joint_dev: "공동개발",
  vendor: "벤더발굴",
  new_biz: "신규사업",
  strategic_invest: "전략투자",
};

function matchStartups(demand: DemandItem, startups: StartupItem[]): StartupItem[] {
  const keywords = [
    demand.required_industry,
    demand.demand_type,
    demand.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return startups.filter((s) => {
    const industry = (s.industry ?? "").toLowerCase();
    return keywords.includes(industry) || industry.split(",").some((k) => keywords.includes(k.trim()));
  });
}

export default function MatchingPage() {
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [startups, setStartups] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, sRes] = await Promise.all([
        api.get<{ data: DemandItem[] }>("/partner-demands/?page_size=100"),
        api.get<{ data: StartupItem[] }>("/startups/?is_portfolio=true&page_size=200"),
      ]);
      setDemands(dRes.data.data);
      setStartups(sRes.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">매칭 엔진</h2>
        <span className="text-xs text-slate-500">
          수요 {demands.length}건 / 포트폴리오 {startups.length}개사
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">수요기업</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">수요유형</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">산업분야</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">매칭 스타트업</th>
            </tr>
          </thead>
          <tbody>
            {demands.map((d) => {
              const matched = matchStartups(d, startups);
              return (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{d.partner_company}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {TYPE_LABELS[d.demand_type] ?? d.demand_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {d.required_industry ?? "-"}
                  </td>
                  <td className="py-2.5 px-3">
                    {matched.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {matched.slice(0, 5).map((s) => (
                          <span
                            key={s.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                          >
                            {s.company_name}
                          </span>
                        ))}
                        {matched.length > 5 && (
                          <span className="text-xs text-slate-400">+{matched.length - 5}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">매칭 없음</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {demands.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            파트너 수요가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

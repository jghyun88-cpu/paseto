"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface DealPipeline {
  total: number;
  in_screening: number;
  in_contract: number;
  portfolio: number;
}

interface DashboardData {
  deal_pipeline: DealPipeline;
  monthly_sourcing: number;
  portfolio_metrics: { total_startups: number; grade_a_ratio: number };
  crisis_alerts: { startup_id: string; company_name: string; crisis_type: string; severity: string }[];
  unacknowledged_handovers: number;
  recent_handovers: {
    id: string;
    content: { company_overview?: { name: string } };
    from_team: string;
    to_team: string;
    created_at: string;
    acknowledged_at: string | null;
  }[];
  upcoming_meetings: { id: string; title: string; scheduled_at: string }[];
}

const CRISIS_LABELS: Record<string, string> = {
  cash_depletion: "현금 고갈 위험",
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard/executive")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const dp = data?.deal_pipeline;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">전사 대시보드</h2>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="파이프라인 딜 수"
          value={loading ? "-" : String(dp?.total ?? 0)}
          unit="건"
          color="#3182ce"
        />
        <KpiCard
          title="이번 달 신규 소싱"
          value={loading ? "-" : String(data?.monthly_sourcing ?? 0)}
          unit="건"
          color="#38a169"
        />
        <KpiCard
          title="포트폴리오 기업"
          value={loading ? "-" : String(dp?.portfolio ?? 0)}
          unit="사"
          color="#d69e2e"
        />
        <KpiCard
          title="미확인 인계"
          value={loading ? "-" : String(data?.unacknowledged_handovers ?? 0)}
          unit="건"
          color="#e53e3e"
        />
      </div>

      {/* 딜플로우 현황 + 긴급 알림 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <DashSection title="딜플로우 현황">
          {loading ? (
            <p className="text-slate-400 text-sm">로딩 중...</p>
          ) : dp ? (
            <div className="space-y-2">
              <PipelineBar label="심사 진행" count={dp.in_screening} total={dp.total} color="bg-blue-500" />
              <PipelineBar label="계약 진행" count={dp.in_contract} total={dp.total} color="bg-amber-500" />
              <PipelineBar label="포트폴리오" count={dp.portfolio} total={dp.total} color="bg-green-500" />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">데이터를 불러올 수 없습니다.</p>
          )}
        </DashSection>

        <DashSection title="긴급 알림">
          {loading ? (
            <p className="text-slate-400 text-sm">로딩 중...</p>
          ) : data?.crisis_alerts && data.crisis_alerts.length > 0 ? (
            <ul className="space-y-1.5">
              {data.crisis_alerts.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium">{a.company_name}</span>
                  <span className="text-slate-500">— {CRISIS_LABELS[a.crisis_type] ?? a.crisis_type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-600 text-sm">현재 긴급 알림이 없습니다.</p>
          )}
          {data && data.unacknowledged_handovers > 0 && (
            <div className="mt-3 px-3 py-2 bg-amber-50 rounded text-sm text-amber-700">
              미확인 인계 {data.unacknowledged_handovers}건이 있습니다.
            </div>
          )}
        </DashSection>
      </div>

      {/* 최근 인계 + 최근 활동 */}
      <div className="grid grid-cols-2 gap-4">
        <DashSection title="최근 인계">
          {loading ? (
            <p className="text-slate-400 text-sm">로딩 중...</p>
          ) : data?.recent_handovers && data.recent_handovers.length > 0 ? (
            <ul className="space-y-1.5">
              {data.recent_handovers.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{h.content.company_overview?.name ?? "-"}</span>
                    <span className="text-slate-400 ml-2">{h.from_team} → {h.to_team}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{fmtDate(h.created_at)}</span>
                    {h.acknowledged_at ? (
                      <span className="text-xs text-green-600">확인됨</span>
                    ) : (
                      <span className="text-xs text-amber-600">대기</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">최근 인계 이력이 없습니다.</p>
          )}
        </DashSection>

        <DashSection title="예정 회의">
          {loading ? (
            <p className="text-slate-400 text-sm">로딩 중...</p>
          ) : data?.upcoming_meetings && data.upcoming_meetings.length > 0 ? (
            <ul className="space-y-1.5">
              {data.upcoming_meetings.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.title}</span>
                  <span className="text-slate-400 text-xs">{fmtDate(m.scheduled_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">예정된 회의가 없습니다.</p>
          )}
        </DashSection>
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, color }: { title: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-white rounded-lg px-5 py-4 shadow-sm" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-xs text-slate-500 mb-2">{title}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold" style={{ color }}>{value}</span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function PipelineBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-slate-600 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="w-8 text-right font-bold text-slate-700">{count}</span>
    </div>
  );
}

function DashSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 min-h-[140px]">
      <div className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">{title}</div>
      {children}
    </div>
  );
}

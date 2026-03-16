"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, ArrowRightLeft, BarChart3 } from "lucide-react";
import api from "@/lib/api";

interface DashboardData {
  deal_pipeline: { total: number; in_screening: number; in_contract: number; portfolio: number };
  portfolio_metrics: { total_startups: number; grade_a_ratio: number; follow_on_rate: number };
  crisis_alerts: { startup_id: string; company_name: string; crisis_type: string; severity: string }[];
  unacknowledged_handovers: number;
  upcoming_meetings: { id: string; meeting_type: string; title: string; scheduled_at: string }[];
  recent_handovers: { id: string; from_team: string; to_team: string; acknowledged_by: string | null; created_at: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<DashboardData>("/dashboard/executive");
      setData(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!data) return <div className="p-8 text-center text-slate-400">대시보드를 불러올 수 없습니다.</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">eLSA 전사 대시보드</h2>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KPICard icon={<BarChart3 size={18} />} label="파이프라인" value={data.deal_pipeline.total} sub={`심사중 ${data.deal_pipeline.in_screening}`} />
        <KPICard icon={<BarChart3 size={18} />} label="포트폴리오" value={data.portfolio_metrics.total_startups} sub={`A등급 ${Math.round(data.portfolio_metrics.grade_a_ratio * 100)}%`} />
        <KPICard icon={<ArrowRightLeft size={18} />} label="미확인 인계" value={data.unacknowledged_handovers} sub="24h 내 확인 필요" variant={data.unacknowledged_handovers > 0 ? "warning" : "default"} />
        <KPICard icon={<AlertTriangle size={18} />} label="위기 기업" value={data.crisis_alerts.length} sub="즉시 대응 필요" variant={data.crisis_alerts.length > 0 ? "danger" : "default"} />
      </div>

      {/* 위기 알림 */}
      {data.crisis_alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {data.crisis_alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} />
              <span className="font-semibold">{a.company_name}</span>
              <span>{a.crisis_type === "cash_depletion" ? "현금고갈 위험" : a.crisis_type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이번 주 회의 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">예정 회의</h3>
          </div>
          {data.upcoming_meetings.length > 0 ? (
            <div className="space-y-2">
              {data.upcoming_meetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded" onClick={() => router.push(`/meetings/${m.id}`)}>
                  <span className="text-slate-800">{m.title}</span>
                  <span className="text-xs text-slate-500">{new Date(m.scheduled_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">예정된 회의가 없습니다.</p>
          )}
        </div>

        {/* 최근 인계 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">최근 인계</h3>
          </div>
          {data.recent_handovers.length > 0 ? (
            <div className="space-y-2">
              {data.recent_handovers.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-800">{h.from_team} → {h.to_team}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${h.acknowledged_by ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {h.acknowledged_by ? "확인됨" : "대기중"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">최근 인계가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, variant }: {
  icon: React.ReactNode; label: string; value: number; sub: string; variant?: string;
}) {
  const bg = variant === "danger" ? "bg-red-50 border-red-200" : variant === "warning" ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200";
  return (
    <div className={`rounded-lg shadow-sm border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-1 text-slate-500">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

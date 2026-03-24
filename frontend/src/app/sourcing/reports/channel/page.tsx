"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface ChannelStat {
  channel: string;
  count: number;
}

const CHANNEL_LABELS: Record<string, string> = {
  university_lab: "대학/연구소",
  corporate_oi: "대기업 OI",
  competition_forum: "경진대회/포럼",
  portfolio_referral: "포트폴리오 추천",
  vc_cvc_angel: "VC/CVC/엔젤",
  online_application: "온라인 모집",
  direct_outreach: "직접 발굴",
  public_program: "공공 프로그램",
  tech_expo: "기술 박람회",
  other: "기타",
};

export default function ChannelAnalysisPage() {
  const [stats, setStats] = useState<ChannelStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: Array<{ sourcing_channel: string }> }>("/startups/?page_size=200");
        const channels: Record<string, number> = {};
        for (const s of res.data.data) {
          const ch = (s.sourcing_channel || "other").toLowerCase();
          channels[ch] = (channels[ch] || 0) + 1;
        }
        setStats(
          Object.entries(channels)
            .map(([channel, count]) => ({ channel, count }))
            .sort((a, b) => b.count - a.count)
        );
      } catch {
        showError("데이터를 불러오는 데 실패했습니다.");
        setStats([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = stats.reduce((s, c) => s + c.count, 0);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">채널별 분석</h1>
      <p className="text-sm text-gray-500">소싱 채널별 딜 유입 현황을 분석합니다.</p>

      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : stats.length === 0 ? (
        <div className="text-center py-20 text-gray-400">데이터가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {stats.map((s) => {
            const pct = total > 0 ? (s.count / total) * 100 : 0;
            return (
              <div key={s.channel} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-700 shrink-0">
                  {CHANNEL_LABELS[s.channel] ?? s.channel}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  >
                    <span className="text-xs text-white font-medium">{s.count}</span>
                  </div>
                </div>
                <span className="w-12 text-right text-sm text-gray-500">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
          <div className="pt-2 text-sm text-gray-500">총 {total}건</div>
        </div>
      )}
    </div>
  );
}

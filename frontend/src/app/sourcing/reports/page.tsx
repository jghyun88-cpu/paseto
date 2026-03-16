"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "@/lib/api";

const CHANNEL_LABEL: Record<string, string> = {
  university_lab: "대학/연구소",
  corporate_oi: "대기업 OI",
  portfolio_referral: "포트폴리오 추천",
  vc_cvc_angel: "VC/CVC/엔젤",
  public_program: "공공기관",
  competition_forum: "경진대회/포럼",
  online_application: "온라인 모집",
  direct_outreach: "직접 발굴",
  tech_expo: "기술전시회",
};

const STAGE_LABEL: Record<string, string> = {
  inbound: "유입",
  first_screening: "1차 스크리닝",
  deep_review: "심층검토",
  interview: "인터뷰",
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

interface StartupItem {
  sourcing_channel: string;
  current_deal_stage: string;
  industry: string;
}

export default function SourcingReportsPage() {
  const [channelData, setChannelData] = useState<{ name: string; count: number }[]>([]);
  const [stageData, setStageData] = useState<{ name: string; value: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get<{ data: StartupItem[]; total: number }>("/startups/?page_size=500")
      .then((res) => {
        const startups = res.data.data;
        setTotal(res.data.total);

        // 채널별 집계
        const channelMap: Record<string, number> = {};
        for (const s of startups) {
          const ch = s.sourcing_channel;
          channelMap[ch] = (channelMap[ch] ?? 0) + 1;
        }
        setChannelData(
          Object.entries(channelMap)
            .map(([k, v]) => ({ name: CHANNEL_LABEL[k] ?? k, count: v }))
            .sort((a, b) => b.count - a.count),
        );

        // 단계별 집계
        const stageMap: Record<string, number> = {};
        for (const s of startups) {
          const st = s.current_deal_stage;
          stageMap[st] = (stageMap[st] ?? 0) + 1;
        }
        setStageData(
          Object.entries(stageMap).map(([k, v]) => ({
            name: STAGE_LABEL[k] ?? k,
            value: v,
          })),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4">소싱 분석 리포트</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="총 딜 수" value={total} />
        <StatCard label="소싱 채널" value={channelData.length} />
        <StatCard label="단계 분포" value={stageData.length} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 채널별 유입 차트 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">채널별 유입 건수</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={channelData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 단계별 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">딜 단계별 분포</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stageData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} (${value})`}
              >
                {stageData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
    </div>
  );
}

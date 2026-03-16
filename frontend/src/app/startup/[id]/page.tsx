"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  User,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  Tag,
  Briefcase,
} from "lucide-react";
import api from "@/lib/api";

interface StartupDetail {
  id: string;
  company_name: string;
  corporate_number: string | null;
  ceo_name: string;
  industry: string;
  stage: string;
  one_liner: string;
  problem_definition: string | null;
  solution_description: string | null;
  team_size: number | null;
  is_fulltime: boolean;
  sourcing_channel: string;
  referrer: string | null;
  current_deal_stage: string;
  portfolio_grade: string | null;
  is_portfolio: boolean;
  founded_date: string | null;
  location: string | null;
  main_customer: string | null;
  current_traction: string | null;
  current_revenue: number | null;
  current_employees: number | null;
  first_meeting_date: string | null;
  batch_id: string | null;
  assigned_manager_id: string | null;
  invested_at: string | null;
  created_at: string;
  updated_at: string;
}

const DEAL_STAGE_LABEL: Record<string, string> = {
  inbound: "유입",
  first_screening: "1차 스크리닝",
  deep_review: "심층검토",
  interview: "인터뷰",
  due_diligence: "기초실사",
  ic_pending: "IC 대기",
  ic_review: "IC 심사중",
  approved: "승인",
  conditional: "조건부",
  on_hold: "보류",
  rejected: "부결",
  contract: "계약",
  closed: "클로징",
  portfolio: "포트폴리오",
};

const CHANNEL_LABEL: Record<string, string> = {
  university_lab: "대학/연구소",
  corporate_oi: "대기업 OI",
  portfolio_referral: "포트폴리오 추천",
  vc_cvc_angel: "VC/CVC/엔젤",
  public_program: "공공기관",
  competition_forum: "경진대회/포럼",
  online_application: "온라인 상시모집",
  direct_outreach: "직접 발굴",
  tech_expo: "기술전시회",
};

/** 마스터 §28: 기업 통합 프로필 — Phase 1은 overview 탭만 구현 */
const TABS = [
  { id: "overview", label: "개요" },
  { id: "pipeline", label: "파이프라인" },
  { id: "screening", label: "스크리닝" },
  { id: "review", label: "심사" },
  { id: "investment", label: "투자" },
  { id: "incubation", label: "보육" },
  { id: "oi", label: "OI" },
  { id: "follow-on", label: "후속투자" },
  { id: "exit", label: "회수" },
  { id: "government", label: "정부사업" },
  { id: "documents", label: "문서" },
  { id: "timeline", label: "타임라인" },
  { id: "handovers", label: "인계" },
];

export default function StartupProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [startup, setStartup] = useState<StartupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!params.id) return;
    api
      .get<StartupDetail>(`/startups/${params.id}`)
      .then((res) => setStartup(res.data))
      .catch(() => router.push("/startup"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  if (!startup) {
    return <div className="p-8 text-center text-slate-400">스타트업을 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/startup")}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800">{startup.company_name}</h2>
          <p className="text-sm text-slate-500">{startup.one_liner}</p>
        </div>
        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
          {DEAL_STAGE_LABEL[startup.current_deal_stage] ?? startup.current_deal_stage}
        </span>
        {startup.portfolio_grade && (
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
            등급 {startup.portfolio_grade}
          </span>
        )}
      </div>

      {/* 탭 네비게이션 — §28 13개 탭 */}
      <div className="flex gap-0 border-b border-slate-200 mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview 탭 내용 */}
      {activeTab === "overview" ? (
        <div className="grid grid-cols-2 gap-4">
          {/* 기본 정보 */}
          <InfoCard title="기본 정보">
            <InfoRow icon={<Building2 size={14} />} label="기업명" value={startup.company_name} />
            <InfoRow icon={<User size={14} />} label="대표" value={startup.ceo_name} />
            <InfoRow icon={<Tag size={14} />} label="산업" value={startup.industry} />
            <InfoRow icon={<TrendingUp size={14} />} label="단계" value={startup.stage} />
            <InfoRow icon={<MapPin size={14} />} label="소재지" value={startup.location ?? "-"} />
            <InfoRow icon={<Calendar size={14} />} label="설립일" value={startup.founded_date ?? "-"} />
            {startup.corporate_number && (
              <InfoRow icon={<Briefcase size={14} />} label="법인번호" value={startup.corporate_number} />
            )}
          </InfoCard>

          {/* 팀 & 현황 */}
          <InfoCard title="팀 & 현황">
            <InfoRow icon={<Users size={14} />} label="팀 규모" value={startup.team_size ? `${startup.team_size}명` : "-"} />
            <InfoRow label="전일제" value={startup.is_fulltime ? "예" : "아니오"} />
            <InfoRow label="현재 인원" value={startup.current_employees ? `${startup.current_employees}명` : "-"} />
            <InfoRow label="현재 매출" value={startup.current_revenue ? `${startup.current_revenue.toLocaleString()}원` : "-"} />
            <InfoRow label="주요 고객" value={startup.main_customer ?? "-"} />
          </InfoCard>

          {/* 소싱 정보 */}
          <InfoCard title="소싱 정보">
            <InfoRow label="소싱 채널" value={CHANNEL_LABEL[startup.sourcing_channel] ?? startup.sourcing_channel} />
            <InfoRow label="추천인" value={startup.referrer ?? "-"} />
            <InfoRow label="1차 미팅" value={startup.first_meeting_date ?? "-"} />
            <InfoRow label="등록일" value={startup.created_at.slice(0, 10)} />
          </InfoCard>

          {/* 사업 설명 */}
          <InfoCard title="사업 설명">
            {startup.problem_definition && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">해결 과제</p>
                <p className="text-sm text-slate-700">{startup.problem_definition}</p>
              </div>
            )}
            {startup.solution_description && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">솔루션</p>
                <p className="text-sm text-slate-700">{startup.solution_description}</p>
              </div>
            )}
            {startup.current_traction && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">현재 성과</p>
                <p className="text-sm text-slate-700">{startup.current_traction}</p>
              </div>
            )}
            {!startup.problem_definition && !startup.solution_description && !startup.current_traction && (
              <p className="text-sm text-slate-400">등록된 사업 설명이 없습니다.</p>
            )}
          </InfoCard>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          <p className="text-sm">{TABS.find((t) => t.id === activeTab)?.label} 탭은 다음 Phase에서 구현됩니다.</p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center text-sm">
      {icon && <span className="text-slate-400 mr-2">{icon}</span>}
      <span className="text-slate-500 w-20 shrink-0">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

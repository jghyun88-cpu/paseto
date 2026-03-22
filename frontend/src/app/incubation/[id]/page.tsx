"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError } from "@/lib/toast";
import DocumentsTab from "@/components/DocumentsTab";

const TABS = [
  { id: "overview", label: "개요" },
  { id: "documents", label: "문서" },
  { id: "action-plan", label: "90일 액션플랜", href: "action-plan" },
  { id: "mentoring", label: "멘토링", href: "mentoring" },
  { id: "kpi", label: "KPI", href: "kpi" },
  { id: "investor-meetings", label: "투자자 미팅", href: "investor-meetings" },
];

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-emerald-100", text: "text-emerald-700" },
  B: { bg: "bg-blue-100", text: "text-blue-700" },
  C: { bg: "bg-amber-100", text: "text-amber-700" },
  D: { bg: "bg-red-100", text: "text-red-700" },
};

interface IncubationDetail {
  id: string;
  startup_id: string;
  portfolio_grade: string;
  status: string;
  diagnosis: Record<string, number> | null;
  action_plan: { items: { area: string; current_state: string; target_state: string; tasks: string; owner: string; deadline: string }[] } | null;
  growth_bottleneck: string | null;
  crisis_flags: Record<string, boolean> | null;
  ir_readiness: Record<string, boolean> | null;
  onboarding_checklist: { items: { label: string; completed: boolean }[] } | null;
  program_start: string;
  program_end: string;
  created_at: string;
}

export default function IncubationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<IncubationDetail | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!params.id) return;
    api
      .get<IncubationDetail>(`/incubations/${params.id}`)
      .then(async (res) => {
        setItem(res.data);
        try {
          const sRes = await api.get<{ company_name: string }>(`/startups/${res.data.startup_id}`);
          setCompanyName(sRes.data.company_name);
        } catch {
          showError("기업 정보를 불러오는 데 실패했습니다.");
        }
      })
      .catch(() => router.push("/incubation"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!item) return <div className="p-8 text-center text-slate-400">포트폴리오를 찾을 수 없습니다.</div>;

  const hasCrisis = item.crisis_flags ? Object.values(item.crisis_flags).some(Boolean) : false;
  const gradeColor = GRADE_COLORS[item.portfolio_grade] ?? { bg: "bg-slate-100", text: "text-slate-700" };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/incubation")}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${gradeColor.bg} ${gradeColor.text}`}>
              {item.portfolio_grade}
            </span>
            <h2 className="text-lg font-bold text-slate-800">{companyName || "로딩 중..."}</h2>
            {hasCrisis && <AlertTriangle size={16} className="text-red-500" />}
          </div>
          <p className="text-sm text-slate-500">
            {item.program_start} ~ {item.program_end}
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-0 border-b border-slate-200 mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => {
              if (tab.href) {
                router.push(`/incubation/${params.id}/${tab.href}`);
              } else {
                setActiveTab(tab.id);
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 문서 탭 */}
      {activeTab === "documents" && (
        <DocumentsTab startupId={item.startup_id} allowedCategories={["mentoring", "report", "poc"]} />
      )}

      {/* 개요 탭 */}
      {activeTab === "overview" && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 진단 결과 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">성장 진단</h3>
          {item.diagnosis ? (
            <div className="space-y-2">
              {Object.entries(item.diagnosis).map(([key, val]) => (
                <div key={key} className="flex items-center text-sm">
                  <span className="text-slate-500 w-24 shrink-0">{key}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 mr-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(val as number) * 20}%` }} />
                  </div>
                  <span className="text-slate-700 font-semibold w-8 text-right">{val as number}/5</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">진단 미완료</p>
          )}
        </div>

        {/* 위기 플래그 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">위기 신호</h3>
          {item.crisis_flags ? (
            <div className="space-y-2">
              {Object.entries(item.crisis_flags).map(([key, val]) => (
                <div key={key} className="flex items-center text-sm">
                  <span className={`w-2 h-2 rounded-full mr-2 ${val ? "bg-red-500" : "bg-green-500"}`} />
                  <span className="text-slate-600">{key.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">위기 플래그 미설정</p>
          )}
        </div>

        {/* 성장 병목 */}
        {item.growth_bottleneck && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-700 mb-2">현재 성장 병목</h3>
            <p className="text-sm text-slate-600">{item.growth_bottleneck}</p>
          </div>
        )}

        {/* IR 준비 상태 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 md:col-span-2">
          <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">IR 준비 상태</h3>
          {item.ir_readiness ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(item.ir_readiness).map(([key, val]) => (
                <div key={key} className="flex items-center text-xs">
                  <span className={`mr-1 ${val ? "text-green-600" : "text-slate-400"}`}>
                    {val ? "✅" : "⬜"}
                  </span>
                  <span className="text-slate-600">{key.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">IR 준비 상태 미설정</p>
          )}
        </div>
      </div>}
    </div>
  );
}

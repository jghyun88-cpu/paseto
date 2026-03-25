"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { fmtCorporateNumberFull, fmtBRN, fmtMillions, fmtDate } from "@/lib/formatters";
import { DEAL_STAGE_LABEL, CHANNEL_LABEL } from "@/lib/constants";
import DocumentsTab from "@/components/DocumentsTab";
import MeetingsTab from "@/components/MeetingsTab";

interface StartupDetail {
  id: string;
  company_name: string;
  corporate_number: string | null;
  business_registration_number: string | null;
  ceo_name: string;
  industry: string;
  stage: string;
  one_liner: string;
  current_deal_stage: string;
  sourcing_channel: string;
  founded_date: string | null;
  location: string | null;
  current_employees: number | null;
  ksic_code: string | null;
  main_product: string | null;
  stock_market: string | null;
  listing_date: string | null;
  total_assets: number | null;
  capital: number | null;
  current_revenue: number | null;
  operating_profit: number | null;
  has_research_lab: boolean | null;
  research_staff_count: number | null;
  city: string | null;
  website: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  problem_definition: string | null;
  solution_description: string | null;
  assigned_manager_name: string | null;
  is_portfolio: boolean;
  created_at: string;
  updated_at: string;
}

interface DealFlowItem {
  id: string;
  stage: string;
  notes: string | null;
  created_at: string;
}

type TabKey = "basic" | "docs" | "meetings";

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [startup, setStartup] = useState<StartupDetail | null>(null);
  const [dealFlows, setDealFlows] = useState<DealFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      api.get<StartupDetail>(`/startups/${params.id}`),
      api.get<DealFlowItem[]>(`/deal-flows/?startup_id=${params.id}`).catch(() => ({ data: [] })),
    ])
      .then(([startupRes, dfRes]) => {
        setStartup(startupRes.data);
        setDealFlows(dfRes.data);
      })
      .catch(() => router.push("/sourcing/deals"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!startup) return;
    if (!window.confirm(`"${startup.company_name}" 딜을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/startups/${startup.id}`);
      router.push("/sourcing/deals");
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!startup) return <div className="p-8 text-center text-slate-400">딜 정보를 찾을 수 없습니다.</div>;

  const s = startup;
  const stageLabel = DEAL_STAGE_LABEL[s.current_deal_stage] ?? s.current_deal_stage;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "basic", label: "기본정보" },
    { key: "docs", label: "문서" },
    { key: "meetings", label: "미팅" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/sourcing/deals")}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← 목록으로
          </button>
          <h2 className="text-xl font-bold text-slate-800 ml-2">{s.company_name}</h2>
        </div>
        <div className="flex gap-2">
<Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/sourcing/deals/${s.id}/edit`)}
          >
            수정
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === "basic" && (
        <BasicInfoTab startup={s} dealFlows={dealFlows} stageLabel={stageLabel} />
      )}
      {activeTab === "docs" && (
        <DocumentsTab startupId={s.id} allowedCategories={["ir", "other"]} />
      )}
      {activeTab === "meetings" && (
        <MeetingsTab startupId={s.id} startupName={s.company_name} />
      )}
    </div>
  );
}

function BasicInfoTab({
  startup: s,
  dealFlows,
  stageLabel,
}: {
  startup: StartupDetail;
  dealFlows: DealFlowItem[];
  stageLabel: string;
}) {
  const channelLabel = CHANNEL_LABEL[s.sourcing_channel] ?? s.sourcing_channel;

  return (
    <div className="space-y-6">
      {/* 기업명 + 뱃지 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-bold text-slate-800">{s.company_name}</h3>
          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
            s.is_portfolio
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {s.is_portfolio ? "포트폴리오" : stageLabel}
          </span>
        </div>
        {s.one_liner && (
          <p className="text-sm text-slate-500">{s.one_liner}</p>
        )}
      </div>

      {/* 기업 발굴정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          기업 발굴정보
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <ReadField label="기업(고객)명" value={s.company_name} link />
          <ReadField label="발굴일자" value={fmtDate(s.created_at)} />
          <ReadField label="섹터" value={s.industry || "-"} />
          <ReadField label="단계" value={s.stage || "-"} />
          <ReadField label="발굴경로" value={channelLabel} />
          <ReadField label="발굴자" value={s.assigned_manager_name || "-"} />
        </div>
        {(s.problem_definition || s.solution_description || s.notes) && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">상세 설명</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {s.problem_definition || s.solution_description || s.notes || "-"}
            </p>
          </div>
        )}
      </div>

      {/* 기업 기본정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          기업 기본정보
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <ReadField label="기업(고객)명" value={s.company_name} link />
          <ReadField label="설립일자" value={s.founded_date ?? "-"} />
          <ReadField label="법인(주민)등록번호" value={fmtCorporateNumberFull(s.corporate_number)} mono />
          <ReadField label="사업자등록번호" value={fmtBRN(s.business_registration_number)} mono />
          <ReadField label="대표자" value={s.ceo_name || "-"} />
          <ReadField label="임직원수" value={s.current_employees ? `${s.current_employees}명` : "-"} />
        </div>
        <div className="mt-4">
          <ReadField label="소재지" value={s.location || "-"} full />
        </div>
      </div>

      {/* 사업정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          사업정보
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <ReadField
            label="표준산업분류"
            value={
              s.ksic_code && s.industry
                ? `${s.ksic_code} - ${s.industry}`
                : s.ksic_code || s.industry || "-"
            }
          />
          <ReadField label="주요사업(제품)" value={s.main_product || "-"} />
          <ReadField label="상장시장" value={s.stock_market || "비상장"} />
          <ReadField label="상장일자" value={s.listing_date ?? "-"} />
        </div>
      </div>

      {/* 재무정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          재무정보
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <ReadField label="자산총액(백만원)" value={fmtMillions(s.total_assets)} />
          <ReadField label="자본금(백만원)" value={fmtMillions(s.capital)} />
          <ReadField label="매출액(백만원)" value={fmtMillions(s.current_revenue)} />
          <ReadField label="영업이익(백만원)" value={fmtMillions(s.operating_profit)} />
        </div>
      </div>

      {/* 연구개발 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          연구개발
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <ReadField
            label="기술연구소"
            value={s.has_research_lab === null ? "-" : s.has_research_lab ? "유" : "무"}
          />
          <ReadField label="연구인력" value={s.research_staff_count ? `${s.research_staff_count}명` : "-"} />
        </div>
      </div>

      {/* 연락처 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          연락처 정보
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <ReadField label="도시" value={s.city || "-"} />
          <div>
            <p className="text-xs text-slate-400 mb-0.5">웹사이트</p>
            {s.website ? (
              <a
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {s.website}
              </a>
            ) : (
              <p className="text-sm text-slate-800">-</p>
            )}
          </div>
          <ReadField label="실무담당" value={s.contact_person || "-"} />
          <ReadField label="연락처" value={s.contact_phone || "-"} />
        </div>
        <div className="mt-4">
          <ReadField label="이메일" value={s.contact_email || "-"} full />
        </div>
      </div>

      {/* 딜플로우 이력 */}
      {dealFlows.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">딜플로우 이력</h3>
          <div className="space-y-2">
            {dealFlows.map((df) => (
              <div key={df.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-medium text-slate-700">
                  {DEAL_STAGE_LABEL[df.stage.toLowerCase()] ?? df.stage}
                </span>
                {df.notes && <span className="text-xs text-slate-400 max-w-xs truncate">{df.notes}</span>}
                <span className="text-xs text-slate-400">{fmtDate(df.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadField({ label, value, mono, full, link }: {
  label: string; value: string; mono?: boolean; full?: boolean; link?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm ${link ? "text-blue-600" : "text-slate-800"} ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}


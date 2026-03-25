"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, Users, Search, FileText } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { DEAL_STAGE_LABEL } from "@/lib/constants";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import DocumentsTab from "@/components/DocumentsTab";
import MeetingsTab from "@/components/MeetingsTab";

type TabKey = "review" | "docs" | "meetings";

interface StartupInfo {
  id: string;
  company_name: string;
  ceo_name: string;
  industry: string;
  stage: string;
  one_liner: string;
  current_deal_stage: string;
  founded_date: string | null;
  current_employees: number | null;
  location: string | null;
}

interface HandoverInfo {
  id: string;
  from_team: string;
  to_team: string;
  handover_type: string;
  created_at: string;
  acknowledged_at: string | null;
  content: {
    screening_results?: { grade: string; overall_score: number; risk_notes?: string };
    company_overview?: { name: string; ceo?: string; industry?: string; stage?: string; one_liner?: string };
    handover_memo?: string;
    key_risks?: string[];
  };
}

interface ReviewRecord {
  id: string;
  review_type: string;
  overall_verdict: string;
  created_at: string;
}

const REVIEW_STAGES: { key: string; label: string; icon: React.ReactNode; stage: string }[] = [
  { key: "document", label: "서류심사", icon: <ClipboardCheck size={16} />, stage: "deep_review" },
  { key: "interview", label: "구조화 인터뷰", icon: <Users size={16} />, stage: "interview" },
  { key: "dd", label: "DD 체크리스트", icon: <Search size={16} />, stage: "due_diligence" },
  { key: "memo", label: "투자메모", icon: <FileText size={16} />, stage: "ic_pending" },
];

const STAGE_ORDER = [
  "inbound", "first_screening", "deep_review", "interview",
  "due_diligence", "ic_pending", "ic_review", "approved",
  "conditional", "contract", "closed", "portfolio",
];

const GRADE_BADGE: Record<string, { label: string; cls: string }> = {
  pass: { label: "Pass (A)", cls: "bg-green-100 text-green-700" },
  review: { label: "Review (B)", cls: "bg-amber-100 text-amber-700" },
  reject: { label: "Reject (C/D)", cls: "bg-red-100 text-red-700" },
};

const VERDICT_LABEL: Record<string, { label: string; cls: string }> = {
  proceed: { label: "진행", cls: "text-green-600" },
  concern: { label: "우려", cls: "text-amber-600" },
  reject: { label: "거절", cls: "text-red-600" },
};

const REVIEW_ROUTES: Record<string, string> = {
  document: "/review/document",
  interview: "/review/interview",
  dd: "/review/dd",
  memo: "/review/memo/new",
};

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const startupId = params.id as string;

  const [startup, setStartup] = useState<StartupInfo | null>(null);
  const [handover, setHandover] = useState<HandoverInfo | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("review");

  useEffect(() => {
    if (!startupId) return;
    Promise.all([
      api.get<StartupInfo>(`/startups/${startupId}`),
      api.get<{ data: HandoverInfo[] }>(`/handovers/?to_team=review&page_size=10`).catch(() => ({ data: { data: [] } })),
      api.get<{ data: ReviewRecord[] }>(`/reviews/?startup_id=${startupId}&page_size=50`).catch(() => ({ data: { data: [] } })),
    ])
      .then(([sRes, hRes, rRes]) => {
        setStartup(sRes.data);
        const handovers = hRes.data.data ?? [];
        const matched = handovers.find((h: HandoverInfo) => h.content?.company_overview?.name === sRes.data.company_name);
        setHandover(matched ?? null);
        setReviews(rRes.data.data ?? []);
      })
      .catch(() => router.push("/review/pipeline"))
      .finally(() => setLoading(false));
  }, [startupId, router]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!startup) return <div className="p-8 text-center text-slate-400">기업 정보를 찾을 수 없습니다.</div>;

  const s = startup;
  const stageLabel = DEAL_STAGE_LABEL[s.current_deal_stage] ?? s.current_deal_stage;
  const currentIdx = STAGE_ORDER.indexOf(s.current_deal_stage);
  const screening = handover?.content?.screening_results;
  const gradeBadge = screening?.grade ? GRADE_BADGE[screening.grade] : null;
  const isAcknowledged = !handover || !!handover.acknowledged_at;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/review/pipeline")}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{s.company_name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
              {stageLabel}
            </span>
            <span className="text-xs text-slate-400">{s.industry} · {s.stage}</span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {([
            { key: "review" as TabKey, label: "심사현황" },
            { key: "docs" as TabKey, label: "문서" },
            { key: "meetings" as TabKey, label: "미팅" },
          ]).map((tab) => (
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

      {/* 문서 탭 */}
      {activeTab === "docs" && (
        <DocumentsTab startupId={s.id} allowedCategories={["dd", "ir", "legal", "other"]} />
      )}

      {/* 미팅 탭 */}
      {activeTab === "meetings" && (
        <MeetingsTab startupId={s.id} startupName={s.company_name} />
      )}

      {/* 심사현황 탭 */}
      {activeTab === "review" && (<>

      {/* 인계 패키지 요약 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
          인계 패키지 (소싱팀 → 심사팀)
        </h3>
        {handover ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">인계일</p>
                <p className="font-medium">{fmtDate(handover.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">스크리닝 등급</p>
                {gradeBadge ? (
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${gradeBadge.cls}`}>
                    {gradeBadge.label}
                  </span>
                ) : <p>-</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400">스크리닝 점수</p>
                <p className="font-bold">{screening?.overall_score ?? "-"}점</p>
              </div>
            </div>

            {handover.content.key_risks && handover.content.key_risks.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">핵심 리스크</p>
                <ul className="space-y-0.5">
                  {handover.content.key_risks.map((risk, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">•</span>{risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {handover.content.handover_memo && (
              <div>
                <p className="text-xs text-slate-400 mb-1">인계 메모</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2 whitespace-pre-wrap">
                  {handover.content.handover_memo}
                </p>
              </div>
            )}

            {!handover.acknowledged_at && (
              <div className="px-3 py-2 bg-amber-50 rounded text-sm text-amber-700">
                아직 인계를 확인하지 않았습니다.
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">인계 패키지가 없습니다.</p>
        )}
      </div>

      {/* 인계 미확인 경고 */}
      {!isAcknowledged && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-amber-800">인계 수신확인이 필요합니다</p>
            <p className="text-xs text-amber-600 mt-0.5">
              인계 수신함에서 수신확인을 완료해야 평가를 진행할 수 있습니다.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => router.push("/review/handover")}
          >
            인계 수신함 이동
          </Button>
        </div>
      )}

      {/* 심사 진행 현황 */}
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4 ${!isAcknowledged ? "opacity-50 pointer-events-none" : ""}`}>
        <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
          심사 진행
          {!isAcknowledged && <span className="text-xs text-amber-500 font-normal ml-2">(수신확인 후 진행 가능)</span>}
        </h3>
        <div className="space-y-2">
          {REVIEW_STAGES.map((rs) => {
            const stageIdx = STAGE_ORDER.indexOf(rs.stage);
            const isAccessible = isAcknowledged && currentIdx >= stageIdx;
            const existingReview = reviews.find((r) => r.review_type === rs.key);
            const routePath = REVIEW_ROUTES[rs.key];

            return (
              <div key={rs.key} className="flex items-center justify-between py-2 px-3 rounded hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={isAccessible ? "text-blue-600" : "text-slate-300"}>{rs.icon}</span>
                  <span className={`text-sm font-medium ${isAccessible ? "text-slate-700" : "text-slate-400"}`}>
                    {rs.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {existingReview ? (
                    <>
                      <span className={`text-xs font-medium ${VERDICT_LABEL[existingReview.overall_verdict]?.cls ?? "text-slate-500"}`}>
                        {VERDICT_LABEL[existingReview.overall_verdict]?.label ?? existingReview.overall_verdict}
                      </span>
                      <span className="text-xs text-slate-400">{fmtDate(existingReview.created_at)}</span>
                    </>
                  ) : isAccessible && routePath ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`${routePath}?startup_id=${s.id}`)}
                    >
                      시작
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-300">{!isAcknowledged ? "수신확인 필요" : "미도달"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI 분석 — 수신확인 후에만 사용 가능 */}
      {isAcknowledged ? (
        <AIAnalysisPanel startupId={s.id} startupName={s.company_name} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4 opacity-50">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="text-purple-500">🤖</span> AI 분석
            <span className="text-xs text-amber-500 font-normal">(수신확인 후 사용 가능)</span>
          </h3>
        </div>
      )}

      {/* 기업 기본정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
          기업 기본정보
        </h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">기업명</p>
            <p className="font-medium">{s.company_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">대표자</p>
            <p>{s.ceo_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">설립일</p>
            <p>{s.founded_date ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">임직원수</p>
            <p>{s.current_employees ? `${s.current_employees}명` : "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-400">한줄 소개</p>
            <p>{s.one_liner || "-"}</p>
          </div>
          {s.location && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400">소재지</p>
              <p>{s.location}</p>
            </div>
          )}
        </div>
      </div>

      </>)}
    </div>
  );
}

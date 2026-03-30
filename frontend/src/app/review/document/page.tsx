"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, X, ClipboardList } from "lucide-react";
import FiveAxisRadar from "@/components/charts/RadarChart";
import ReportUploader from "@/components/screening/ReportUploader";
import EvaluationReview from "@/components/screening/EvaluationReview";
import api from "@/lib/api";

/* ─── 가이드라인 데이터 (서류심사 5축) ─── */

interface GuideItem {
  key: string;
  label: string;
  hover: string;
  scores: string[];
  checkpoint: string;
}

const AXES: GuideItem[] = [
  {
    key: "team_score",
    label: "팀 역량",
    hover: "핵심 인력 구성, 도메인 경험, 팀 보완성 평가",
    scores: [
      "대표 1인 팀, 도메인 경험 없음, 핵심 인력 부재",
      "2인 이상이나 역할 중복, 기술 또는 사업 한쪽 공백",
      "핵심 포지션 구성, 도메인 경험 1~2년 수준",
      "기술+사업 균형 팀, 관련 산업 3년+ 경력, 협업 이력 존재",
      "풀스택 경영진, 업계 전문가 팀, 핵심 인력 이탈 리스크 낮음",
    ],
    checkpoint: "공동창업자 간 지분 구조와 의사결정 체계를 확인하세요.",
  },
  {
    key: "problem_score",
    label: "문제 정의",
    hover: "문제의 심각성, 시급성, 검증 수준 평가",
    scores: [
      "문제 정의 모호, 고객 검증 전무, 가설 수준",
      "문제는 인지하나 타깃 고객 불명확, 정량 근거 부족",
      "고객군 특정됨, 인터뷰/설문 10건 이상 근거 보유",
      "Pain point 구체적, 기존 해결책의 한계를 데이터로 입증",
      "고객이 비용을 지불하거나 대안을 직접 만들 정도의 심각한 문제",
    ],
    checkpoint: "고객 인터뷰 수, LOI, 대기자 명단 등 검증 근거를 확인하세요.",
  },
  {
    key: "solution_score",
    label: "솔루션",
    hover: "기술 차별화, 특허/IP, 진입장벽 평가",
    scores: [
      "기존 솔루션과 차별점 없음, 기술적 해자 부재",
      "점진적 개선 수준, 경쟁사 단기 모방 가능",
      "차별화 요소 있으나 특허 미출원, 기술적 우위 제한적",
      "핵심 특허 출원/등록, 논문 검증된 기술, 모방 난이도 높음",
      "원천기술 보유, 다수 특허 포트폴리오, 경쟁사 진입장벽 매우 높음",
    ],
    checkpoint: "TRL 단계, 특허 등록/출원 현황, 기술 이전 계약을 확인하세요.",
  },
  {
    key: "market_score",
    label: "시장성",
    hover: "TAM/SAM/SOM 규모, 성장률, 진입 타이밍 평가",
    scores: [
      "시장 규모 산출 불가, 니치 시장 미형성",
      "시장 규모 소형(<500억) 또는 성장 정체",
      "TAM 1,000억 이상, 연 10%+ 성장, SOM 근거 부분적",
      "TAM 5,000억 이상, 명확한 성장 트렌드, 규제/정책 순풍",
      "TAM 1조+ 또는 연 20%+ 고성장, 타이밍 최적 (규제 변화·기술 성숙)",
    ],
    checkpoint: "TAM/SAM/SOM 출처, 경쟁 구도(HHI), 규제 환경을 확인하세요.",
  },
  {
    key: "traction_score",
    label: "트랙션",
    hover: "매출, 고객 수, 파일럿, 성장률 등 실행 지표 평가",
    scores: [
      "아이디어/PPT 단계, 구현물 없음",
      "프로토타입 존재하나 외부 사용자 검증 없음",
      "PoC/파일럿 완료, 잠재 고객 피드백 확보",
      "유료 고객 확보, MoM 20%+ 성장, LOI 또는 파일럿 계약 복수",
      "반복 매출 발생(MRR), 핵심 지표 우상향, 시리즈 투자 유치 또는 진행 중",
    ],
    checkpoint: "딥테크는 기술 검증(TRL)과 시장 검증(고객)을 분리해 판단하세요.",
  },
];

const DEEPTECH_GUIDE = {
  scalability: {
    hover: "실험실→양산 전환 가능성, 수율, 비용 구조",
    scores: [
      "실험실 스케일만 입증, 양산 경로 미정의",
      "양산 개념 설계 수준, 주요 병목 미해결",
      "파일럿 라인 구축 또는 위탁 생산 파트너 확보",
      "소량 양산 실적, 수율 안정화 진행 중",
      "양산 라인 가동 중, 수율·비용 목표 달성",
    ],
    checkpoint: "수율, 단가, 리드타임 데이터를 확인하세요.",
  },
  process: {
    hover: "기존 제조 공정과의 호환성, 통합 난이도",
    scores: [
      "기존 공정과 완전 비호환, 신규 장비·라인 필요",
      "부분 호환, 상당한 공정 수정 필요",
      "일부 공정 변경으로 적용 가능",
      "기존 공정에 모듈 추가 수준으로 통합 가능",
      "Drop-in 대체, 기존 공정 변경 불필요",
    ],
    checkpoint: "고객사 공정 라인 현장 방문 또는 엔지니어 의견을 확보했는지 확인하세요.",
  },
};

const VERDICT_GUIDE = {
  hover: "심사 후 종합 판단 (진행/우려/거절)",
  criteria: [
    "진행: 5축 평균 3.5 이상, 치명적 리스크 없음",
    "우려: 평균 2.5~3.5 또는 특정 축 1점, 추가 검증 필요",
    "거절: 평균 2.5 미만 또는 복수 축 1~2점",
  ],
  checkpoint: "판정은 점수 자동 산출이 아닙니다. 정성적 판단을 반영하세요.",
};

const VERDICTS = [
  { value: "proceed", label: "진행 (Proceed)", color: "text-green-600" },
  { value: "concern", label: "우려 (Concern)", color: "text-amber-600" },
  { value: "reject", label: "거절 (Reject)", color: "text-red-600" },
] as const;

/* ─── Popover 컴포넌트 (레이어 2) ─── */

function InfoPopover({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" onClick={() => setOpen(!open)} className="ml-1 text-slate-400 hover:text-blue-500">
        {children}
      </button>
      {open && (
        <div className="absolute left-6 top-0 z-50 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-xs text-slate-600">
          {content}
        </div>
      )}
    </div>
  );
}

/* ─── 사이드패널 (레이어 3) ─── */

function GuidePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white border-l border-slate-200 shadow-2xl overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">서류심사 평가 가이드</h3>
          <p className="text-[11px] text-slate-400">REV-F01 · 심사팀 전용</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5 text-xs text-slate-600">
        <p className="text-slate-500 leading-relaxed">
          5축 정량 평가(각 5점) + 종합 판정으로 구성됩니다. 딥테크 기업은 심화 필드를 추가 평가합니다.
        </p>

        {AXES.map((item) => (
          <div key={item.key} className="border-t border-slate-100 pt-3">
            <h4 className="font-bold text-slate-700 mb-2">{item.label}</h4>
            <div className="space-y-1 mb-2">
              {item.scores.map((desc, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-blue-600 font-bold w-4 shrink-0">{i + 1}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-blue-600 text-[11px]">* {item.checkpoint}</p>
          </div>
        ))}

        <div className="border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-700 mb-2">종합 판정 기준</h4>
          <ul className="space-y-1">
            {VERDICT_GUIDE.criteria.map((c, i) => (
              <li key={i}>· {c}</li>
            ))}
          </ul>
          <p className="text-blue-600 text-[11px] mt-2">* {VERDICT_GUIDE.checkpoint}</p>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-700 mb-2">딥테크 심화: 양산성/스케일업</h4>
          <div className="space-y-1 mb-2">
            {DEEPTECH_GUIDE.scalability.scores.map((desc, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-blue-600 font-bold w-4 shrink-0">{i + 1}</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-600 text-[11px]">* {DEEPTECH_GUIDE.scalability.checkpoint}</p>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-700 mb-2">딥테크 심화: 공정 적합성</h4>
          <div className="space-y-1 mb-2">
            {DEEPTECH_GUIDE.process.scores.map((desc, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-blue-600 font-bold w-4 shrink-0">{i + 1}</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-600 text-[11px]">* {DEEPTECH_GUIDE.process.checkpoint}</p>
        </div>

        <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          문의: 심사팀 운영 담당 · 최종 업데이트 2026.03
        </div>
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─── */

export default function DocumentReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startupId = searchParams.get("startup_id") ?? "";
  const initialMode = searchParams.get("mode") === "ai" ? "ai" : "manual";

  const [mode, setMode] = useState<"manual" | "ai">(initialMode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiResult, setAiResult] = useState<any>(null);
  const [startupName, setStartupName] = useState("");

  // 스타트업 이름 로드
  useEffect(() => {
    if (!startupId) return;
    api.get(`/startups/${startupId}`).then(({ data }) => {
      setStartupName(data.company_name || "");
    }).catch(() => {});
  }, [startupId]);

  // AI 모드
  if (mode === "ai") {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">AI 서류심사 평가</h1>
          </div>
          <button
            onClick={() => setMode("manual")}
            className="text-sm text-blue-600 hover:underline"
          >
            수동 심사로 전환
          </button>
        </div>

        {!aiResult ? (
          <ReportUploader
            startupId={startupId}
            onComplete={(result) => setAiResult(result)}
          />
        ) : (
          <EvaluationReview
            evaluationId={aiResult.evaluation_id}
            startupName={startupName || startupId}
            initialData={aiResult.status === "completed" ? aiResult : undefined}
          />
        )}
      </div>
    );
  }

  // 수동 모드 (기존 코드)
  const [scores, setScores] = useState<Record<string, number>>({
    team_score: 3,
    problem_score: 3,
    solution_score: 3,
    market_score: 3,
    traction_score: 3,
  });
  const [verdict, setVerdict] = useState("proceed");
  const [showDeeptech, setShowDeeptech] = useState(false);
  const [deeptech, setDeeptech] = useState({
    tech_type: "",
    scalability_score: 3,
    process_compatibility: 3,
    sample_test_status: "",
    certification_stage: "",
    purchase_lead_time_months: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  const radarData = useMemo(
    () => AXES.map((a) => ({ axis: a.label, score: scores[a.key] })),
    [scores],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!startupId) {
        setError("startup_id가 필요합니다. URL에 ?startup_id=를 포함하세요.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        await api.post("/reviews/", {
          startup_id: startupId,
          review_type: "document",
          ...scores,
          overall_verdict: verdict,
          ...(showDeeptech
            ? {
                tech_type: deeptech.tech_type || null,
                scalability_score: deeptech.scalability_score,
                process_compatibility: deeptech.process_compatibility,
                sample_test_status: deeptech.sample_test_status || null,
                certification_stage: deeptech.certification_stage || null,
                purchase_lead_time_months: deeptech.purchase_lead_time_months || null,
              }
            : {}),
        });
        router.push("/review/pipeline");
      } catch {
        setError("서류심사 제출에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, scores, verdict, showDeeptech, deeptech, router],
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">서류심사 (5축 평가)</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("ai")}
            className="text-sm text-blue-600 hover:underline"
          >
            AI 서류심사로 전환
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGuideOpen(true)}
            className="gap-1.5 text-slate-600"
          >
            <ClipboardList size={15} />
            평가 가이드
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5축 슬라이더 + 3계층 툴팁 */}
          <div className="space-y-4">
            {AXES.map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <label className="text-sm font-semibold text-slate-600">{item.label}</label>
                    {/* 레이어 1 + 2 */}
                    <div className="group relative">
                      <InfoPopover
                        content={
                          <div>
                            <h4 className="font-bold text-slate-700 mb-2">{item.label} 평가 기준</h4>
                            <div className="space-y-1.5 mb-3">
                              {item.scores.map((desc, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-blue-600 font-bold w-4 shrink-0">{i + 1}점</span>
                                  <span>{desc}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-100 pt-2 text-blue-600">
                              * {item.checkpoint}
                            </div>
                          </div>
                        }
                      >
                        <Info size={14} />
                      </InfoPopover>
                      <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                        {item.hover}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{scores[item.key]}/5</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">{item.scores[scores[item.key] - 1]}</p>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={scores[item.key]}
                  onChange={(e) => setScores((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>
            ))}
          </div>

          {/* Radar Chart */}
          <div className="flex items-center justify-center">
            <FiveAxisRadar data={radarData} />
          </div>
        </div>

        {/* 판정 */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <label className="text-sm font-semibold text-slate-600">종합 판정</label>
            <div className="group relative">
              <InfoPopover
                content={
                  <div>
                    <h4 className="font-bold text-slate-700 mb-2">판정 기준</h4>
                    <ul className="space-y-1.5 mb-3">
                      {VERDICT_GUIDE.criteria.map((c, i) => (
                        <li key={i}>· {c}</li>
                      ))}
                    </ul>
                    <div className="border-t border-slate-100 pt-2 text-blue-600">
                      * {VERDICT_GUIDE.checkpoint}
                    </div>
                  </div>
                }
              >
                <Info size={14} />
              </InfoPopover>
              <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                {VERDICT_GUIDE.hover}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            {VERDICTS.map((v) => (
              <label key={v.value} className={`flex items-center gap-1.5 cursor-pointer ${v.color}`}>
                <input
                  type="radio"
                  name="verdict"
                  value={v.value}
                  checked={verdict === v.value}
                  onChange={() => setVerdict(v.value)}
                />
                <span className="text-sm font-medium">{v.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 딥테크 심화 */}
        <div className="border-t pt-4">
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => setShowDeeptech(!showDeeptech)}
          >
            {showDeeptech ? "▼" : "▶"} 딥테크 심화 필드
          </button>

          {showDeeptech && (
            <div className="mt-3 space-y-3 pl-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">기술 유형</label>
                <select
                  value={deeptech.tech_type}
                  onChange={(e) => setDeeptech((p) => ({ ...p, tech_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">선택</option>
                  <option value="paper_tech">논문 기술</option>
                  <option value="engineering">엔지니어링</option>
                  <option value="mixed">혼합</option>
                </select>
              </div>
              {/* 양산성/스케일업 + 3계층 툴팁 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <label className="text-sm font-semibold text-slate-600">양산성/스케일업</label>
                    <div className="group relative">
                      <InfoPopover
                        content={
                          <div>
                            <h4 className="font-bold text-slate-700 mb-2">양산성/스케일업 평가 기준</h4>
                            <div className="space-y-1.5 mb-3">
                              {DEEPTECH_GUIDE.scalability.scores.map((desc, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-blue-600 font-bold w-4 shrink-0">{i + 1}점</span>
                                  <span>{desc}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-100 pt-2 text-blue-600">
                              * {DEEPTECH_GUIDE.scalability.checkpoint}
                            </div>
                          </div>
                        }
                      >
                        <Info size={14} />
                      </InfoPopover>
                      <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                        {DEEPTECH_GUIDE.scalability.hover}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{deeptech.scalability_score}/5</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">{DEEPTECH_GUIDE.scalability.scores[deeptech.scalability_score - 1]}</p>
                <input type="range" min={1} max={5} step={1} value={deeptech.scalability_score}
                  onChange={(e) => setDeeptech((p) => ({ ...p, scalability_score: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>
              {/* 공정 적합성 + 3계층 툴팁 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <label className="text-sm font-semibold text-slate-600">공정 적합성</label>
                    <div className="group relative">
                      <InfoPopover
                        content={
                          <div>
                            <h4 className="font-bold text-slate-700 mb-2">공정 적합성 평가 기준</h4>
                            <div className="space-y-1.5 mb-3">
                              {DEEPTECH_GUIDE.process.scores.map((desc, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-blue-600 font-bold w-4 shrink-0">{i + 1}점</span>
                                  <span>{desc}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-100 pt-2 text-blue-600">
                              * {DEEPTECH_GUIDE.process.checkpoint}
                            </div>
                          </div>
                        }
                      >
                        <Info size={14} />
                      </InfoPopover>
                      <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                        {DEEPTECH_GUIDE.process.hover}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{deeptech.process_compatibility}/5</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">{DEEPTECH_GUIDE.process.scores[deeptech.process_compatibility - 1]}</p>
                <input type="range" min={1} max={5} step={1} value={deeptech.process_compatibility}
                  onChange={(e) => setDeeptech((p) => ({ ...p, process_compatibility: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">샘플 테스트 상태</label>
                <select
                  value={deeptech.sample_test_status}
                  onChange={(e) => setDeeptech((p) => ({ ...p, sample_test_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">선택</option>
                  <option value="not_started">미시작</option>
                  <option value="in_progress">진행중</option>
                  <option value="passed">통과</option>
                  <option value="failed">실패</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">인증 단계</label>
                <input
                  type="text"
                  value={deeptech.certification_stage}
                  onChange={(e) => setDeeptech((p) => ({ ...p, certification_stage: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  placeholder="예: ISO 13485 취득 중"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">구매전환 리드타임 (월)</label>
                <input
                  type="number"
                  min={0}
                  value={deeptech.purchase_lead_time_months}
                  onChange={(e) => setDeeptech((p) => ({ ...p, purchase_lead_time_months: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "제출 중..." : "서류심사 제출"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>

      {/* 레이어 3: 사이드패널 */}
      <GuidePanel open={guideOpen} onClose={() => setGuideOpen(false)} />
      {guideOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setGuideOpen(false)}
        />
      )}
    </div>
  );
}

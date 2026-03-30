"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, X, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import ReportUploader from "@/components/screening/ReportUploader";
import EvaluationReview from "@/components/screening/EvaluationReview";

/* ─── 가이드라인 데이터 ─── */

interface GuideItem {
  key: string;
  label: string;
  hover: string;
  scores: string[];
  checkpoint: string;
}

const ITEMS: GuideItem[] = [
  {
    key: "fulltime_commitment",
    label: "전일제 헌신도",
    hover: "창업자의 풀타임 전환 여부와 전념 수준",
    scores: [
      "전원 본업 유지, 헌신 의지 불분명",
      "사이드 프로젝트 수준, 전환 시점 불명확",
      "주요 창업자 파트타임이나 전환 계획 존재",
      "핵심 창업자 1인 이상 풀타임, 나머지 합류 일정 확정",
      "창업자 전원 풀타임. 기존 직장·학업 완전 정리 완료",
    ],
    checkpoint: "풀타임 전환 날짜를 확인하세요. 학적·재직 여부는 서류 단계에서 검증 가능합니다.",
  },
  {
    key: "problem_clarity",
    label: "문제 정의 명확성",
    hover: "문제의 구체성과 고객 검증 근거 유무",
    scores: [
      "막연한 불편함 수준, 검증 근거 없음",
      "현상 나열 수준, 근본 원인 분석 미흡",
      "문제는 실재하나 범위가 넓거나 타깃 고객 불명확",
      "문제 정의 구체적, 고객 인터뷰 등 1차 근거 존재",
      "문제 범위·타깃·고통 지점이 데이터 기반으로 명확히 정의됨",
    ],
    checkpoint: '"누구의, 어떤 문제를, 왜 지금 풀어야 하는가"에 답할 수 있는지 확인하세요.',
  },
  {
    key: "tech_differentiation",
    label: "기술/제품 차별성",
    hover: "기술 우위와 모방 방어 가능성",
    scores: [
      "시장에 유사 제품 다수, 차별점 불명확",
      "개선 수준의 차별화, 경쟁사가 단기간 내 모방 가능",
      "기존 솔루션과 차별점 있으나 진입장벽 다소 낮음",
      "명확한 기술 우위, 특허 출원 중 또는 논문 기반 검증",
      "특허 등록 또는 재현 불가능한 기술적 해자 보유",
    ],
    checkpoint: "TRL 단계와 IP 현황(등록/출원/미출원)을 함께 확인하세요.",
  },
  {
    key: "market_potential",
    label: "시장성",
    hover: "TAM 규모 및 성장률 근거 충분성",
    scores: [
      "시장 규모 산출 불가, 또는 시장 자체가 미형성",
      "시장이 협소하거나 성숙기에 접어든 정체 시장",
      "시장 존재는 확인되나 규모 또는 성장률 근거 불충분",
      "TAM 1,000억원 이상 또는 고성장 니치 시장, SOM 근거 있음",
      "TAM 1조원 이상, 연 20% 이상 성장 중인 명확한 시장",
    ],
    checkpoint: "TAM/SAM/SOM을 구분해 제시했는지, 숫자 출처가 있는지 확인하세요.",
  },
  {
    key: "initial_validation",
    label: "초기 검증/진척도",
    hover: "MVP·고객·매출 등 실행 단계",
    scores: [
      "아이디어·PPT 단계, 기술 구현 미착수",
      "초기 프로토타입 또는 데모 수준, 외부 검증 미흡",
      "PoC 완료, 잠재 고객 인터뷰 10건 이상",
      "MVP 출시 후 실사용자 확보, 정성·정량 피드백 보유",
      "유료 고객·LOI·파일럿 계약 존재, 반복 가능한 매출 발생",
    ],
    checkpoint: "딥테크는 기술 검증(PoC)과 시장 검증(고객)을 분리해 판단하세요.",
  },
  {
    key: "strategy_fit",
    label: "프로그램 적합성",
    hover: "당사 섹터·네트워크와의 연결 가능성",
    scores: [
      "프로그램 범위 외 섹터, 연결 가능한 네트워크 부재",
      "섹터 부합도 낮음, 커리큘럼 적용 제한적",
      "인접 섹터, 일부 리소스 활용 가능하나 추가 노력 필요",
      "핵심 섹터에 해당하며 지원 인프라 활용도 높음",
      "당사 포커스 섹터에 완전 부합, 멘토·파트너 즉시 연결 가능",
    ],
    checkpoint: "포트폴리오사·투자 파트너와의 시너지 가능성도 함께 고려하세요.",
  },
];

const LEGAL_GUIDE = {
  hover: "IP 분쟁·기술 유용·규제 위반 여부 확인",
  checks: [
    "지식재산권 분쟁 (특허 침해, 공동발명자 이슈)",
    "전 직장 기술·영업비밀 유용 의혹",
    "개인정보보호법·공정거래법 위반 소지",
    "주주 구성상 이해충돌 또는 지분 분쟁",
    "정부과제·연구비 관련 규정 위반 이력",
  ],
  checkpoint: "이 단계는 자기진술 기반입니다. 의심 사항은 체크 해제 후 인계 메모에 기재하세요.",
};

const RISK_GUIDE = {
  hover: "심사팀이 집중 검토할 리스크를 줄바꿈으로 입력",
  categories: "기술 리스크 · 팀 리스크 · 시장 리스크 · 경쟁 리스크 · 규제 리스크",
  checkpoint: "리스크 기재는 부정적 신호가 아닙니다. 구체적으로 쓸수록 인계 품질이 높아집니다.",
};

const MEMO_GUIDE = {
  hover: "점수 외 맥락 정보 (소싱 경로·인상·딜 타임라인 등)",
  items: [
    "소싱 채널 및 레퍼러 (추천인 신뢰도 포함)",
    "창업자 미팅 인상 (태도·소통·질문 수준)",
    "경쟁 VC·AC 관심 여부 및 딜 타임라인",
    "심사팀이 사전 확인해야 할 사항",
    "담당자 주관 의견 (등급 변경 사유 포함)",
  ],
};

const GRADE_GUIDE = {
  hover: "총점 기반 자동 산출. 변경 시 인계 메모에 사유 기재",
  tiers: [
    { range: "30~35점", grade: "A (Fast-track)", desc: "즉시 심층심사 진행" },
    { range: "24~29점", grade: "B (Review)", desc: "심사팀 검토 후 결정" },
    { range: "17~23점", grade: "C (Watch)", desc: "재지원 또는 관찰 유보" },
    { range: "16점 이하", grade: "D (Pass)", desc: "현 단계 부적합" },
  ],
};

/* ─── 등급 계산 ─── */

function gradeLabel(score: number): { grade: string; color: string } {
  if (score >= 30) return { grade: "A (Fast-track)", color: "text-green-600" };
  if (score >= 24) return { grade: "B (Review)", color: "text-amber-600" };
  if (score >= 17) return { grade: "C (Watch)", color: "text-orange-600" };
  return { grade: "D (Pass)", color: "text-red-600" };
}

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
          <h3 className="text-sm font-bold text-slate-800">1차 스크리닝 평가 가이드</h3>
          <p className="text-[11px] text-slate-400">SRC-F02 · 소싱팀 전용</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5 text-xs text-slate-600">
        <p className="text-slate-500 leading-relaxed">
          6개 정량 항목(각 5점) + 법적 이슈(5점) = 총 35점 만점으로 평가하며, 등급은 자동 산출됩니다.
        </p>

        {ITEMS.map((item) => (
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
          <h4 className="font-bold text-slate-700 mb-2">법적 이슈 없음 (+5점)</h4>
          <p className="mb-2">아래 해당 시 체크 해제:</p>
          <ul className="space-y-1 ml-2">
            {LEGAL_GUIDE.checks.map((c, i) => (
              <li key={i}>· {c}</li>
            ))}
          </ul>
          <p className="text-blue-600 text-[11px] mt-2">* {LEGAL_GUIDE.checkpoint}</p>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-700 mb-2">등급 기준</h4>
          <div className="space-y-1">
            {GRADE_GUIDE.tiers.map((t, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-mono w-16 shrink-0">{t.range}</span>
                <span className="font-bold w-24 shrink-0">{t.grade}</span>
                <span>{t.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-600 text-[11px] mt-2">* 등급 변경 시 인계 메모 필수</p>
        </div>

        <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          문의: 소싱팀 운영 담당 · 최종 업데이트 2026.03
        </div>
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─── */

export default function NewScreeningPage() {
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
            <h1 className="text-xl font-bold text-slate-900">AI 보고서 평가</h1>
          </div>
          <button
            onClick={() => setMode("manual")}
            className="text-sm text-blue-600 hover:underline"
          >
            수동 스크리닝으로 전환
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
    fulltime_commitment: 3,
    problem_clarity: 3,
    tech_differentiation: 3,
    market_potential: 3,
    initial_validation: 3,
    strategy_fit: 3,
  });
  const [legalClear, setLegalClear] = useState(true);
  const [riskNotes, setRiskNotes] = useState("");
  const [handoverMemo, setHandoverMemo] = useState("");
  const [handoverToReview, setHandoverToReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  const totalScore = useMemo(() => {
    const sum = Object.values(scores).reduce((a, b) => a + b, 0);
    return sum + (legalClear ? 5 : 0);
  }, [scores, legalClear]);

  const { grade, color } = gradeLabel(totalScore);

  const handleScore = useCallback((key: string, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  }, []);

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
        await api.post("/screenings/", {
          startup_id: startupId,
          ...scores,
          legal_clear: legalClear,
          risk_notes: riskNotes || null,
          handover_memo: handoverMemo || null,
          handover_to_review: handoverToReview,
        });
        router.push("/sourcing/screening");
      } catch {
        setError("스크리닝 제출에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [startupId, scores, legalClear, riskNotes, handoverMemo, handoverToReview, router],
  );

  return (
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">1차 스크리닝 (SRC-F02)</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("ai")}
            className="text-sm text-blue-600 hover:underline"
          >
            AI 보고서 평가로 전환
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

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        {/* 평가 항목 */}
        {ITEMS.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <label className="text-sm font-semibold text-slate-600">{item.label}</label>
                {/* 레이어 1: hover 툴팁 */}
                <div className="group relative">
                  {/* 레이어 2: 클릭 popover */}
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
                  {/* 레이어 1: hover 한줄 */}
                  <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                    {item.hover}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-blue-600">{scores[item.key]}/5</span>
            </div>
            {/* 현재 점수 설명 */}
            <p className="text-[11px] text-slate-400 mb-1.5">{item.scores[scores[item.key] - 1]}</p>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={scores[item.key]}
              onChange={(e) => handleScore(item.key, Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
        ))}

        {/* 법적 이슈 */}
        <div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="legal_clear"
              checked={legalClear}
              onChange={(e) => setLegalClear(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="legal_clear" className="text-sm text-slate-600">법적 이슈 없음 (+5점)</label>
            <div className="group relative">
              <InfoPopover
                content={
                  <div>
                    <h4 className="font-bold text-slate-700 mb-2">체크 해제 조건</h4>
                    <p className="mb-2">아래 중 하나라도 해당되면 체크를 해제하세요:</p>
                    <ul className="space-y-1">
                      {LEGAL_GUIDE.checks.map((c, i) => (
                        <li key={i}>· {c}</li>
                      ))}
                    </ul>
                    <div className="border-t border-slate-100 pt-2 mt-2 text-blue-600">
                      * {LEGAL_GUIDE.checkpoint}
                    </div>
                  </div>
                }
              >
                <Info size={14} />
              </InfoPopover>
              <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                {LEGAL_GUIDE.hover}
              </span>
            </div>
          </div>
          {!legalClear && (
            <p className="text-[11px] text-red-500 mt-1 ml-5">법적 이슈 미체크 시 D등급 하향이 권고됩니다. 인계 메모에 사유를 기재하세요.</p>
          )}
        </div>

        {/* 총점 + 등급 */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-500">총점</div>
          <div className="text-3xl font-extrabold text-slate-800">
            {totalScore}<span className="text-base font-normal text-slate-400">/35</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${color}`}>등급 제안: {grade}</div>
        </div>

        {/* 핵심 리스크 */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-sm font-semibold text-slate-600">핵심 리스크 (줄바꿈으로 구분)</label>
            <div className="group relative">
              <InfoPopover
                content={
                  <div>
                    <h4 className="font-bold text-slate-700 mb-2">입력 가이드</h4>
                    <p className="mb-1">다음 카테고리 기준으로 각 1줄씩 입력하세요:</p>
                    <p className="text-slate-500 mb-2">{RISK_GUIDE.categories}</p>
                    <div className="border-t border-slate-100 pt-2 text-blue-600">
                      * {RISK_GUIDE.checkpoint}
                    </div>
                  </div>
                }
              >
                <Info size={14} />
              </InfoPopover>
              <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                {RISK_GUIDE.hover}
              </span>
            </div>
          </div>
          <textarea
            value={riskNotes}
            onChange={(e) => setRiskNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            placeholder="기술: 양산 스케일업 미검증&#10;시장: 초기 고객 확보 경로 불명확&#10;팀: CTO 합류 미확정"
          />
        </div>

        {/* 심사팀 인계 메모 */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-sm font-semibold text-slate-600">심사팀 인계 메모</label>
            <div className="group relative">
              <InfoPopover
                content={
                  <div>
                    <h4 className="font-bold text-slate-700 mb-2">입력 가이드</h4>
                    <p className="mb-1">점수에 반영되지 않은 아래 정보를 기재하세요:</p>
                    <ul className="space-y-1">
                      {MEMO_GUIDE.items.map((m, i) => (
                        <li key={i}>· {m}</li>
                      ))}
                    </ul>
                  </div>
                }
              >
                <Info size={14} />
              </InfoPopover>
              <span className="pointer-events-none absolute left-6 -top-1 z-40 hidden group-hover:block bg-slate-800 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow">
                {MEMO_GUIDE.hover}
              </span>
            </div>
          </div>
          <textarea
            value={handoverMemo}
            onChange={(e) => setHandoverMemo(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 인계 요청 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="handover"
            checked={handoverToReview}
            onChange={(e) => setHandoverToReview(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="handover" className="text-sm font-semibold text-blue-700">심사팀 인계 요청</label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "제출 중..." : "스크리닝 제출"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
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

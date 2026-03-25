"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, RefreshCw, ChevronDown, ChevronUp, FileText, X, Download } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface AIAnalysisItem {
  id: string;
  analysis_type: string;
  scores: Record<string, number> | null;
  summary: string;
  risk_level: string | null;
  recommendation: string | null;
  investment_attractiveness: number | null;
  created_at: string;
}

interface AIAnalysisPanelProps {
  startupId: string;
  startupName: string;
}

const ANALYSIS_TYPES = [
  { value: "screening", label: "AI 스크리닝", desc: "7개 항목 자동 점수화" },
  { value: "ir_analysis", label: "IR 심층분석", desc: "재무·사업모델 분석" },
  { value: "risk_alert", label: "리스크 스캔", desc: "5대 리스크 점검" },
  { value: "market_scan", label: "시장 분석", desc: "시장규모·경쟁 분석" },
] as const;

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  low: { label: "낮음", cls: "bg-green-100 text-green-700" },
  medium: { label: "보통", cls: "bg-amber-100 text-amber-700" },
  high: { label: "높음", cls: "bg-orange-100 text-orange-700" },
  critical: { label: "심각", cls: "bg-red-100 text-red-700" },
};

const REC_BADGE: Record<string, { label: string; cls: string }> = {
  pass: { label: "통과", cls: "bg-green-100 text-green-700" },
  conditional: { label: "조건부", cls: "bg-blue-100 text-blue-700" },
  hold: { label: "보류", cls: "bg-amber-100 text-amber-700" },
  decline: { label: "거절", cls: "bg-red-100 text-red-700" },
};

const SCORE_LABEL: Record<string, string> = {
  team_competency: "팀 역량",
  tech_differentiation: "기술 차별성",
  market_potential: "시장 잠재력",
  problem_clarity: "문제 명확성",
  initial_validation: "초기 검증",
  strategy_fit: "전략 적합성",
  business_model: "비즈니스 모델",
  financial_health: "재무 건전성",
  growth_potential: "성장성",
  team_strength: "팀 구성",
  ip_competitiveness: "IP 경쟁력",
  team_risk: "팀 리스크",
  financial_risk: "재무 리스크",
  tech_risk: "기술 리스크",
  market_risk: "시장 리스크",
  legal_risk: "법적 리스크",
  market_size: "시장 규모",
  growth_rate: "성장률",
  competition_intensity: "경쟁 강도",
  entry_barrier: "진입 장벽",
  regulatory_environment: "규제 환경",
  vision_scalability: "비전 및 확장성",
  solution_differentiation: "솔루션 차별화",
  investment_fit: "투자 적합성",
  presentation: "프리젠테이션",
};

const TYPE_LABEL: Record<string, string> = {
  screening: "AI 스크리닝",
  ir_analysis: "IR 심층분석",
  risk_alert: "리스크 스캔",
  market_scan: "시장 분석",
  investment_memo: "투자메모",
  portfolio_report: "포트폴리오",
};

/* ── 상세 보고서 모달 ── */
function ReportModal({
  item,
  startupName,
  onClose,
}: {
  item: AIAnalysisItem;
  startupName: string;
  onClose: () => void;
}) {
  const recBadge = item.recommendation ? REC_BADGE[item.recommendation] : null;
  const riskBadge = item.risk_level ? RISK_BADGE[item.risk_level] : null;

  // summary를 섹션별로 분리
  const sections = item.summary.split("---").map((s) => s.trim()).filter(Boolean);
  const llmSection = sections[0] || "";
  const ruleSection = sections[1] || "";

  // LLM 섹션에서 핵심 발견 추출
  const findingsMatch = llmSection.match(/핵심 발견:\n([\s\S]*?)$/);
  const mainText = findingsMatch
    ? llmSection.slice(0, findingsMatch.index).trim()
    : llmSection;
  const findings = findingsMatch
    ? findingsMatch[1].split("\n").map((l) => l.replace(/^[•\-]\s*/, "").trim()).filter(Boolean)
    : [];

  // 점수를 높은 순으로 정렬 (숫자 값만 필터링)
  const sortedScores = item.scores
    ? Object.entries(item.scores).filter(([, v]) => typeof v === "number").sort(([, a], [, b]) => (b as number) - (a as number)) as [string, number][]
    : [];

  const avgScore = sortedScores.length > 0
    ? (sortedScores.reduce((sum, [, v]) => sum + v, 0) / sortedScores.length).toFixed(1)
    : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between rounded-t-xl z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot size={18} className="text-purple-500" />
              <h2 className="text-lg font-bold text-slate-800">
                {TYPE_LABEL[item.analysis_type] ?? item.analysis_type} 보고서
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {startupName} &middot; {fmtDate(item.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">종합 점수</p>
              <p className="text-2xl font-bold text-slate-800">{avgScore}<span className="text-sm font-normal text-slate-400">/5</span></p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">추천</p>
              {recBadge ? (
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${recBadge.cls}`}>
                  {recBadge.label}
                </span>
              ) : <p className="text-sm text-slate-500">-</p>}
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">리스크</p>
              {riskBadge ? (
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${riskBadge.cls}`}>
                  {riskBadge.label}
                </span>
              ) : <p className="text-sm text-slate-500">-</p>}
            </div>
          </div>

          {/* 항목별 점수 */}
          {sortedScores.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3">평가 항목별 점수</h3>
              <div className="space-y-2">
                {sortedScores.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-28 shrink-0 text-right">
                      {SCORE_LABEL[key] ?? key}
                    </span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          value >= 4 ? "bg-green-500" : value >= 3 ? "bg-blue-500" : value >= 2 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-12 text-right">{value}/5</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 분석 의견 */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">AI 분석 의견</h3>
            <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {mainText.replace(/^📄[^\n]*\n/, "").trim()}
              </p>
            </div>
          </div>

          {/* 핵심 발견 */}
          {findings.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3">핵심 발견</h3>
              <ul className="space-y-2">
                {findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center shrink-0 font-semibold">
                      {i + 1}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 규칙 기반 분석 (참고) */}
          {ruleSection && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3">규칙 기반 분석 (참고)</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {ruleSection.replace(/^📊[^\n]*\n/, "").trim()}
                </p>
              </div>
            </div>
          )}

          {/* 다운로드 + 메타 정보 */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">분석 ID: {item.id}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/ai-analysis/${item.id}/download?format=pdf`, { responseType: "blob" });
                      const url = window.URL.createObjectURL(new Blob([res.data]));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `AI_보고서_${startupName}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch { alert("PDF 다운로드에 실패했습니다."); }
                  }}
                >
                  <Download size={14} />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/ai-analysis/${item.id}/download?format=docx`, { responseType: "blob" });
                      const url = window.URL.createObjectURL(new Blob([res.data]));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `AI_보고서_${startupName}.docx`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch { alert("DOCX 다운로드에 실패했습니다."); }
                  }}
                >
                  <Download size={14} />
                  DOCX
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 패널 ── */
export default function AIAnalysisPanel({ startupId, startupName }: AIAnalysisPanelProps) {
  const [analyses, setAnalyses] = useState<AIAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportItem, setReportItem] = useState<AIAnalysisItem | null>(null);

  const loadAnalyses = useCallback(async () => {
    try {
      const res = await api.get(`/ai-analysis/?startup_id=${startupId}`);
      const data = Array.isArray(res.data) ? res.data : res.data.data ?? [];
      setAnalyses(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const triggerAnalysis = async (analysisType: string) => {
    setTriggering(analysisType);
    try {
      await api.post("/ai-analysis/trigger", {
        startup_id: startupId,
        analysis_type: analysisType,
      });
      // 3초 후 결과 새로고침 (백그라운드 태스크 완료 대기)
      setTimeout(() => {
        loadAnalyses();
        setTriggering(null);
      }, 3000);
    } catch {
      alert("AI 분석 요청에 실패했습니다.");
      setTriggering(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Bot size={16} className="text-purple-500" />
            AI 분석
          </h3>
          <button
            onClick={() => { setLoading(true); loadAnalyses(); }}
            className="text-slate-400 hover:text-slate-600"
            title="새로고침"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* 분석 실행 버튼들 */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {ANALYSIS_TYPES.map((at) => {
            const isRunning = triggering === at.value;
            return (
              <button
                key={at.value}
                onClick={() => triggerAnalysis(at.value)}
                disabled={!!triggering}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${
                  isRunning
                    ? "border-purple-300 bg-purple-50"
                    : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"
                } disabled:opacity-50`}
              >
                <span className="text-sm font-medium text-slate-700">
                  {isRunning && <RefreshCw size={12} className="inline animate-spin mr-1" />}
                  {at.label}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">{at.desc}</span>
              </button>
            );
          })}
        </div>

        {/* 분석 결과 목록 */}
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">로딩 중...</p>
        ) : analyses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            아직 AI 분석 결과가 없습니다. 위 버튼을 눌러 분석을 실행하세요.
          </p>
        ) : (
          <div className="space-y-2">
            {analyses.map((a) => {
              const isExpanded = expandedId === a.id;
              const riskBadge = a.risk_level ? RISK_BADGE[a.risk_level] : null;
              const recBadge = a.recommendation ? REC_BADGE[a.recommendation] : null;

              return (
                <div key={a.id} className="border border-slate-100 rounded-lg">
                  {/* 요약 행 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700">
                        {TYPE_LABEL[a.analysis_type] ?? a.analysis_type}
                      </span>
                      {recBadge && (
                        <span className={`px-2 py-0.5 text-xs rounded ${recBadge.cls}`}>
                          {recBadge.label}
                        </span>
                      )}
                      {riskBadge && (
                        <span className={`px-2 py-0.5 text-xs rounded ${riskBadge.cls}`}>
                          리스크: {riskBadge.label}
                        </span>
                      )}
                      {a.investment_attractiveness && (
                        <span className="text-xs text-slate-500">
                          매력도 {a.investment_attractiveness}/5
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{fmtDate(a.created_at)}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* 상세 펼침 */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* 점수 바 차트 */}
                      {a.scores && Object.keys(a.scores).length > 0 && (
                        <div className="space-y-1.5">
                          {Object.entries(a.scores).filter(([, v]) => typeof v === "number").map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 w-24 shrink-0 text-right">
                                {SCORE_LABEL[key] ?? key}
                              </span>
                              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    value >= 4 ? "bg-green-500" : value >= 3 ? "bg-blue-500" : value >= 2 ? "bg-amber-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${(value / 5) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600 w-8">{value}/5</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 요약 텍스트 */}
                      <div className="bg-slate-50 rounded p-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {a.summary}
                        </p>
                      </div>

                      {/* 보고서 보기 버튼 */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReportItem(a)}
                          className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <FileText size={14} />
                          보고서 보기
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 보고서 모달 */}
      {reportItem && (
        <ReportModal
          item={reportItem}
          startupName={startupName}
          onClose={() => setReportItem(null)}
        />
      )}
    </>
  );
}

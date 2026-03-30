"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError, showSuccess } from "@/lib/toast";

/* ─── 타입 ─── */

interface ScoreItem {
  score: number;
  max: number;
  rationale: string;
}

interface EvaluationScores {
  items: Record<string, ScoreItem>;
  total: number | null;
  is_deeptech: boolean;
}

interface EvaluationData {
  evaluation_id: string;
  status: "completed" | "pending" | "error";
  scores: EvaluationScores | null;
  recommendation: string | null;
  summary: string | null;
}

interface Props {
  evaluationId: string;
  startupName: string;
  /** 초기 데이터 (동기 파싱 결과) — 없으면 polling */
  initialData?: EvaluationData;
}

/* ─── Pass/Fail 체크 항목 ─── */

const FAIL_CHECKS = [
  { key: "legal_disqualification", label: "법적 결격사유" },
  { key: "duplicate_application", label: "중복 지원" },
  { key: "credit_issue", label: "신용 이슈" },
  { key: "portfolio_conflict", label: "포트폴리오 경쟁" },
  { key: "antisocial_model", label: "반사회적 모델" },
] as const;

/* ─── 판정 라벨 ─── */

const VERDICT_LABEL: Record<string, string> = {
  pass: "통과 (PASS)",
  conditional: "조건부 통과",
  hold: "보류",
  decline: "탈락",
};

const VERDICT_COLOR: Record<string, string> = {
  pass: "bg-green-600 hover:bg-green-700 text-white h-10 px-8 font-bold",
  conditional: "bg-amber-500 hover:bg-amber-600 text-white h-9 px-4",
  hold: "bg-slate-400 hover:bg-slate-500 text-white h-9 px-4",
  decline: "bg-red-600 hover:bg-red-700 text-white h-8 px-3",
};

/* ─── 항목 한글 라벨 ─── */

const ITEM_LABELS: Record<string, string> = {
  team: "팀 역량",
  market: "시장 규모",
  traction: "트랙션",
  biz_model: "비즈니스 모델",
  problem: "문제 정의",
  solution: "솔루션 차별화",
  execution: "실행력",
  ac_fit: "AC 적합성",
  trl: "기술 성숙도(TRL)",
  ip_patent: "IP/특허",
};

/* ─── Polling 상수 ─── */

const POLL_INTERVAL = 3_000;
const POLL_TIMEOUT = 5 * 60 * 1_000;

/* ─── 컴포넌트 ─── */

export default function EvaluationReview({
  evaluationId,
  startupName,
  initialData,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<EvaluationData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [failChecks, setFailChecks] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [popoverKey, setPopoverKey] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(Date.now());

  const hasFailCheck = Object.values(failChecks).some(Boolean);

  // Polling (비동기 경우)
  useEffect(() => {
    if (data?.status === "completed" || data?.status === "error") {
      setLoading(false);
      return;
    }

    if (initialData?.status === "completed") return;

    const poll = async () => {
      try {
        const { data: result } = await api.get<EvaluationData>(
          `/ai-analysis/evaluation/${evaluationId}/status`,
        );
        setData(result);
        if (result.status !== "pending") {
          setLoading(false);
          clearInterval(pollRef.current);
        }
      } catch {
        // 네트워크 에러 시 계속 polling
      }

      if (Date.now() - startTimeRef.current > POLL_TIMEOUT) {
        setLoading(false);
        setData((prev) =>
          prev ? { ...prev, status: "error", summary: "평가 처리 중 문제가 발생했습니다. (타임아웃)" } : null,
        );
        clearInterval(pollRef.current);
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    poll(); // 즉시 한 번

    return () => clearInterval(pollRef.current);
  }, [evaluationId, initialData, data?.status]);

  const handleVerdictSubmit = useCallback(
    async (verdict: string) => {
      if (verdict === "decline" && !showDeclineConfirm) {
        setShowDeclineConfirm(true);
        return;
      }

      setSubmitting(true);
      try {
        // 수정된 점수 반영
        const finalScores = { ...data?.scores };
        if (finalScores.items && Object.keys(overrides).length > 0) {
          const items = { ...finalScores.items };
          for (const [key, val] of Object.entries(overrides)) {
            if (items[key] && val !== "") {
              items[key] = { ...items[key], score: Number(val) };
            }
          }
          finalScores.items = items;
          // 총점 재계산
          finalScores.total = Object.values(items).reduce(
            (sum: number, item: unknown) => sum + (item as ScoreItem).score,
            0,
          );
        }

        await api.patch(`/ai-analysis/${data?.evaluation_id}`, {
          scores: finalScores,
          summary: `${data?.summary || ""}\n\n심사자 의견: ${comment}`,
          recommendation: hasFailCheck ? "decline" : verdict,
        });

        showSuccess("판정이 저장되었습니다.");
        router.push("/sourcing/screening");
      } catch (err) {
        showError("판정 저장에 실패했습니다.", err);
      } finally {
        setSubmitting(false);
        setShowDeclineConfirm(false);
      }
    },
    [data, comment, overrides, hasFailCheck, showDeclineConfirm, router],
  );

  // --- 렌더링 ---

  // 로딩 (비동기 대기 중)
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>AI 분석 중...</span>
        </div>
        {/* 스켈레톤 테이블 */}
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 에러
  if (data?.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-red-700">{data.summary || "AI 평가에 실패했습니다."}</p>
        <p className="text-xs text-slate-500 mt-2">수동 평가로 전환해주세요.</p>
      </div>
    );
  }

  if (!data?.scores) {
    return (
      <div className="text-center text-slate-500 py-8">평가 데이터가 없습니다.</div>
    );
  }

  const { items, total, is_deeptech } = data.scores;
  const itemEntries = Object.entries(items);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {startupName} AI 심사 평가
        </h2>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <span>보고서: {itemEntries.length}개 항목</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              is_deeptech
                ? "bg-violet-100 text-violet-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {is_deeptech ? "딥테크" : "일반"}
          </span>
        </div>
      </div>

      {/* Pass/Fail 체크 (점수 테이블 위) */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800 mb-3">결격사유 체크</p>
        <div className="flex flex-wrap gap-4">
          {FAIL_CHECKS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!failChecks[key]}
                onChange={(e) =>
                  setFailChecks((p) => ({ ...p, [key]: e.target.checked }))
                }
                className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-red-700">{label}</span>
            </label>
          ))}
        </div>
        {hasFailCheck && (
          <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm font-medium text-red-800">
            결격사유 해당 → 자동 탈락
          </div>
        )}
      </div>

      {/* 점수 테이블 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-3 py-2 text-slate-600 w-8">#</th>
              <th className="px-3 py-2 text-slate-600">항목</th>
              <th className="px-3 py-2 text-slate-600 w-20 text-center">AI</th>
              <th className="px-3 py-2 text-slate-600 w-20 text-center">수정</th>
              <th className="px-3 py-2 text-slate-600">근거</th>
            </tr>
          </thead>
          <tbody>
            {itemEntries.map(([key, item], idx) => (
              <tr key={key} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {ITEM_LABELS[key] || key}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="font-mono">
                    {item.score}/{item.max}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    min={0}
                    max={item.max}
                    step={0.5}
                    placeholder={String(item.score)}
                    value={overrides[key] ?? ""}
                    onChange={(e) =>
                      setOverrides((p) => ({ ...p, [key]: e.target.value }))
                    }
                    className="w-16 rounded border px-2 py-1 text-center text-sm"
                  />
                </td>
                <td className="px-3 py-2 text-slate-600 relative">
                  <span
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() =>
                      setPopoverKey(popoverKey === key ? null : key)
                    }
                  >
                    {item.rationale.length > 30
                      ? `${item.rationale.slice(0, 30)}...`
                      : item.rationale || "-"}
                  </span>
                  {/* Popover */}
                  {popoverKey === key && item.rationale.length > 30 && (
                    <div className="absolute z-10 left-0 top-full mt-1 w-80 rounded-lg border bg-white p-3 shadow-lg text-sm text-slate-700">
                      {item.rationale}
                      <button
                        className="mt-2 text-xs text-blue-600 hover:underline"
                        onClick={() => setPopoverKey(null)}
                      >
                        닫기
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 종합 */}
      <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
        <div>
          <span className="text-sm text-slate-500">종합</span>
          <span className="ml-2 text-xl font-bold text-slate-900">
            {total ?? "—"}/100
          </span>
        </div>
        {data.recommendation && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              data.recommendation === "pass"
                ? "bg-green-100 text-green-800"
                : data.recommendation === "conditional"
                  ? "bg-amber-100 text-amber-800"
                  : data.recommendation === "hold"
                    ? "bg-slate-200 text-slate-700"
                    : "bg-red-100 text-red-800"
            }`}
          >
            {VERDICT_LABEL[data.recommendation] || data.recommendation}
          </span>
        )}
      </div>

      {/* 심사자 의견 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          심사자 의견
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="평가에 대한 의견을 입력하세요..."
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* 판정 버튼 */}
      <div className="flex items-center gap-3">
        {hasFailCheck ? (
          <Button
            onClick={() => handleVerdictSubmit("decline")}
            disabled={submitting}
            className={VERDICT_COLOR.decline}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            탈락 (결격사유)
          </Button>
        ) : (
          <>
            {(["pass", "conditional", "hold", "decline"] as const).map(
              (verdict) => (
                <Button
                  key={verdict}
                  onClick={() => handleVerdictSubmit(verdict)}
                  disabled={submitting}
                  className={VERDICT_COLOR[verdict]}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {VERDICT_LABEL[verdict]}
                </Button>
              ),
            )}
          </>
        )}
      </div>

      {/* 탈락 확인 모달 */}
      {showDeclineConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-700">탈락 확인</h3>
            <p className="mt-2 text-sm text-slate-600">
              이 기업을 정말 탈락시키겠습니까? 이 결정은 되돌릴 수 있지만,
              관련 팀에 알림이 발송됩니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeclineConfirm(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleVerdictSubmit("decline")}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                탈락 확정
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

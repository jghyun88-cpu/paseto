"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

const ITEMS = [
  { key: "fulltime_commitment", label: "전일제 헌신도" },
  { key: "problem_clarity", label: "문제 정의 명확성" },
  { key: "tech_differentiation", label: "기술/제품 차별성" },
  { key: "market_potential", label: "시장성" },
  { key: "initial_validation", label: "초기 검증/진척도" },
  { key: "strategy_fit", label: "프로그램 적합성" },
] as const;

function gradeLabel(score: number): { grade: string; color: string } {
  if (score >= 30) return { grade: "A (Fast-track)", color: "text-green-600" };
  if (score >= 24) return { grade: "B (Review)", color: "text-amber-600" };
  if (score >= 17) return { grade: "C (Watch)", color: "text-orange-600" };
  return { grade: "D (Pass)", color: "text-red-600" };
}

interface ScreeningDetail {
  id: string;
  startup_id: string;
  fulltime_commitment: number;
  problem_clarity: number;
  tech_differentiation: number;
  market_potential: number;
  initial_validation: number;
  legal_clear: boolean;
  strategy_fit: number;
  overall_score: number;
  recommendation: string;
  risk_notes: string | null;
  handover_memo: string | null;
  created_at: string;
}

export default function ScreeningDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");

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

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const res = await api.get<ScreeningDetail>(`/screenings/${params.id}`);
        const s = res.data;
        setScores({
          fulltime_commitment: s.fulltime_commitment,
          problem_clarity: s.problem_clarity,
          tech_differentiation: s.tech_differentiation,
          market_potential: s.market_potential,
          initial_validation: s.initial_validation,
          strategy_fit: s.strategy_fit,
        });
        setLegalClear(s.legal_clear);
        setRiskNotes(s.risk_notes ?? "");
        setHandoverMemo(s.handover_memo ?? "");

        // 기업명 조회
        try {
          const sRes = await api.get<{ company_name: string }>(`/startups/${s.startup_id}`);
          setCompanyName(sRes.data.company_name);
        } catch { /* ignore */ }
      } catch {
        showError("스크리닝 정보를 불러올 수 없습니다.");
        router.push("/sourcing/screening");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, router]);

  const totalScore = useMemo(() => {
    const sum = Object.values(scores).reduce((a, b) => a + b, 0);
    return sum + (legalClear ? 5 : 0);
  }, [scores, legalClear]);

  const { grade, color } = gradeLabel(totalScore);

  const handleScore = useCallback((key: string, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/screenings/${params.id}`, {
        ...scores,
        legal_clear: legalClear,
        risk_notes: riskNotes || null,
        handover_memo: handoverMemo || null,
      });
      router.push("/sourcing/screening");
    } catch {
      setError("수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [params.id, scores, legalClear, riskNotes, handoverMemo, router]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("이 스크리닝을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/screenings/${params.id}`);
      router.push("/sourcing/screening");
    } catch {
      showError("삭제에 실패했습니다.");
    }
  }, [params.id, router]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/sourcing/screening")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">스크리닝 수정</h2>
            {companyName && <p className="text-sm text-slate-500">{companyName}</p>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 border-red-300 hover:bg-red-50 gap-1">
          <Trash2 size={14} />
          삭제
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        {ITEMS.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-600">{item.label}</label>
              <span className="text-sm font-bold text-blue-600">{scores[item.key]}/5</span>
            </div>
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="legal_clear"
            checked={legalClear}
            onChange={(e) => setLegalClear(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="legal_clear" className="text-sm text-slate-600">법적 이슈 없음 (+5점)</label>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-500">총점</div>
          <div className="text-3xl font-extrabold text-slate-800">{totalScore}<span className="text-base font-normal text-slate-400">/35</span></div>
          <div className={`text-sm font-bold mt-1 ${color}`}>등급 제안: {grade}</div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">핵심 리스크</label>
          <textarea
            value={riskNotes}
            onChange={(e) => setRiskNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">심사팀 인계 메모</label>
          <textarea
            value={handoverMemo}
            onChange={(e) => setHandoverMemo(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "수정 저장"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/sourcing/screening")}>취소</Button>
        </div>
      </div>
    </div>
  );
}

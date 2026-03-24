"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";

interface HandoverDetail {
  id: string;
  startup_id: string;
  from_team: string;
  to_team: string;
  handover_type: string;
  content: {
    screening_results?: { grade: string; overall_score: number; risk_notes?: string };
    company_overview?: { name: string; ceo?: string; industry?: string; stage?: string; one_liner?: string };
    handover_memo?: string;
    key_risks?: string[];
    ic_decision?: string;
    investment_terms?: Record<string, unknown>;
    [key: string]: unknown;
  };
  created_by: string;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated: boolean;
  escalated_at: string | null;
}

const HANDOVER_TYPE_LABELS: Record<string, string> = {
  sourcing_to_review: "소싱 → 심사팀",
  review_to_backoffice: "심사 → 백오피스",
  review_to_incubation: "심사 → 보육팀",
  incubation_to_oi: "보육 → OI팀",
  oi_to_review: "OI → 심사팀",
  backoffice_broadcast: "백오피스 → 전체",
};

export default function HandoverDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [item, setItem] = useState<HandoverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get<HandoverDetail>(`/handovers/${id}`)
      .then((res) => setItem(res.data))
      .catch(() => setError("인계 문서를 찾을 수 없습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("이 인계 문서를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await api.delete(`/handovers/${id}`);
      alert("삭제되었습니다.");
      router.push("/sourcing/handover");
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12 text-slate-400">로딩 중...</div>;
  }

  if (error || !item) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{error || "데이터를 불러올 수 없습니다."}</p>
        <button onClick={() => router.push("/sourcing/handover")} className="mt-4 text-blue-600 hover:underline text-sm">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const overview = item.content.company_overview;
  const screening = item.content.screening_results;

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sourcing/handover")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-800">인계 패키지 상세</h2>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={14} />
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>

      {/* 상태 배지 */}
      <div className="mb-4">
        {item.acknowledged_at ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-700">
            <CheckCircle2 size={13} /> 확인됨 ({fmtDate(item.acknowledged_at)})
          </span>
        ) : item.escalated ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-red-100 text-red-700">
            <AlertTriangle size={13} /> 에스컬레이션
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
            <Clock size={13} /> 대기중
          </span>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">기본 정보</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-500">기업명</dt>
          <dd className="font-medium">{overview?.name ?? "-"}</dd>
          <dt className="text-slate-500">대표자</dt>
          <dd>{overview?.ceo ?? "-"}</dd>
          <dt className="text-slate-500">산업</dt>
          <dd>{overview?.industry ?? "-"}</dd>
          <dt className="text-slate-500">단계</dt>
          <dd>{overview?.stage ?? "-"}</dd>
          <dt className="text-slate-500">인계 경로</dt>
          <dd>{HANDOVER_TYPE_LABELS[item.handover_type] ?? item.handover_type}</dd>
          <dt className="text-slate-500">인계일</dt>
          <dd>{fmtDate(item.created_at)}</dd>
          <dt className="text-slate-500">인수팀</dt>
          <dd>{item.to_team}</dd>
        </dl>
        {overview?.one_liner && (
          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded px-3 py-2">{overview.one_liner}</p>
        )}
      </div>

      {/* 스크리닝 결과 */}
      {screening && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">스크리닝 결과</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-slate-500">등급</dt>
            <dd>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                {screening.grade}
              </span>
            </dd>
            <dt className="text-slate-500">종합 점수</dt>
            <dd className="font-bold">{screening.overall_score}점</dd>
          </dl>
          {screening.risk_notes && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-1">리스크 노트</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded px-3 py-2 whitespace-pre-wrap">
                {screening.risk_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 핵심 리스크 */}
      {item.content.key_risks && item.content.key_risks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">핵심 리스크</h3>
          <ul className="space-y-1">
            {(item.content.key_risks as string[]).map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-red-400 mt-0.5">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 인계 메모 */}
      {item.content.handover_memo && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">인계 메모</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.content.handover_memo as string}</p>
        </div>
      )}
    </div>
  );
}

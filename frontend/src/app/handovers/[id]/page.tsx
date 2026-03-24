"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { TEAM_LABEL, HANDOVER_TYPE_LABEL } from "@/lib/handover-constants";
import HandoverStatusBadge from "@/components/handover/HandoverStatusBadge";
import HandoverContentCard from "@/components/handover/HandoverContentCard";

interface HandoverDetail {
  id: string;
  startup_id: string;
  from_team: string;
  to_team: string;
  handover_type: string;
  content: Record<string, unknown>;
  created_by: string;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated: boolean;
  escalated_at: string | null;
}

export default function HandoverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<HandoverDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api
      .get<HandoverDetail>(`/handovers/${params.id}`)
      .then((res) => setData(res.data))
      .catch(() => alert("인계 문서를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleAcknowledge = useCallback(async () => {
    if (!data) return;
    try {
      const res = await api.post<HandoverDetail>(`/handovers/${data.id}/acknowledge`);
      setData(res.data);
    } catch {
      alert("수신 확인에 실패했습니다.");
    }
  }, [data]);

  if (loading) {
    return <p className="text-center text-slate-400 py-12">로딩 중...</p>;
  }

  if (!data) {
    return <p className="text-center text-slate-400 py-12">인계 문서를 찾을 수 없습니다.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={16} /> 뒤로가기
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              인계 상세 — {HANDOVER_TYPE_LABEL[data.handover_type] ?? data.handover_type}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {TEAM_LABEL[data.from_team]} → {TEAM_LABEL[data.to_team]}
            </p>
          </div>
          <HandoverStatusBadge acknowledgedAt={data.acknowledged_at} escalated={data.escalated} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-4">
          <div>
            <span className="text-slate-500">생성일:</span>{" "}
            <span className="text-slate-800">{fmtDate(data.created_at)}</span>
          </div>
          {data.acknowledged_at && (
            <div>
              <span className="text-slate-500">확인일:</span>{" "}
              <span className="text-slate-800">{fmtDate(data.acknowledged_at)}</span>
            </div>
          )}
          {data.escalated_at && (
            <div>
              <span className="text-slate-500">에스컬레이션:</span>{" "}
              <span className="text-red-600">{fmtDate(data.escalated_at)}</span>
            </div>
          )}
        </div>
      </div>

      <HandoverContentCard handoverType={data.handover_type} content={data.content} />

      {!data.acknowledged_at && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAcknowledge}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            수신 확인
          </button>
        </div>
      )}
    </div>
  );
}

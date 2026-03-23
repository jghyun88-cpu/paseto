"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface Props {
  acknowledgedAt: string | null;
  escalated: boolean;
}

export default function HandoverStatusBadge({ acknowledgedAt, escalated }: Props) {
  if (acknowledgedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 size={13} /> 확인됨
      </span>
    );
  }
  if (escalated) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <AlertTriangle size={13} /> 에스컬레이션
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      <Clock size={13} /> 대기중
    </span>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface JDDetail { id: string; jd_code: string; title: string; team: string; reports_to: string; purpose: string; core_responsibilities: string[]; authority_scope: string[]; approval_required: string[]; daily_tasks: string[]; weekly_tasks: string[]; monthly_tasks: string[]; }

export default function JDDetailPage() {
  const params = useParams(); const router = useRouter();
  const [jd, setJd] = useState<JDDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api.get<JDDetail>(`/jd/${params.id}`).then((r) => setJd(r.data)).catch(() => router.push("/admin/jd")).finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!jd) return <div className="p-8 text-center text-slate-400">JD를 찾을 수 없습니다.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/jd")}><ArrowLeft size={18} /></Button>
        <div><h2 className="text-lg font-bold text-slate-800">{jd.jd_code} — {jd.title}</h2><p className="text-sm text-slate-500">{jd.team} | 보고: {jd.reports_to}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="직무 목적"><p className="text-sm text-slate-600">{jd.purpose}</p></Section>
        <Section title="핵심 책임">{jd.core_responsibilities.map((r, i) => <li key={i} className="text-sm text-slate-600">{r}</li>)}</Section>
        <Section title="권한 범위 (단독 가능)">{jd.authority_scope.map((a, i) => <li key={i} className="text-sm text-emerald-700">{a}</li>)}</Section>
        <Section title="승인 필요 사항">{jd.approval_required.map((a, i) => <li key={i} className="text-sm text-red-600">{a}</li>)}</Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-slate-700 mb-2 pb-1 border-b border-slate-100">{title}</h3>
      <ul className="space-y-1 list-disc list-inside">{children}</ul>
    </div>
  );
}

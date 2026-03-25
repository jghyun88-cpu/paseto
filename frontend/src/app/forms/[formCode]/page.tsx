"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import DynamicFormRenderer, { type FormField } from "@/components/forms/DynamicFormRenderer";
import api from "@/lib/api";

interface TemplateData {
  id: string;
  form_code: string;
  title: string;
  description: string | null;
  owning_team: string;
  fields: FormField[];
}

export default function DynamicFormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formCode = params.formCode as string;
  const startupId = searchParams.get("startup_id");

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<TemplateData>(`/forms/templates/by-code/${formCode}`)
      .then((res) => setTemplate(res.data))
      .catch(() => setError("양식을 찾을 수 없습니다."))
      .finally(() => setLoading(false));
  }, [formCode]);

  const handleSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      if (!template) return;
      setSubmitting(true);
      try {
        await api.post("/forms/submissions/", {
          form_template_id: template.id,
          startup_id: startupId ?? null,
          data,
        });
        setSubmitted(true);
      } catch (err) {
        setError("제출에 실패했습니다. 다시 시도해 주세요.");
      } finally {
        setSubmitting(false);
      }
    },
    [template, startupId],
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }

  if (error && !template) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft size={14} className="mr-1" /> 돌아가기
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-800 mb-2">제출 완료</h2>
        <p className="text-sm text-slate-500 mb-4">
          {template?.title} 양식이 성공적으로 제출되었습니다.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => router.back()}>
            돌아가기
          </Button>
          <Button onClick={() => { setSubmitted(false); setError(null); }}>
            새 양식 작성
          </Button>
        </div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={14} />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{template.title}</h2>
          {template.description && (
            <p className="text-xs text-slate-500">{template.description}</p>
          )}
        </div>
        <span className="ml-auto inline-block px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
          {template.form_code}
        </span>
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <DynamicFormRenderer
          fields={template.fields}
          onSubmit={handleSubmit}
          loading={submitting}
          submitLabel={`${template.title} 제출`}
        />
      </div>
    </div>
  );
}

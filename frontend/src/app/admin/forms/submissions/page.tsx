"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface SubmissionItem {
  id: string;
  form_template_id: string;
  form_name?: string;
  form_code?: string;
  submitted_by?: string;
  submitted_by_name?: string;
  submitted_at: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "임시저장",
  submitted: "제출",
  approved: "승인",
  rejected: "반려",
};

function formatDateTime(dateStr: string): string {
  return dateStr.slice(0, 16).replace("T", " ");
}

export default function FormSubmissionsPage() {
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: SubmissionItem[] }>("/forms/submissions/?page_size=100");
      setItems(res.data.data);
    } catch {
      try {
        const tRes = await api.get<{ data: { id: string; form_code: string; title: string }[] }>(
          "/forms/templates/?page_size=50"
        );
        const templates = tRes.data.data;
        const allSubs: SubmissionItem[] = [];
        for (const t of templates.slice(0, 10)) {
          try {
            const sRes = await api.get<{ data: SubmissionItem[] }>(
              `/forms/templates/${t.id}/submissions/?page_size=20`
            );
            const subs = sRes.data.data.map((s) => ({
              ...s,
              form_name: t.title,
              form_code: t.form_code,
            }));
            allSubs.push(...subs);
          } catch {
            showError("양식 제출 이력을 불러오는 데 실패했습니다.");
          }
        }
        allSubs.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setItems(allSubs);
      } catch {
        showError("데이터를 불러오는 데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">양식 제출 이력</h2>
        <span className="text-xs text-slate-500">총 {items.length}건</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">양식코드</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">양식명</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">제출자</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">제출일시</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-blue-600">
                  {s.form_code ?? "-"}
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  {s.form_name ?? s.form_template_id.slice(0, 8)}
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {s.submitted_by_name ?? s.submitted_by ?? "-"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {formatDateTime(s.submitted_at ?? s.created_at)}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            제출된 양식이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

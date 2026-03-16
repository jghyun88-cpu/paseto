"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface ActionPlanItem {
  area: string;
  current_state: string;
  target_state: string;
  tasks: string;
  owner: string;
  deadline: string;
}

const AREA_OPTIONS = [
  { value: "product", label: "제품" },
  { value: "customer", label: "고객" },
  { value: "revenue", label: "매출" },
  { value: "investment", label: "투자유치" },
  { value: "org", label: "조직" },
];

const EMPTY_ITEM: ActionPlanItem = {
  area: "product",
  current_state: "",
  target_state: "",
  tasks: "",
  owner: "",
  deadline: "",
};

export default function ActionPlanPage() {
  const params = useParams();
  const router = useRouter();
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    api
      .get<{ action_plan: { items: ActionPlanItem[] } | null }>(`/incubations/${params.id}`)
      .then((res) => {
        const plan = res.data.action_plan;
        if (plan?.items?.length) {
          setItems(plan.items);
        } else {
          setItems(AREA_OPTIONS.map((a) => ({ ...EMPTY_ITEM, area: a.value })));
        }
      })
      .catch(() => router.push("/incubation"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const updateItem = useCallback((index: number, field: keyof ActionPlanItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }, []);

  const addRow = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/incubations/${params.id}/action-plan`, { items });
      router.push(`/incubation/${params.id}`);
    } catch {
      setError("액션플랜 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [params.id, items, router]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/incubation/${params.id}`)}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">90일 액션플랜 (PRG-F02)</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-slate-600 font-semibold w-24">영역</th>
              <th className="text-left py-2 px-2 text-slate-600 font-semibold">현재 상태</th>
              <th className="text-left py-2 px-2 text-slate-600 font-semibold">목표 상태</th>
              <th className="text-left py-2 px-2 text-slate-600 font-semibold">실행 과제</th>
              <th className="text-left py-2 px-2 text-slate-600 font-semibold w-24">책임자</th>
              <th className="text-left py-2 px-2 text-slate-600 font-semibold w-32">기한</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 px-2">
                  <select
                    value={item.area}
                    onChange={(e) => updateItem(i, "area", e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                  >
                    {AREA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                {(["current_state", "target_state", "tasks", "owner"] as const).map((field) => (
                  <td key={field} className="py-2 px-2">
                    <input
                      type="text"
                      value={item[field]}
                      onChange={(e) => updateItem(i, field, e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
                    />
                  </td>
                ))}
                <td className="py-2 px-2">
                  <input
                    type="date"
                    value={item.deadline}
                    onChange={(e) => updateItem(i, "deadline", e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
                  />
                </td>
                <td className="py-2 px-2">
                  <button onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={addRow}
          className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          <Plus size={14} /> 행 추가
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex gap-2 mt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/incubation/${params.id}`)}>
          취소
        </Button>
      </div>
    </div>
  );
}

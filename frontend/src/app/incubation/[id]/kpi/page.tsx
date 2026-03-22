"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface KPITrend {
  startup_id: string;
  periods: string[];
  revenue: (number | null)[];
  customer_count: (number | null)[];
  runway_months: (number | null)[];
  warnings: { metric: string; message: string; severity: string }[];
}

const KPI_FIELDS = [
  { key: "revenue", label: "매출 (만원)", required: true },
  { key: "customer_count", label: "고객 수", required: true },
  { key: "poc_count", label: "PoC 건수", required: true },
  { key: "follow_on_meetings", label: "투자미팅 수", required: true },
  { key: "runway_months", label: "Runway (월)", required: true },
  { key: "active_users", label: "활성 사용자", required: false },
  { key: "repurchase_rate", label: "재구매율 (%)", required: false },
  { key: "cac", label: "CAC", required: false },
  { key: "ltv", label: "LTV", required: false },
  { key: "headcount", label: "인원 수", required: false },
];

export default function KPIPage() {
  const params = useParams();
  const router = useRouter();
  const [trend, setTrend] = useState<KPITrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupId, setStartupId] = useState("");

  // 입력 폼
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!params.id) return;
    api
      .get<{ startup_id: string }>(`/incubations/${params.id}`)
      .then(async (res) => {
        const sid = res.data.startup_id;
        setStartupId(sid);
        try {
          const tRes = await api.get<KPITrend>(`/kpi-records/${sid}/trend?months=6`);
          setTrend(tRes.data);
        } catch {
          showError("KPI 트렌드를 불러오는 데 실패했습니다.");
        }
      })
      .catch(() => router.push("/incubation"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!startupId) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { startup_id: startupId, period };
      for (const f of KPI_FIELDS) {
        const val = formData[f.key];
        if (val !== undefined && val !== "") {
          payload[f.key] = f.key.includes("rate") || f.key === "runway_months"
            ? parseFloat(val) : parseInt(val, 10);
        }
      }
      await api.post("/kpi-records/", payload);
      setSuccess("KPI가 저장되었습니다.");
      setFormData({});
      // 트렌드 새로고침
      const tRes = await api.get<KPITrend>(`/kpi-records/${startupId}/trend?months=6`);
      setTrend(tRes.data);
    } catch {
      setError("KPI 저장에 실패했습니다. 해당 기간에 이미 데이터가 있을 수 있습니다.");
    } finally {
      setSaving(false);
    }
  }, [startupId, period, formData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  // 차트 데이터 변환
  const chartData = trend?.periods.map((p, i) => ({
    period: p,
    매출: trend.revenue[i],
    고객수: trend.customer_count[i],
    runway: trend.runway_months[i],
  })) ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/incubation/${params.id}`)}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">KPI 트래커 (PRG-F04)</h2>
      </div>

      {/* 경고 */}
      {trend?.warnings && trend.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {trend.warnings.map((w, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              w.severity === "critical" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
            }`}>
              <AlertTriangle size={16} />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 트렌드 차트 */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">KPI 트렌드</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="매출" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="고객수" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="runway" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 월간 입력 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">월간 KPI 입력</h3>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded-md text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KPI_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-slate-600 mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                step={f.key.includes("rate") || f.key === "runway_months" ? "0.1" : "1"}
                value={formData[f.key] ?? ""}
                onChange={(e) => handleField(f.key, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {success && <p className="text-sm text-green-600 mt-3">{success}</p>}

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "저장 중..." : "KPI 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

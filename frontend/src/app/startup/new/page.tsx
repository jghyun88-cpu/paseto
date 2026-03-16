"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";

const SOURCING_CHANNELS = [
  { value: "university_lab", label: "대학/연구소" },
  { value: "corporate_oi", label: "대기업 오픈이노베이션" },
  { value: "portfolio_referral", label: "포트폴리오/창업자 추천" },
  { value: "vc_cvc_angel", label: "VC/CVC/엔젤 네트워크" },
  { value: "public_program", label: "공공기관/지자체" },
  { value: "competition_forum", label: "경진대회/포럼/학회" },
  { value: "online_application", label: "온라인 상시모집" },
  { value: "direct_outreach", label: "직접 발굴" },
  { value: "tech_expo", label: "기술전시회" },
];

const STAGES = ["예비창업", "Pre-seed", "Seed", "Pre-A", "Series A"];

export default function NewStartupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      const fd = new FormData(e.currentTarget);
      const body = {
        company_name: fd.get("company_name"),
        ceo_name: fd.get("ceo_name"),
        industry: fd.get("industry"),
        stage: fd.get("stage"),
        one_liner: fd.get("one_liner"),
        sourcing_channel: fd.get("sourcing_channel"),
        team_size: fd.get("team_size") ? Number(fd.get("team_size")) : null,
        is_fulltime: fd.get("is_fulltime") === "on",
        location: fd.get("location") || null,
        referrer: fd.get("referrer") || null,
      };

      try {
        const res = await api.post("/startups/", body);
        router.push(`/startup/${res.data.id}`);
      } catch {
        setError("스타트업 등록에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/startup")}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">스타트업 등록</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
        <Field label="기업명 *" name="company_name" required />
        <Field label="대표명 *" name="ceo_name" required />
        <Field label="산업 *" name="industry" placeholder="AI, 반도체, 모빌리티 등" required />

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="단계 *" name="stage" options={STAGES} required />
          <SelectField
            label="소싱 채널 *"
            name="sourcing_channel"
            options={SOURCING_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
            required
          />
        </div>

        <Field label="원라이너 *" name="one_liner" placeholder="한 줄 소개" required />

        <div className="grid grid-cols-2 gap-4">
          <Field label="팀 규모" name="team_size" type="number" />
          <Field label="소재지" name="location" placeholder="서울 강남구" />
        </div>

        <Field label="추천인" name="referrer" />

        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_fulltime" name="is_fulltime" className="rounded" />
          <label htmlFor="is_fulltime" className="text-sm text-slate-600">전일제 여부</label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "등록 중..." : "등록"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/startup")}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: (string | { value: string; label: string })[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
      <select
        name={name}
        required={required}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
      >
        <option value="">선택</option>
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={value} value={value}>{label}</option>
          );
        })}
      </select>
    </div>
  );
}

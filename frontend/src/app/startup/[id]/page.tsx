"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { fmtCorporateNumber, fmtBRN, fmtMillions, fmtIndustry, fmtDate } from "@/lib/formatters";

interface StartupDetail {
  id: string;
  company_name: string;
  corporate_number: string | null;
  business_registration_number: string | null;
  ceo_name: string;
  industry: string;
  stage: string;
  one_liner: string;
  problem_definition: string | null;
  solution_description: string | null;
  team_size: number | null;
  is_fulltime: boolean;
  sourcing_channel: string;
  referrer: string | null;
  current_deal_stage: string;
  portfolio_grade: string | null;
  is_portfolio: boolean;
  founded_date: string | null;
  location: string | null;
  main_customer: string | null;
  current_traction: string | null;
  current_revenue: number | null;
  current_employees: number | null;
  first_meeting_date: string | null;
  batch_id: string | null;
  assigned_manager_id: string | null;
  invested_at: string | null;
  ksic_code: string | null;
  main_product: string | null;
  stock_market: string | null;
  listing_date: string | null;
  total_assets: number | null;
  capital: number | null;
  operating_profit: number | null;
  has_research_lab: boolean | null;
  research_staff_count: number | null;
  city: string | null;
  website: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function StartupProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [startup, setStartup] = useState<StartupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .get<StartupDetail>(`/startups/${params.id}`)
      .then((res) => setStartup(res.data))
      .catch(() => router.push("/startup"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleDelete = useCallback(async () => {
    if (!startup) return;
    if (!window.confirm(`"${startup.company_name}"을(를) 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/startups/${startup.id}`);
      router.push("/startup");
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }, [startup, router]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  }
  if (!startup) {
    return <div className="p-8 text-center text-slate-400">스타트업을 찾을 수 없습니다.</div>;
  }

  const s = startup;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/startup")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">← 목록으로</p>
            <h2 className="text-xl font-bold text-slate-800">{s.company_name}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => router.push(`/startup/${s.id}/edit`)}
          >
            <Pencil size={14} className="mr-1" />
            수정
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 size={14} className="mr-1" />
            삭제
          </Button>
        </div>
      </div>

      {/* 상세 내용 — BHV 스타일 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-8">
        {/* 기업 기본정보 */}
        <Section title="기업 기본정보">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <Field label="기업(고객)명" value={s.company_name} />
            <Field label="설립일자" value={s.founded_date ?? "-"} />
            <Field label="법인(주민)등록번호" value={fmtCorporateNumber(s.corporate_number)} mono />
            <Field label="사업자등록번호" value={fmtBRN(s.business_registration_number)} mono />
            <Field label="대표자" value={s.ceo_name || "-"} />
            <Field label="임직원수" value={s.current_employees ? `${s.current_employees}명` : "-"} />
          </div>
          <div className="mt-4">
            <Field label="소재지" value={s.location || "-"} full />
          </div>
        </Section>

        {/* 사업정보 */}
        <Section title="사업정보">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <Field label="표준산업분류" value={fmtIndustry(s.ksic_code, s.industry)} />
            <Field label="주요사업(제품)" value={s.main_product || "-"} />
            <Field label="상장시장" value={s.stock_market || "-"} />
            <Field label="상장일자" value={s.listing_date ?? "-"} />
          </div>
        </Section>

        {/* 재무정보 */}
        <Section title="재무정보">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <Field label="자산총액(백만원)" value={fmtMillions(s.total_assets)} />
            <Field label="자본금(백만원)" value={fmtMillions(s.capital)} />
            <Field label="매출액(백만원)" value={fmtMillions(s.current_revenue)} />
            <Field label="영업이익(백만원)" value={fmtMillions(s.operating_profit)} />
          </div>
        </Section>

        {/* 연구개발 */}
        <Section title="연구개발">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <Field
              label="기술연구소"
              value={s.has_research_lab === true ? "유" : s.has_research_lab === false ? "무" : "-"}
            />
            <Field
              label="연구인력"
              value={s.research_staff_count ? `${s.research_staff_count}명` : "-"}
            />
          </div>
        </Section>

        {/* 연락처 정보 */}
        <Section title="연락처 정보">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <Field label="도시" value={s.city || "-"} />
            <Field
              label="웹사이트"
              value={s.website || "-"}
              link={s.website ?? undefined}
            />
            <Field label="실무담당" value={s.contact_person || "-"} />
            <Field label="연락처" value={s.contact_phone || "-"} />
            <Field label="이메일" value={s.contact_email || "-"} />
          </div>
        </Section>

        {/* 메모 */}
        {s.notes && (
          <Section title="메모">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{s.notes}</p>
          </Section>
        )}

        {/* 등록일 / 수정일 */}
        <div className="pt-4 border-t border-slate-100 flex gap-6 text-xs text-slate-400">
          <span>등록일: {fmtDate(s.created_at)}</span>
          <span>수정일: {fmtDate(s.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  full,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
  link?: string;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm text-blue-600 hover:underline ${mono ? "font-mono" : ""}`}
        >
          {value}
        </a>
      ) : (
        <p className={`text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}

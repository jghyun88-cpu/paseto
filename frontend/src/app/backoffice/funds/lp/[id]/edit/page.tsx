"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import {
  validateCorporateNumber,
  validateBusinessRegistrationNumber,
  formatCorporateNumber,
  formatBusinessRegistrationNumber,
} from "@/lib/validators";

interface KsicItem { code: string; name: string; }

interface LPDetail {
  id: string; lp_name: string; corporate_number: string | null;
  business_registration_number: string | null; ceo_name: string | null;
  founded_date: string | null; current_employees: number | null;
  location: string | null; industry: string | null; ksic_code: string | null;
  main_product: string | null; stock_market: string | null; listing_date: string | null;
  total_assets: number | null; capital: number | null; current_revenue: number | null;
  operating_profit: number | null; has_research_lab: boolean | null;
  research_staff_count: number | null; city: string | null; website: string | null;
  contact_person: string | null; contact_phone: string | null;
  contact_email: string | null; notes: string | null;
}

const STOCK_MARKETS = [
  { value: "", label: "선택" }, { value: "비상장", label: "비상장" },
  { value: "코스피", label: "코스피" }, { value: "코스닥", label: "코스닥" },
  { value: "코넥스", label: "코넥스" },
];
const RESEARCH_LAB_OPTIONS = [
  { value: "", label: "선택" }, { value: "true", label: "유" }, { value: "false", label: "무" },
];

export default function EditLPPage() {
  const params = useParams();
  const router = useRouter();
  const [lpData, setLpData] = useState<LPDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [corpNumError, setCorpNumError] = useState("");
  const [brnError, setBrnError] = useState("");
  const [corpNum, setCorpNum] = useState("");
  const [brn, setBrn] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const [ksicQuery, setKsicQuery] = useState("");
  const [ksicResults, setKsicResults] = useState<KsicItem[]>([]);
  const [selectedKsic, setSelectedKsic] = useState<KsicItem | null>(null);
  const [showKsicDropdown, setShowKsicDropdown] = useState(false);
  const ksicRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api.get<LPDetail>(`/lps/${params.id}`)
      .then((res) => {
        const s = res.data;
        setLpData(s);
        setCorpNum(s.corporate_number ? formatCorporateNumber(s.corporate_number) : "");
        setBrn(s.business_registration_number ? formatBusinessRegistrationNumber(s.business_registration_number) : "");
        if (s.ksic_code && s.industry) {
          setKsicQuery(`${s.ksic_code} ${s.industry}`);
          setSelectedKsic({ code: s.ksic_code, name: s.industry });
        } else if (s.industry) { setKsicQuery(s.industry); }
        setFormValues({
          lp_name: s.lp_name || "", founded_date: s.founded_date || "",
          ceo_name: s.ceo_name || "", current_employees: s.current_employees?.toString() || "",
          location: s.location || "", main_product: s.main_product || "",
          stock_market: s.stock_market || "", listing_date: s.listing_date || "",
          total_assets: s.total_assets?.toString() || "", capital: s.capital?.toString() || "",
          current_revenue: s.current_revenue?.toString() || "",
          operating_profit: s.operating_profit?.toString() || "",
          has_research_lab: s.has_research_lab === true ? "true" : s.has_research_lab === false ? "false" : "",
          research_staff_count: s.research_staff_count?.toString() || "",
          city: s.city || "", website: s.website || "",
          contact_person: s.contact_person || "", contact_phone: s.contact_phone || "",
          contact_email: s.contact_email || "", notes: s.notes || "",
        });
      })
      .catch(() => router.push("/backoffice/funds/lp"))
      .finally(() => setPageLoading(false));
  }, [params.id, router]);

  useClickOutside(ksicRef, () => setShowKsicDropdown(false));

  const searchKsic = useCallback(async (query: string) => {
    if (query.length < 1) { setKsicResults([]); setShowKsicDropdown(false); return; }
    try {
      const res = await api.get(`/ksic/search?q=${encodeURIComponent(query)}`);
      setKsicResults(res.data); setShowKsicDropdown(res.data.length > 0);
    } catch { setKsicResults([]); }
  }, []);

  const handleKsicInput = useCallback((value: string) => {
    setKsicQuery(value); setSelectedKsic(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchKsic(value), 300);
  }, [searchKsic]);

  const selectKsic = useCallback((item: KsicItem) => {
    setSelectedKsic(item); setKsicQuery(`${item.code} ${item.name}`); setShowKsicDropdown(false);
  }, []);

  const handleCorpNumChange = useCallback((value: string) => {
    setCorpNum(formatCorporateNumber(value));
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length === 13) setCorpNumError(validateCorporateNumber(digits) ? "" : "유효하지 않은 법인(주민)등록번호입니다.");
    else if (digits.length > 0 && digits.length < 13) setCorpNumError("13자리를 입력해주세요.");
    else setCorpNumError("");
  }, []);

  const handleBrnChange = useCallback((value: string) => {
    setBrn(formatBusinessRegistrationNumber(value));
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length === 10) setBrnError(validateBusinessRegistrationNumber(digits) ? "" : "유효하지 않은 사업자등록번호입니다.");
    else if (digits.length > 0 && digits.length < 10) setBrnError("10자리를 입력해주세요.");
    else setBrnError("");
  }, []);

  const updateField = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lpData) return;
    setError("");
    const corpDigits = corpNum.replace(/[^0-9]/g, "");
    if (corpDigits.length > 0 && corpDigits.length !== 13) { setCorpNumError("13자리를 입력해주세요."); return; }
    if (corpDigits.length === 13 && !validateCorporateNumber(corpDigits)) { setCorpNumError("유효하지 않은 법인(주민)등록번호입니다."); return; }
    const brnDigits = brn.replace(/[^0-9]/g, "");
    if (brnDigits.length > 0 && brnDigits.length !== 10) { setBrnError("10자리를 입력해주세요."); return; }
    if (brnDigits.length === 10 && !validateBusinessRegistrationNumber(brnDigits)) { setBrnError("유효하지 않은 사업자등록번호입니다."); return; }

    setLoading(true);
    const toInt = (key: string) => {
      const v = formValues[key];
      return v && v.trim() ? Number(v.replace(/,/g, "")) : null;
    };
    const body = {
      lp_name: formValues.lp_name, founded_date: formValues.founded_date || null,
      corporate_number: corpDigits || null, business_registration_number: brnDigits || null,
      ceo_name: formValues.ceo_name || null, current_employees: toInt("current_employees"),
      location: formValues.location || null,
      ksic_code: selectedKsic?.code || null, industry: selectedKsic?.name || null,
      main_product: formValues.main_product || null, stock_market: formValues.stock_market || null,
      listing_date: formValues.listing_date || null,
      total_assets: toInt("total_assets"), capital: toInt("capital"),
      current_revenue: toInt("current_revenue"), operating_profit: toInt("operating_profit"),
      has_research_lab: formValues.has_research_lab === "true" ? true : formValues.has_research_lab === "false" ? false : null,
      research_staff_count: toInt("research_staff_count"),
      city: formValues.city || null, website: formValues.website || null,
      contact_person: formValues.contact_person || null, contact_phone: formValues.contact_phone || null,
      contact_email: formValues.contact_email || null, notes: formValues.notes || null,
    };
    try {
      await api.patch(`/lps/${lpData.id}`, body);
      router.push(`/backoffice/funds/lp/${lpData.id}`);
    } catch { setError("수정에 실패했습니다."); } finally { setLoading(false); }
  }, [lpData, router, corpNum, brn, selectedKsic, formValues]);

  if (pageLoading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!lpData) return <div className="p-8 text-center text-slate-400">LP를 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/backoffice/funds/lp/${lpData.id}`)}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">LP 수정</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/backoffice/funds/lp/${lpData.id}`)}>취소</Button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <SectionTitle>기업 기본정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <CF label="기업(고객)명" value={formValues.lp_name ?? ""} onChange={(v) => updateField("lp_name", v)} required />
          <CF label="설립일자" value={formValues.founded_date ?? ""} onChange={(v) => updateField("founded_date", v)} type="date" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">법인(주민)등록번호</label>
            <input type="text" value={corpNum} onChange={(e) => handleCorpNumChange(e.target.value)} placeholder="123456-1234567"
              className={`w-full h-9 px-3 border rounded-md text-sm outline-none focus:border-blue-500 ${corpNumError ? "border-red-400" : "border-slate-300"}`} />
            {corpNumError && <p className="text-xs text-red-500 mt-1">{corpNumError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">사업자등록번호</label>
            <input type="text" value={brn} onChange={(e) => handleBrnChange(e.target.value)} placeholder="123-12-12345"
              className={`w-full h-9 px-3 border rounded-md text-sm outline-none focus:border-blue-500 ${brnError ? "border-red-400" : "border-slate-300"}`} />
            {brnError && <p className="text-xs text-red-500 mt-1">{brnError}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CF label="대표자" value={formValues.ceo_name ?? ""} onChange={(v) => updateField("ceo_name", v)} />
          <CF label="임직원수" value={formValues.current_employees ?? ""} onChange={(v) => updateField("current_employees", v)} type="number" />
        </div>
        <CF label="소재지" value={formValues.location ?? ""} onChange={(v) => updateField("location", v)} />

        <SectionTitle>사업정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div ref={ksicRef} className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">표준산업분류</label>
            <input type="text" value={ksicQuery} onChange={(e) => handleKsicInput(e.target.value)} placeholder="코드 또는 업종명 입력"
              className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            {showKsicDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {ksicResults.map((item) => (
                  <button key={`${item.code}-${item.name}`} type="button" onClick={() => selectKsic(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex gap-2">
                    <span className="font-mono text-blue-600 shrink-0">{item.code}</span>
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <CF label="주요사업(제품)" value={formValues.main_product ?? ""} onChange={(v) => updateField("main_product", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CS label="상장시장" value={formValues.stock_market ?? ""} onChange={(v) => updateField("stock_market", v)} options={STOCK_MARKETS} />
          <CF label="상장일자" value={formValues.listing_date ?? ""} onChange={(v) => updateField("listing_date", v)} type="date" />
        </div>

        <SectionTitle>재무정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <MF label="자산총액" value={formValues.total_assets ?? ""} onChange={(v) => updateField("total_assets", v)} />
          <MF label="자본금" value={formValues.capital ?? ""} onChange={(v) => updateField("capital", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MF label="매출액" value={formValues.current_revenue ?? ""} onChange={(v) => updateField("current_revenue", v)} />
          <MF label="영업이익" value={formValues.operating_profit ?? ""} onChange={(v) => updateField("operating_profit", v)} />
        </div>

        <SectionTitle>연구개발</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <CS label="기술연구소" value={formValues.has_research_lab ?? ""} onChange={(v) => updateField("has_research_lab", v)} options={RESEARCH_LAB_OPTIONS} />
          <CF label="연구인력" value={formValues.research_staff_count ?? ""} onChange={(v) => updateField("research_staff_count", v)} type="number" />
        </div>

        <SectionTitle>연락처 정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <CF label="도시" value={formValues.city ?? ""} onChange={(v) => updateField("city", v)} />
          <CF label="웹사이트" value={formValues.website ?? ""} onChange={(v) => updateField("website", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CF label="실무담당" value={formValues.contact_person ?? ""} onChange={(v) => updateField("contact_person", v)} />
          <CF label="연락처" value={formValues.contact_phone ?? ""} onChange={(v) => updateField("contact_phone", v)} />
        </div>
        <CF label="이메일" value={formValues.contact_email ?? ""} onChange={(v) => updateField("contact_email", v)} type="email" />

        <SectionTitle>기타</SectionTitle>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">기타 사항</label>
          <textarea value={formValues.notes ?? ""} onChange={(e) => updateField("notes", e.target.value)} rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/backoffice/funds/lp/${lpData.id}`)}>취소</Button>
          <Button type="submit" disabled={loading || !!corpNumError || !!brnError}>
            {loading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 pt-2">{children}</h3>;
}
function CF({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
    </div>
  );
}
function CS({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function MF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const m = value.trim() ? (Number(value.replace(/,/g, "")) / 1_000_000).toFixed(0) : null;
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}(원)</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
      {m !== null && <p className="text-xs text-blue-600 mt-1">= {Number(m).toLocaleString()} 백만원</p>}
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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

interface KsicItem {
  code: string;
  name: string;
}

const STOCK_MARKETS = [
  { value: "", label: "선택" },
  { value: "비상장", label: "비상장" },
  { value: "코스피", label: "코스피" },
  { value: "코스닥", label: "코스닥" },
  { value: "코넥스", label: "코넥스" },
];

const RESEARCH_LAB_OPTIONS = [
  { value: "", label: "선택" },
  { value: "true", label: "유" },
  { value: "false", label: "무" },
];

export default function LPNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 검증 에러
  const [corpNumError, setCorpNumError] = useState("");
  const [brnError, setBrnError] = useState("");

  // 포맷된 값
  const [corpNum, setCorpNum] = useState("");
  const [brn, setBrn] = useState("");

  // KSIC 자동완성
  const [ksicQuery, setKsicQuery] = useState("");
  const [ksicResults, setKsicResults] = useState<KsicItem[]>([]);
  const [selectedKsic, setSelectedKsic] = useState<KsicItem | null>(null);
  const [showKsicDropdown, setShowKsicDropdown] = useState(false);
  const ksicRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(ksicRef, () => setShowKsicDropdown(false));

  const searchKsic = useCallback(async (query: string) => {
    if (query.length < 1) {
      setKsicResults([]);
      setShowKsicDropdown(false);
      return;
    }
    try {
      const res = await api.get(`/ksic/search?q=${encodeURIComponent(query)}`);
      setKsicResults(res.data);
      setShowKsicDropdown(res.data.length > 0);
    } catch {
      setKsicResults([]);
    }
  }, []);

  const handleKsicInput = useCallback(
    (value: string) => {
      setKsicQuery(value);
      setSelectedKsic(null);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => searchKsic(value), 300);
    },
    [searchKsic],
  );

  const selectKsic = useCallback((item: KsicItem) => {
    setSelectedKsic(item);
    setKsicQuery(`${item.code} ${item.name}`);
    setShowKsicDropdown(false);
  }, []);

  const handleCorpNumChange = useCallback((value: string) => {
    const formatted = formatCorporateNumber(value);
    setCorpNum(formatted);
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length === 13) {
      setCorpNumError(validateCorporateNumber(digits) ? "" : "유효하지 않은 법인(주민)등록번호입니다.");
    } else if (digits.length > 0 && digits.length < 13) {
      setCorpNumError("13자리를 입력해주세요.");
    } else {
      setCorpNumError("");
    }
  }, []);

  const handleBrnChange = useCallback((value: string) => {
    const formatted = formatBusinessRegistrationNumber(value);
    setBrn(formatted);
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length === 10) {
      setBrnError(validateBusinessRegistrationNumber(digits) ? "" : "유효하지 않은 사업자등록번호입니다.");
    } else if (digits.length > 0 && digits.length < 10) {
      setBrnError("10자리를 입력해주세요.");
    } else {
      setBrnError("");
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      const corpDigits = corpNum.replace(/[^0-9]/g, "");
      if (corpDigits.length > 0 && corpDigits.length !== 13) {
        setCorpNumError("13자리를 입력해주세요.");
        return;
      }
      if (corpDigits.length === 13 && !validateCorporateNumber(corpDigits)) {
        setCorpNumError("유효하지 않은 법인(주민)등록번호입니다.");
        return;
      }

      const brnDigits = brn.replace(/[^0-9]/g, "");
      if (brnDigits.length > 0 && brnDigits.length !== 10) {
        setBrnError("10자리를 입력해주세요.");
        return;
      }
      if (brnDigits.length === 10 && !validateBusinessRegistrationNumber(brnDigits)) {
        setBrnError("유효하지 않은 사업자등록번호입니다.");
        return;
      }

      setLoading(true);
      const fd = new FormData(e.currentTarget);

      const toInt = (key: string) => {
        const v = fd.get(key);
        return v && String(v).trim() ? Number(String(v).replace(/,/g, "")) : null;
      };

      const body = {
        lp_name: fd.get("lp_name"),
        founded_date: fd.get("founded_date") || null,
        corporate_number: corpDigits || null,
        business_registration_number: brnDigits || null,
        ceo_name: fd.get("ceo_name") || null,
        current_employees: toInt("current_employees"),
        location: fd.get("location") || null,
        ksic_code: selectedKsic?.code || null,
        industry: selectedKsic?.name || (fd.get("industry") as string) || null,
        main_product: fd.get("main_product") || null,
        stock_market: fd.get("stock_market") || null,
        listing_date: fd.get("listing_date") || null,
        total_assets: toInt("total_assets"),
        capital: toInt("capital"),
        current_revenue: toInt("current_revenue"),
        operating_profit: toInt("operating_profit"),
        has_research_lab: fd.get("has_research_lab") === "true" ? true : fd.get("has_research_lab") === "false" ? false : null,
        research_staff_count: toInt("research_staff_count"),
        city: fd.get("city") || null,
        website: fd.get("website") || null,
        contact_person: fd.get("contact_person") || null,
        contact_phone: fd.get("contact_phone") || null,
        contact_email: fd.get("contact_email") || null,
        notes: fd.get("notes") || null,
      };

      try {
        await api.post("/lps", body);
        router.push("/backoffice/funds/lp");
      } catch {
        setError("LP 등록에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [router, corpNum, brn, selectedKsic],
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/backoffice/funds/lp")}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">LP 등록</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/backoffice/funds/lp")}>
          목록으로
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        {/* ── 기업 기본정보 ── */}
        <SectionTitle>기업 기본정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="기업(고객)명" name="lp_name" required placeholder="예: (주)한국투자공사" />
          <Field label="설립일자" name="founded_date" type="date" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">법인(주민)등록번호 *</label>
            <input
              type="text"
              value={corpNum}
              onChange={(e) => handleCorpNumChange(e.target.value)}
              placeholder="123456-1234567"
              required
              className={`w-full h-9 px-3 border rounded-md text-sm outline-none focus:border-blue-500 ${
                corpNumError ? "border-red-400" : "border-slate-300"
              }`}
            />
            {corpNumError && <p className="text-xs text-red-500 mt-1">{corpNumError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">사업자등록번호</label>
            <input
              type="text"
              value={brn}
              onChange={(e) => handleBrnChange(e.target.value)}
              placeholder="123-12-12345"
              className={`w-full h-9 px-3 border rounded-md text-sm outline-none focus:border-blue-500 ${
                brnError ? "border-red-400" : "border-slate-300"
              }`}
            />
            {brnError && <p className="text-xs text-red-500 mt-1">{brnError}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="대표자" name="ceo_name" />
          <Field label="임직원수" name="current_employees" type="number" />
        </div>
        <Field label="소재지" name="location" placeholder="서울시 강남구 테헤란로 123" />

        {/* ── 사업정보 ── */}
        <SectionTitle>사업정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div ref={ksicRef} className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">표준산업분류</label>
            <input
              type="text"
              value={ksicQuery}
              onChange={(e) => handleKsicInput(e.target.value)}
              placeholder="코드 또는 업종명 입력 (예: C26)"
              className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
            {showKsicDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {ksicResults.map((item) => (
                  <button
                    key={`${item.code}-${item.name}`}
                    type="button"
                    onClick={() => selectKsic(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex gap-2"
                  >
                    <span className="font-mono text-blue-600 shrink-0">{item.code}</span>
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Field label="주요사업(제품)" name="main_product" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="상장시장" name="stock_market" options={STOCK_MARKETS} />
          <Field label="상장일자" name="listing_date" type="date" />
        </div>

        {/* ── 재무정보 ── */}
        <SectionTitle>재무정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <MoneyField label="자산총액" name="total_assets" />
          <MoneyField label="자본금" name="capital" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MoneyField label="매출액" name="current_revenue" />
          <MoneyField label="영업이익" name="operating_profit" />
        </div>

        {/* ── 연구개발 ── */}
        <SectionTitle>연구개발</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="기술연구소" name="has_research_lab" options={RESEARCH_LAB_OPTIONS} />
          <Field label="연구인력" name="research_staff_count" type="number" />
        </div>

        {/* ── 연락처 정보 ── */}
        <SectionTitle>연락처 정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="도시" name="city" />
          <Field label="웹사이트" name="website" placeholder="https://example.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="실무담당" name="contact_person" />
          <Field label="연락처" name="contact_phone" placeholder="010-1234-1234" />
        </div>
        <Field label="이메일" name="contact_email" type="email" />

        {/* ── 기타 ── */}
        <SectionTitle>기타</SectionTitle>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">기타 사항</label>
          <textarea
            name="notes"
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/backoffice/funds/lp")}>
            취소
          </Button>
          <Button type="submit" disabled={loading || !!corpNumError || !!brnError}>
            {loading ? "등록 중..." : "등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 pt-2">{children}</h3>
  );
}

function Field({
  label, name, type = "text", placeholder, required,
}: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">
        {label}{required && " *"}
      </label>
      <input type={type} name={name} placeholder={placeholder} required={required}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
    </div>
  );
}

function SelectField({
  label, name, options,
}: { label: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <select name={name} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function MoneyField({ label, name }: { label: string; name: string }) {
  const [raw, setRaw] = useState("");
  const millions = raw.trim() ? (Number(raw.replace(/,/g, "")) / 1_000_000).toFixed(1) : null;
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}(원)</label>
      <input type="number" name={name} value={raw} onChange={(e) => setRaw(e.target.value)}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
      {millions !== null && <p className="text-xs text-blue-600 mt-1">= {millions} 백만원</p>}
    </div>
  );
}

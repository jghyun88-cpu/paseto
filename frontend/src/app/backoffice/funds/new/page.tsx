"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

const FUND_ACCOUNT_TYPES = [
  { value: "", label: "선택" },
  { value: "AF", label: "단독조합(AF)" },
  { value: "CF", label: "공동조합(CF)" },
  { value: "EF", label: "자본계정(EF)" },
];

const FUND_TYPES = [
  { value: "", label: "선택" },
  { value: "individual_union", label: "개인투자조합" },
  { value: "venture_fund", label: "벤처투자조합" },
  { value: "new_tech_fund", label: "신기술사업투자조합" },
  { value: "institutional_pf", label: "기관전용사모펀드" },
];

const PAYMENT_METHODS = [
  { value: "", label: "선택" },
  { value: "일시납입", label: "일시납입" },
  { value: "분할납입", label: "분할납입" },
  { value: "수시납입", label: "수시납입" },
];

interface LPOption {
  id: string;
  lp_name: string;
  corporate_number: string | null;
  ceo_name: string | null;
}

interface GPRow {
  gp: string;
  manager: string;
}

interface ObligationRow {
  field: string;
  amount: string;
}

interface InvestorRow {
  name: string;
  amount: string;
}

export default function FundNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // LP 검색 자동완성
  const searchLp = useCallback(async (query: string): Promise<LPOption[]> => {
    if (query.length < 1) return [];
    try {
      const res = await api.get(`/lps?search=${encodeURIComponent(query)}&page_size=20`);
      return res.data.data ?? [];
    } catch {
      return [];
    }
  }, []);

  const [gpRows, setGpRows] = useState<GPRow[]>([{ gp: "", manager: "" }]);
  const [obligations, setObligations] = useState<ObligationRow[]>([{ field: "", amount: "" }]);
  const [investors, setInvestors] = useState<InvestorRow[]>([{ name: "", amount: "" }]);

  const addGpRow = useCallback(() => {
    if (gpRows.length < 5) setGpRows((prev) => [...prev, { gp: "", manager: "" }]);
  }, [gpRows.length]);

  const removeGpRow = useCallback((idx: number) => {
    setGpRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateGpRow = useCallback((idx: number, field: keyof GPRow, value: string) => {
    setGpRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }, []);

  const addObligation = useCallback(() => {
    if (obligations.length < 5) setObligations((prev) => [...prev, { field: "", amount: "" }]);
  }, [obligations.length]);

  const removeObligation = useCallback((idx: number) => {
    setObligations((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateObligation = useCallback((idx: number, field: keyof ObligationRow, value: string) => {
    setObligations((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }, []);

  const addInvestor = useCallback(() => {
    if (investors.length < 30) setInvestors((prev) => [...prev, { name: "", amount: "" }]);
  }, [investors.length]);

  const removeInvestor = useCallback((idx: number) => {
    setInvestors((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateInvestor = useCallback((idx: number, field: keyof InvestorRow, value: string) => {
    setInvestors((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      const fd = new FormData(e.currentTarget);

      const totalAmountRaw = fd.get("total_amount");
      const totalAmount = totalAmountRaw ? Number(String(totalAmountRaw).replace(/,/g, "")) : 0;

      const benchmarkRaw = fd.get("benchmark_return_rate");
      const benchmarkRate = benchmarkRaw && String(benchmarkRaw).trim() ? Number(benchmarkRaw) : null;

      const keyManagers = JSON.stringify(
        gpRows.filter((r) => r.gp || r.manager)
      );

      const investmentObligations = JSON.stringify(
        obligations
          .filter((r) => r.field || r.amount)
          .map((r) => ({
            field: r.field,
            amount: r.amount ? Number(r.amount.replace(/,/g, "")) : 0,
          }))
      );

      const body = {
        fund_code: fd.get("fund_code") || null,
        fund_name: fd.get("fund_name"),
        fund_type: fd.get("fund_type") || "individual_union",
        fund_account_type: fd.get("fund_account_type") || null,
        total_amount: totalAmount,
        formation_date: fd.get("formation_date") || null,
        gp_entity: gpRows[0]?.gp || "",
        key_managers: keyManagers,
        payment_method: fd.get("payment_method") || null,
        benchmark_return_rate: benchmarkRate,
        investment_start_date: fd.get("investment_start_date") || null,
        investment_end_date: fd.get("investment_end_date") || null,
        duration_start_date: fd.get("duration_start_date") || null,
        duration_end_date: fd.get("duration_end_date") || null,
        dissolution_date: fd.get("dissolution_date") || null,
        liquidation_date: fd.get("liquidation_date") || null,
        management_fee: fd.get("management_fee") || null,
        performance_fee: fd.get("performance_fee") || null,
        additional_performance_fee: fd.get("additional_performance_fee") || null,
        priority_loss_reserve: fd.get("priority_loss_reserve") || null,
        investment_obligations: investmentObligations,
        notes: fd.get("notes") || null,
      };

      try {
        const res = await api.post("/funds/", body);
        const fundId = res.data.id;

        // 출자자(LP) 등록
        const validInvestors = investors.filter((inv) => inv.name && inv.amount);
        for (const inv of validInvestors) {
          const lpAmount = Number(inv.amount.replace(/,/g, ""));
          await api.post(`/funds/${fundId}/lps`, {
            lp_name: inv.name,
            lp_type: "corporate",
            committed_amount: lpAmount,
            paid_in_amount: 0,
          });
        }

        router.push("/backoffice/funds");
      } catch {
        setError("조합 등록에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [router, gpRows, obligations, investors],
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/backoffice/funds")}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">조합정보 등록</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/backoffice/funds")}>
          목록으로
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        {/* ── 조합 기본정보 ── */}
        <SectionTitle>조합 기본정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="조합코드" name="fund_code" required placeholder="예: AFZ512A" />
          <SelectField label="조합계정" name="fund_account_type" options={FUND_ACCOUNT_TYPES} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="조합명칭" name="fund_name" required placeholder="예: 2025 딥테크 1호 투자조합" />
          <Field label="조합결성일자" name="formation_date" type="date" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="조합유형" name="fund_type" options={FUND_TYPES} />
          <MoneyField
            label="약정총액"
            name="total_amount"
          />
        </div>

        {/* ── 업무집행조합원(GP) / 핵심운용인력 ── */}
        <SectionTitle>업무집행조합원(GP) / 핵심운용인력</SectionTitle>
        {gpRows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-4 items-end">
            <LPSearchField
              label={idx === 0 ? "업무집행조합원(GP)" : `GP ${idx + 1}`}
              value={row.gp}
              onChange={(v) => updateGpRow(idx, "gp", v)}
              onSearch={searchLp}
              placeholder="고객명 또는 법인번호 입력"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">핵심운용인력</label>
                <input
                  type="text"
                  value={row.manager}
                  onChange={(e) => updateGpRow(idx, "manager", e.target.value)}
                  placeholder="운용인력 이름"
                  className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
                />
              </div>
              {idx > 0 && (
                <Button type="button" variant="ghost" size="icon" className="shrink-0 mt-auto" onClick={() => removeGpRow(idx)}>
                  <Trash2 size={16} className="text-red-400" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {gpRows.length < 5 && (
          <button type="button" onClick={addGpRow} className="text-sm text-blue-600 hover:underline">
            + 추가 (최대 5개)
          </button>
        )}

        {/* ── 납입 및 수익 ── */}
        <SectionTitle>납입 및 수익</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="납입방식" name="payment_method" options={PAYMENT_METHODS} />
          <Field label="기준수익률(%)" name="benchmark_return_rate" type="number" step="0.01" placeholder="예: 8.00" />
        </div>

        {/* ── 주요 일자 ── */}
        <SectionTitle>주요 일자</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="투자기산일" name="investment_start_date" type="date" />
          <Field label="투자만료일" name="investment_end_date" type="date" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="존속기산일" name="duration_start_date" type="date" />
          <Field label="존속만료일" name="duration_end_date" type="date" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="해산만료일" name="dissolution_date" type="date" />
          <Field label="청산만료일" name="liquidation_date" type="date" />
        </div>

        {/* ── 보수 ── */}
        <SectionTitle>보수</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="관리보수" name="management_fee" />
          <Field label="성과보수" name="performance_fee" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="추가성과보수" name="additional_performance_fee" />
          <Field label="우선손실충당" name="priority_loss_reserve" />
        </div>

        {/* ── 투자의무분야 / 투자의무금액 ── */}
        <SectionTitle>투자의무분야 / 투자의무금액</SectionTitle>
        {obligations.map((row, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">투자의무분야</label>
              <input
                type="text"
                value={row.field}
                onChange={(e) => updateObligation(idx, "field", e.target.value)}
                placeholder="예: 반도체 딥테크 스타트업에 투자"
                className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">투자의무금액(원)</label>
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => updateObligation(idx, "amount", e.target.value)}
                  placeholder="원 단위로 입력"
                  className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
                />
                {row.amount.trim() && Number(row.amount) > 0 && (
                  <p className="text-xs text-blue-600 mt-1">= {(Number(row.amount) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} 백만원</p>
                )}
              </div>
              {idx > 0 && (
                <Button type="button" variant="ghost" size="icon" className="shrink-0 mt-auto" onClick={() => removeObligation(idx)}>
                  <Trash2 size={16} className="text-red-400" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {obligations.length < 5 && (
          <button type="button" onClick={addObligation} className="text-sm text-blue-600 hover:underline">
            + 추가 (최대 5개)
          </button>
        )}

        {/* ── 출자자 / 출자약정액 ── */}
        <SectionTitle>출자자 / 출자약정액</SectionTitle>
        {investors.map((row, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-4 items-end">
            <LPSearchField
              label="출자자"
              value={row.name}
              onChange={(v) => updateInvestor(idx, "name", v)}
              onSearch={searchLp}
              placeholder="고객명 또는 법인번호 입력"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">출자약정액(원)</label>
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => updateInvestor(idx, "amount", e.target.value)}
                  placeholder="원 단위로 입력"
                  className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
                />
                {row.amount.trim() && Number(row.amount) > 0 && (
                  <p className="text-xs text-blue-600 mt-1">= {(Number(row.amount) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} 백만원</p>
                )}
              </div>
              {idx > 0 && (
                <Button type="button" variant="ghost" size="icon" className="shrink-0 mt-auto" onClick={() => removeInvestor(idx)}>
                  <Trash2 size={16} className="text-red-400" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {investors.length < 30 && (
          <button type="button" onClick={addInvestor} className="text-sm text-blue-600 hover:underline">
            + 추가 (최대 30개)
          </button>
        )}

        {/* ── 기타 ── */}
        <SectionTitle>기타</SectionTitle>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">기타사항</label>
          <textarea
            name="notes"
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/backoffice/funds")}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "등록 중..." : "등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ── 섹션 제목 ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 pt-2">{children}</h3>
  );
}

/* ── 금액 입력 필드 (원 입력 → 백만원 표시) ── */
function MoneyField({ label, name }: { label: string; name: string }) {
  const [raw, setRaw] = useState("");
  const n = raw.trim() ? Number(raw.replace(/,/g, "")) : NaN;
  const millions = !isNaN(n) && n > 0 ? (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) : null;
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}(원)</label>
      <input
        type="number"
        name={name}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="원 단위로 입력"
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
      />
      {millions !== null && (
        <p className="text-xs text-blue-600 mt-1">= {millions} 백만원</p>
      )}
    </div>
  );
}

/* ── 공통 입력 필드 ── */
function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

/* ── 공통 셀렉트 필드 ── */
function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <select
        name={name}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── LP 검색 자동완성 (KSIC 자동완성과 동일 패턴) ── */
function LPSearchField({
  label,
  value,
  onChange,
  onSearch,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSearch: (q: string) => Promise<LPOption[]>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LPOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useClickOutside(ref, () => setShowDropdown(false));

  const handleInput = useCallback((v: string) => {
    setQuery(v);
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (v.length < 1) { setResults([]); setShowDropdown(false); return; }
      const items = await onSearch(v);
      setResults(items);
      setShowDropdown(items.length > 0);
    }, 300);
  }, [onChange, onSearch]);

  const selectItem = useCallback((lp: LPOption) => {
    setQuery(lp.lp_name);
    onChange(lp.lp_name);
    setShowDropdown(false);
  }, [onChange]);

  const fmtCorp = (v: string | null) => {
    if (!v) return "";
    const d = v.replace(/[^0-9]/g, "");
    if (d.length === 13) return `${d.slice(0, 6)}-${d.charAt(6)}******`;
    return v;
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
      />
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((lp) => (
            <button
              key={lp.id}
              type="button"
              onClick={() => selectItem(lp)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex gap-2"
            >
              <span className="font-medium text-slate-800">{lp.lp_name}</span>
              {lp.corporate_number && (
                <span className="font-mono text-xs text-slate-400">{fmtCorp(lp.corporate_number)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

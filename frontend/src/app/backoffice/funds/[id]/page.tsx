"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";
import { fmtDate } from "@/lib/formatters";

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

const STATUS_OPTIONS = [
  { value: "forming", label: "결성중" },
  { value: "active", label: "운용중" },
  { value: "winding_down", label: "회수기" },
  { value: "dissolved", label: "청산" },
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

interface FundDetail {
  id: string;
  fund_code: string | null;
  fund_name: string;
  fund_type: string;
  fund_account_type: string | null;
  total_amount: number;
  formation_date: string | null;
  expiry_date: string | null;
  gp_entity: string | null;
  key_managers: string | null;
  payment_method: string | null;
  benchmark_return_rate: number | null;
  investment_start_date: string | null;
  investment_end_date: string | null;
  duration_start_date: string | null;
  duration_end_date: string | null;
  dissolution_date: string | null;
  liquidation_date: string | null;
  management_fee: string | null;
  performance_fee: string | null;
  additional_performance_fee: string | null;
  priority_loss_reserve: string | null;
  investment_obligations: string | null;
  notes: string | null;
  status: string;
}

export default function FundEditPage() {
  const router = useRouter();
  const params = useParams();
  const fundId = params.id as string;

  const [fund, setFund] = useState<FundDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // LP 검색 자동완성
  const searchLp = useCallback(async (query: string): Promise<LPOption[]> => {
    if (query.length < 1) return [];
    try {
      const res = await api.get(`/lps?search=${encodeURIComponent(query)}&page_size=20`);
      return res.data.data ?? [];
    } catch {
      showError("LP 검색에 실패했습니다.");
      return [];
    }
  }, []);

  const [gpRows, setGpRows] = useState<GPRow[]>([{ gp: "", manager: "" }]);
  const [obligations, setObligations] = useState<ObligationRow[]>([{ field: "", amount: "" }]);
  const [investors, setInvestors] = useState<InvestorRow[]>([{ name: "", amount: "" }]);

  // --- GP rows ---
  const addGpRow = useCallback(() => {
    if (gpRows.length < 5) setGpRows((prev) => [...prev, { gp: "", manager: "" }]);
  }, [gpRows.length]);
  const removeGpRow = useCallback((idx: number) => {
    setGpRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const updateGpRow = useCallback((idx: number, field: keyof GPRow, value: string) => {
    setGpRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }, []);

  // --- Obligation rows ---
  const addObligation = useCallback(() => {
    if (obligations.length < 5) setObligations((prev) => [...prev, { field: "", amount: "" }]);
  }, [obligations.length]);
  const removeObligation = useCallback((idx: number) => {
    setObligations((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const updateObligation = useCallback((idx: number, field: keyof ObligationRow, value: string) => {
    setObligations((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }, []);

  // --- Investor rows ---
  const addInvestor = useCallback(() => {
    if (investors.length < 30) setInvestors((prev) => [...prev, { name: "", amount: "" }]);
  }, [investors.length]);
  const removeInvestor = useCallback((idx: number) => {
    setInvestors((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const updateInvestor = useCallback((idx: number, field: keyof InvestorRow, value: string) => {
    setInvestors((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }, []);

  // --- 데이터 로드 ---
  useEffect(() => {
    (async () => {
      try {
        const [fundRes, lpRes] = await Promise.all([
          api.get(`/funds/${fundId}`),
          api.get(`/funds/${fundId}/lps`),
        ]);
        const f: FundDetail = fundRes.data;
        setFund(f);

        // key_managers JSON → GP rows
        try {
          const km = JSON.parse(f.key_managers || "[]");
          if (Array.isArray(km) && km.length > 0) {
            setGpRows(km.map((r: { gp?: string; manager?: string }) => ({
              gp: r.gp ?? "",
              manager: r.manager ?? "",
            })));
          }
        } catch { showError("GP/운용인력 데이터 파싱에 실패했습니다."); }

        // investment_obligations JSON → obligation rows
        try {
          const ob = JSON.parse(f.investment_obligations || "[]");
          if (Array.isArray(ob) && ob.length > 0) {
            setObligations(ob.map((r: { field?: string; amount?: number }) => ({
              field: r.field ?? "",
              amount: r.amount ? String(r.amount) : "",
            })));
          }
        } catch { showError("투자의무 데이터 파싱에 실패했습니다."); }

        // LP 목록 → investor rows
        const lps = Array.isArray(lpRes.data) ? lpRes.data : lpRes.data.data ?? [];
        if (lps.length > 0) {
          setInvestors(lps.map((lp: { lp_name: string; committed_amount: number }) => ({
            name: lp.lp_name,
            amount: lp.committed_amount ? String(lp.committed_amount) : "",
          })));
        }
      } catch {
        setError("조합 정보를 불러올 수 없습니다.");
      } finally {
        setPageLoading(false);
      }
    })();
  }, [fundId]);

  // --- 저장 ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!fund) return;
      setMessage("");
      setError("");
      setSaving(true);

      const fd = new FormData(e.currentTarget);

      const totalAmountRaw = fd.get("total_amount");
      const totalAmount = totalAmountRaw ? Number(String(totalAmountRaw).replace(/,/g, "")) : 0;

      const benchmarkRaw = fd.get("benchmark_return_rate");
      const benchmarkRate = benchmarkRaw && String(benchmarkRaw).trim() ? Number(benchmarkRaw) : null;

      const keyManagers = JSON.stringify(gpRows.filter((r) => r.gp || r.manager));

      const investmentObligations = JSON.stringify(
        obligations
          .filter((r) => r.field || r.amount)
          .map((r) => ({
            field: r.field,
            amount: r.amount ? Number(r.amount.replace(/,/g, "")) : 0,
          }))
      );

      const body = {
        fund_type: fd.get("fund_type") || null,
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
        status: fd.get("status") || fund.status,
      };

      try {
        await api.patch(`/funds/${fundId}`, body);

        // 출자자(LP) 벌크 동기화
        const investorPayload = investors
          .filter((r) => r.name.trim())
          .map((r) => ({
            lp_name: r.name,
            committed_amount: r.amount ? Number(r.amount.replace(/,/g, "")) : 0,
          }));
        await api.put(`/funds/${fundId}/lps/sync`, { investors: investorPayload });

        setMessage("저장되었습니다.");
      } catch {
        setError("저장에 실패했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [fund, fundId, gpRows, obligations, investors],
  );

  // --- 삭제 ---
  const handleDelete = useCallback(async () => {
    if (!confirm("이 조합을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/funds/${fundId}`);
      router.push("/backoffice/funds");
    } catch {
      setError("삭제에 실패했습니다.");
    }
  }, [fundId, router]);

  if (pageLoading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
  if (!fund) return <div className="p-8 text-center text-red-500">{error || "조합을 찾을 수 없습니다."}</div>;

  const d = (v: string | null) => fmtDate(v);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/backoffice/funds")}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">조합정보 수정</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/backoffice/funds")}>
            목록으로
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 size={16} className="mr-1" />
            삭제
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        {/* ── 조합 기본정보 ── */}
        <SectionTitle>조합 기본정보</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="조합코드" value={fund.fund_code ?? "-"} />
          <SelectField label="조합계정" name="fund_account_type" options={FUND_ACCOUNT_TYPES} defaultValue={fund.fund_account_type ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="조합명칭" value={fund.fund_name} />
          <Field label="조합결성일자" name="formation_date" type="date" defaultValue={d(fund.formation_date)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="조합유형" name="fund_type" options={FUND_TYPES} defaultValue={fund.fund_type} />
          <MoneyField label="약정총액" name="total_amount" defaultValue={fund.total_amount ? String(fund.total_amount) : ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="상태" name="status" options={STATUS_OPTIONS} defaultValue={fund.status} />
          <div />
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
          <SelectField label="납입방식" name="payment_method" options={PAYMENT_METHODS} defaultValue={fund.payment_method ?? ""} />
          <Field label="기준수익률(%)" name="benchmark_return_rate" type="number" step="0.01" defaultValue={fund.benchmark_return_rate != null ? String(fund.benchmark_return_rate) : ""} placeholder="예: 8.00" />
        </div>

        {/* ── 주요 일자 ── */}
        <SectionTitle>주요 일자</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="투자기산일" name="investment_start_date" type="date" defaultValue={d(fund.investment_start_date)} />
          <Field label="투자만료일" name="investment_end_date" type="date" defaultValue={d(fund.investment_end_date)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="존속기산일" name="duration_start_date" type="date" defaultValue={d(fund.duration_start_date)} />
          <Field label="존속만료일" name="duration_end_date" type="date" defaultValue={d(fund.duration_end_date)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="해산만료일" name="dissolution_date" type="date" defaultValue={d(fund.dissolution_date)} />
          <Field label="청산만료일" name="liquidation_date" type="date" defaultValue={d(fund.liquidation_date)} />
        </div>

        {/* ── 보수 ── */}
        <SectionTitle>보수</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="관리보수" name="management_fee" defaultValue={fund.management_fee ?? ""} />
          <Field label="성과보수" name="performance_fee" defaultValue={fund.performance_fee ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="추가성과보수" name="additional_performance_fee" defaultValue={fund.additional_performance_fee ?? ""} />
          <Field label="우선손실충당" name="priority_loss_reserve" defaultValue={fund.priority_loss_reserve ?? ""} />
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
            defaultValue={fund.notes ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y"
          />
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/backoffice/funds")}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            <Save size={16} className="mr-1" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ── 섹션 제목 ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 pt-2">{children}</h3>;
}

/* ── 읽기전용 필드 (조합코드, 조합명칭) ── */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <div className="w-full h-9 px-3 flex items-center border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-700">
        {value}
      </div>
    </div>
  );
}

/* ── 금액 입력 필드 (원 입력 → 백만원 표시) ── */
function MoneyField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  const [raw, setRaw] = useState(defaultValue ?? "");
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
  label, name, type = "text", placeholder, defaultValue, step,
}: {
  label: string; name: string; type?: string; placeholder?: string; defaultValue?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

/* ── 공통 셀렉트 필드 ── */
function SelectField({
  label, name, options, defaultValue,
}: {
  label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── LP 검색 자동완성 ── */
function LPSearchField({
  label, value, onChange, onSearch, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  onSearch: (q: string) => Promise<LPOption[]>; placeholder?: string;
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
    const digits = v.replace(/[^0-9]/g, "");
    if (digits.length === 13) return `${digits.slice(0, 6)}-${digits.charAt(6)}******`;
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

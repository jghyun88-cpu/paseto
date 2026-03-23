"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import api from "@/lib/api";

interface StartupOption {
  id: string;
  company_name: string;
  industry: string;
}

const HANDOVER_TYPES = [
  { value: "sourcing_to_review", label: "소싱 → 심사팀" },
  { value: "review_to_backoffice", label: "심사 → 백오피스" },
  { value: "review_to_incubation", label: "심사 → 보육팀" },
  { value: "incubation_to_oi", label: "보육 → OI팀" },
  { value: "oi_to_review", label: "OI → 심사팀 (역인계)" },
  { value: "backoffice_broadcast", label: "백오피스 → 전체 (브로드캐스트)" },
] as const;

export default function HandoverNewPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [startups, setStartups] = useState<StartupOption[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupOption | null>(null);
  const [handoverType, setHandoverType] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (search.length < 1) {
      setStartups([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<{ data: StartupOption[] }>(`/startups/?search=${encodeURIComponent(search)}&page_size=10`)
        .then((res) => {
          setStartups(res.data.data ?? (res.data as unknown as StartupOption[]));
          setShowDropdown(true);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelect = useCallback((s: StartupOption) => {
    setSelectedStartup(s);
    setSearch(s.company_name);
    setShowDropdown(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedStartup || !handoverType) {
      alert("기업과 인계 경로를 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/handovers/manual", {
        startup_id: selectedStartup.id,
        handover_type: handoverType,
        content: {},
        memo: memo || null,
      });
      alert("인계 패키지가 생성되었습니다.");
      router.push("/sourcing/handover");
    } catch {
      alert("인계 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedStartup, handoverType, memo, router]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-6">인계 패키지 수동 생성</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        {/* 기업 검색 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">기업 검색</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedStartup(null);
              }}
              placeholder="기업명을 입력하세요..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showDropdown && startups.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {startups.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                  >
                    <span className="font-medium">{s.company_name}</span>
                    <span className="text-slate-400 ml-2">{s.industry}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedStartup && (
            <p className="text-xs text-green-600 mt-1">
              선택됨: {selectedStartup.company_name} ({selectedStartup.industry})
            </p>
          )}
        </div>

        {/* 인계 경로 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">인계 경로</label>
          <select
            value={handoverType}
            onChange={(e) => setHandoverType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">경로를 선택하세요</option>
            {HANDOVER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">추가 메모</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="전달 사항을 입력하세요 (선택)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 제출 */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedStartup || !handoverType}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <Send size={16} />
            {submitting ? "생성 중..." : "인계 패키지 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { fmtCorporateNumberFull } from "@/lib/formatters";
import { SECTOR_OPTIONS, STAGE_OPTIONS, SOURCING_CHANNEL_OPTIONS } from "@/lib/constants";
import { useClickOutside } from "@/hooks/useClickOutside";

interface StartupItem {
  id: string;
  company_name: string;
  ceo_name: string;
  corporate_number: string | null;
  industry: string;
}

interface UserItem {
  id: string;
  name: string;
}

export default function NewDealPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);

  // 기업 검색/선택
  const [startupQuery, setStartupQuery] = useState("");
  const [startupResults, setStartupResults] = useState<StartupItem[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 사용자 목록 로드
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.get("/auth/users");
        const list = res.data?.data ?? res.data ?? [];
        setUsers(list.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
      } catch {
        // ignore
      }
    }
    loadUsers();
  }, []);

  useClickOutside(dropdownRef, () => setShowDropdown(false));

  // 스타트업 검색 (DealFlow 없는 기업만)
  const searchStartups = useCallback(async (query: string) => {
    if (query.length < 1) {
      setStartupResults([]);
      setShowDropdown(false);
      return;
    }
    try {
      const params = new URLSearchParams({
        search: query,
        page_size: "10",
      });
      const res = await api.get(`/startups/?${params}`);
      const items = res.data.data ?? [];
      setStartupResults(items);
      setShowDropdown(items.length > 0);
    } catch {
      setStartupResults([]);
    }
  }, []);

  const handleStartupInput = useCallback(
    (value: string) => {
      setStartupQuery(value);
      setSelectedStartup(null);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => searchStartups(value), 300);
    },
    [searchStartups],
  );

  const selectStartup = useCallback((item: StartupItem) => {
    setSelectedStartup(item);
    const corp = item.corporate_number ? ` (${item.corporate_number})` : "";
    setStartupQuery(`${item.company_name}${corp}`);
    setShowDropdown(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      if (!selectedStartup) {
        setError("스타트업 목록에서 기업을 선택해주세요.");
        return;
      }

      setLoading(true);
      const fd = new FormData(e.currentTarget);

      try {
        // DealFlow만 생성 — 스타트업 마스터 데이터는 절대 수정하지 않음
        await api.post("/deal-flows/move", {
          startup_id: selectedStartup.id,
          to_stage: "inbound",
          notes: [
            fd.get("one_liner") && `한줄소개: ${fd.get("one_liner")}`,
            fd.get("description") && `설명: ${fd.get("description")}`,
            fd.get("sector") && `섹터: ${fd.get("sector")}`,
            fd.get("stage") && `단계: ${fd.get("stage")}`,
            fd.get("sourcing_channel") && `발굴경로: ${fd.get("sourcing_channel")}`,
          ].filter(Boolean).join("\n") || undefined,
        });
        router.push("/sourcing/deals");
      } catch {
        setError("딜 등록에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [router, selectedStartup],
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-slate-800 mb-5">딜 등록</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
        {/* 기업 선택 (스타트업 목록에서 검색) */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-600 mb-1">기업 선택 *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={startupQuery}
              onChange={(e) => handleStartupInput(e.target.value)}
              placeholder="스타트업 목록에서 기업명 검색..."
              className={`w-full h-9 pl-10 pr-3 border rounded-md text-sm outline-none focus:border-blue-500 ${
                selectedStartup ? "border-blue-400 bg-blue-50" : "border-slate-300"
              }`}
            />
          </div>
          {selectedStartup && (
            <p className="text-xs text-blue-600 mt-1">
              선택됨: {selectedStartup.company_name}
              {selectedStartup.corporate_number ? ` | ${fmtCorporateNumberFull(selectedStartup.corporate_number)}` : ""}
              {selectedStartup.ceo_name ? ` | 대표: ${selectedStartup.ceo_name}` : ""}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            스타트업 등록에서 먼저 기업을 등록한 후 선택할 수 있습니다.
          </p>
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {startupResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectStartup(item)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800">{item.company_name}</span>
                    {item.corporate_number && (
                      <span className="text-xs font-mono text-slate-400">{fmtCorporateNumberFull(item.corporate_number)}</span>
                    )}
                  </div>
                  {(item.ceo_name || item.industry) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[item.ceo_name, item.industry].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 발굴일자 / 섹터 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">발굴일자</label>
            <input
              type="date"
              name="discovery_date"
              className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <SelectField label="섹터" name="sector" options={SECTOR_OPTIONS} />
        </div>

        {/* 단계 / 발굴경로 */}
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="단계" name="stage" options={STAGE_OPTIONS} />
          <SelectField label="발굴경로" name="sourcing_channel" options={SOURCING_CHANNEL_OPTIONS} />
        </div>

        {/* 발굴자 */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">발굴자</label>
          <select
            name="discoverer"
            className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
          >
            <option value="">선택</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* 한줄 소개 */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">한줄 소개</label>
          <input
            type="text"
            name="one_liner"
            placeholder="예: 차세대 반도체 패키징 회사"
            className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 상세 설명 */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">상세 설명</label>
          <textarea
            name="description"
            rows={5}
            placeholder="사업 내용, 기술, 시장 등 상세 설명..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-center gap-3 pt-2">
          <Button type="button" variant="outline" className="w-40" onClick={() => router.push("/sourcing/deals")}>
            취소
          </Button>
          <Button type="submit" disabled={loading || !selectedStartup} className="w-40">
            {loading ? "등록 중..." : "등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}

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

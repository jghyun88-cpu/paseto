"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { SECTOR_OPTIONS, STAGE_OPTIONS, SOURCING_CHANNEL_OPTIONS } from "@/lib/constants";
import { useClickOutside } from "@/hooks/useClickOutside";

interface StartupItem {
  id: string;
  company_name: string;
  ceo_name: string;
  corporate_number: string | null;
  industry: string;
}

interface StartupDetail {
  id: string;
  company_name: string;
  industry: string;
  stage: string;
  one_liner: string;
  sourcing_channel: string;
  assigned_manager_id: string | null;
  assigned_manager_name: string | null;
  problem_definition: string | null;
  solution_description: string | null;
  notes: string | null;
  created_at: string;
}

interface UserItem {
  id: string;
  name: string;
}

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);

  // 기존 데이터
  const [startup, setStartup] = useState<StartupDetail | null>(null);

  // 폼 값
  const [selectedStartup, setSelectedStartup] = useState<StartupItem | null>(null);
  const [startupQuery, setStartupQuery] = useState("");
  const [startupResults, setStartupResults] = useState<StartupItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [discoveryDate, setDiscoveryDate] = useState("");
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("");
  const [sourcingChannel, setSourcingChannel] = useState("");
  const [assignedManagerId, setAssignedManagerId] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [description, setDescription] = useState("");

  // 기존 데이터 로드
  useEffect(() => {
    if (!params.id) return;

    async function loadData() {
      try {
        const [startupRes, usersRes] = await Promise.all([
          api.get<StartupDetail>(`/startups/${params.id}`),
          api.get("/auth/users").catch(() => ({ data: [] })),
        ]);

        const s = startupRes.data;
        setStartup(s);

        // 폼 초기값 설정
        setSelectedStartup({
          id: s.id,
          company_name: s.company_name,
          ceo_name: "",
          corporate_number: null,
          industry: s.industry,
        });
        setStartupQuery(s.company_name);
        setDiscoveryDate(s.created_at?.slice(0, 10) ?? "");
        setSector(s.industry || "");
        setStage(s.stage || "");
        setSourcingChannel(s.sourcing_channel || "");
        setAssignedManagerId(s.assigned_manager_id || "");
        setOneLiner(s.one_liner || "");
        setDescription(
          s.problem_definition || s.solution_description || s.notes || ""
        );

        const userList = usersRes.data?.data ?? usersRes.data ?? [];
        setUsers(
          userList.map((u: { id: string; name: string }) => ({
            id: u.id,
            name: u.name,
          }))
        );
      } catch {
        router.push("/sourcing/deals");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id, router]);

  useClickOutside(dropdownRef, () => setShowDropdown(false));

  // 스타트업 검색
  const searchStartups = useCallback(async (query: string) => {
    if (query.length < 1) {
      setStartupResults([]);
      setShowDropdown(false);
      return;
    }
    try {
      const p = new URLSearchParams({ search: query, page_size: "10" });
      const res = await api.get(`/startups/?${p}`);
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
    [searchStartups]
  );

  const selectStartup = useCallback((item: StartupItem) => {
    setSelectedStartup(item);
    setStartupQuery(item.company_name);
    setShowDropdown(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!selectedStartup) {
        setError("스타트업 목록에서 기업을 선택해주세요.");
        return;
      }

      setSaving(true);
      try {
        await api.patch(`/startups/${selectedStartup.id}`, {
          industry: sector || undefined,
          stage: stage || undefined,
          one_liner: oneLiner || undefined,
          sourcing_channel: sourcingChannel || undefined,
          assigned_manager_id: assignedManagerId || undefined,
          problem_definition: description || undefined,
        });
        router.push(`/sourcing/deals/${selectedStartup.id}`);
      } catch {
        setError("수정에 실패했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [
      selectedStartup,
      sector,
      stage,
      oneLiner,
      sourcingChannel,
      assignedManagerId,
      description,
      router,
    ]
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">로딩 중...</div>
    );
  }

  if (!startup) {
    return (
      <div className="p-8 text-center text-slate-400">
        딜 정보를 찾을 수 없습니다.
      </div>
    );
  }

  // 발굴자 표시명 찾기
  const managerDisplayName = (() => {
    if (!assignedManagerId) return "";
    const u = users.find((user) => user.id === assignedManagerId);
    return u ? u.name : "";
  })();

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => router.push(`/sourcing/deals/${params.id}`)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← 돌아가기
        </button>
        <h2 className="text-lg font-bold text-slate-800 ml-2">
          발굴기업 수정
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5"
      >
        {/* 기업(고객)명 */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-600 mb-1">
            기업(고객)명 *
          </label>
          <input
            type="text"
            value={startupQuery}
            onChange={(e) => handleStartupInput(e.target.value)}
            placeholder="기업명 검색..."
            className={`w-full h-10 px-3 border rounded-md text-sm outline-none focus:border-blue-500 ${
              selectedStartup
                ? "border-blue-400 bg-blue-50/30"
                : "border-slate-300"
            }`}
          />
          {selectedStartup && (
            <p className="text-xs text-blue-600 mt-1">
              선택됨: {selectedStartup.company_name}
            </p>
          )}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {startupResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectStartup(item)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                >
                  <span className="font-medium text-slate-800">
                    {item.company_name}
                  </span>
                  {item.ceo_name && (
                    <span className="text-xs text-slate-400 ml-2">
                      {item.ceo_name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 발굴일자 / 섹터 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              발굴일자
            </label>
            <input
              type="date"
              value={discoveryDate}
              onChange={(e) => setDiscoveryDate(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              섹터
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
            >
              {SECTOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 단계 / 발굴경로 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              단계
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              발굴경로
            </label>
            <select
              value={sourcingChannel}
              onChange={(e) => setSourcingChannel(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
            >
              {SOURCING_CHANNEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 발굴자 */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            발굴자
          </label>
          <select
            value={assignedManagerId}
            onChange={(e) => setAssignedManagerId(e.target.value)}
            className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
          >
            <option value="">선택</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* 한줄 소개 */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            한줄 소개
          </label>
          <input
            type="text"
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            placeholder="예: 데이터 기반 전주기 배터리 진단/관리 솔루션"
            className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 상세 설명 */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            상세 설명
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="사업내용, 기술, 시장 등 상세 설명..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-44"
            onClick={() => router.push(`/sourcing/deals/${params.id}`)}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={saving || !selectedStartup}
            className="w-44"
          >
            {saving ? "수정 중..." : "수정"}
          </Button>
        </div>
      </form>
    </div>
  );
}

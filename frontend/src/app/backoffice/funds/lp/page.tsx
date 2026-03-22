"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2 } from "lucide-react";
import api from "@/lib/api";
import { fmtCorporateNumber, fmtBRN, fmtIndustry, fmtLocation, fmtDate } from "@/lib/formatters";

interface LPItem {
  id: string;
  lp_name: string;
  ceo_name: string | null;
  corporate_number: string | null;
  business_registration_number: string | null;
  industry: string | null;
  ksic_code: string | null;
  city: string | null;
  location: string | null;
  stock_market: string | null;
  created_at: string;
}

interface ListResponse {
  data: LPItem[];
  total: number;
  page: number;
  page_size: number;
}

export default function LPListPage() {
  const [items, setItems] = useState<LPItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchList = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), page_size: "20" });
      if (q) params.set("search", q);
      const res = await api.get<ListResponse>(`/lps?${params}`);
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page, search);
  }, [page, search, fetchList]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
      fetchList(1, search);
    },
    [search, fetchList],
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">LP 목록</h2>
        <Button size="sm" onClick={() => router.push("/backoffice/funds/lp/new")}>
          <Plus size={16} className="mr-1" />
          LP 등록
        </Button>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="text"
            className="w-full h-10 pl-4 pr-10 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"
            placeholder="기업명, 대표자, 법인등록번호, 사업자등록번호로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <Search size={18} />
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">기업명</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">대표자</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">법인(주민)등록번호</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">사업자등록번호</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">업종</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">소재지</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">상장시장</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">등록일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  로딩 중...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  <Building2 size={24} className="mx-auto mb-2 text-slate-300" />
                  등록된 LP가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((lp) => (
                <tr
                  key={lp.id}
                  className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer"
                  onClick={() => router.push(`/backoffice/funds/lp/${lp.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium text-blue-700 hover:underline">
                    {lp.lp_name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{lp.ceo_name || ""}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                    {fmtCorporateNumber(lp.corporate_number)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                    {fmtBRN(lp.business_registration_number)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {fmtIndustry(lp.ksic_code, lp.industry)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {fmtLocation(lp.city, lp.location)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{lp.stock_market || ""}</td>
                  <td className="px-4 py-2.5 text-slate-400">{fmtDate(lp.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            이전
          </Button>
          <span className="text-sm text-slate-500 leading-8">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

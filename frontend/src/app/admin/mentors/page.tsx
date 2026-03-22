"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

interface MentorItem {
  id: string;
  name: string;
  expertise: string;
  organization: string | null;
  contact_email: string | null;
  is_active: boolean;
}

export default function MentorsPage() {
  const [items, setItems] = useState<MentorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: MentorItem[] }>("/mentors/?page_size=200");
      setItems(res.data.data);
    } catch {
      showError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = search
    ? items.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.expertise ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : items;

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">멘토 풀 관리</h2>
        <span className="text-xs text-slate-500">총 {items.length}명</span>
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="멘토 이름 또는 전문분야 검색..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">이름</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">전문분야</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">소속</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">이메일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800">{m.name}</td>
                <td className="py-2.5 px-3 text-slate-600">{m.expertise}</td>
                <td className="py-2.5 px-3 text-slate-600">{m.organization ?? "-"}</td>
                <td className="py-2.5 px-3 text-slate-600">{m.contact_email ?? "-"}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      m.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.is_active ? "활성" : "비활성"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? "검색 결과가 없습니다." : "등록된 멘토가 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

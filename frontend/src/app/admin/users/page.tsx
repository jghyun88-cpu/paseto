"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  team: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자", partner: "파트너", analyst: "애널리스트",
  pm: "매니저", oi_manager: "OI매니저", backoffice: "백오피스",
};

const TEAM_LABELS: Record<string, string> = {
  sourcing: "Sourcing", review: "심사", incubation: "보육",
  oi: "OI", backoffice: "백오피스",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700", partner: "bg-purple-100 text-purple-700",
  analyst: "bg-blue-100 text-blue-700", pm: "bg-emerald-100 text-emerald-700",
  oi_manager: "bg-amber-100 text-amber-700", backoffice: "bg-slate-100 text-slate-600",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [team, setTeam] = useState("sourcing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: UserItem[] }>("/auth/users");
      setUsers(res.data.data ?? res.data as unknown as UserItem[]);
    } catch {
      // users 목록 API가 없으면 빈 배열
      try {
        // 대안: 현재 사용자만 표시
        const me = await api.get<UserItem>("/auth/me");
        setUsers([me.data]);
      } catch {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!email || !name || !password) {
      setError("이메일, 이름, 비밀번호는 필수입니다.");
      return;
    }
    setError(""); setSuccess(""); setSaving(true);
    try {
      await api.post("/auth/register", { email, name, password, role, team });
      setShowForm(false);
      setEmail(""); setName(""); setPassword("");
      setSuccess("사용자가 생성되었습니다.");
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [email, name, password, role, team, fetchData]);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">사용자 관리</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> 사용자 추가
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">이메일 *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="user@elsa.io"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">이름 *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">비밀번호 *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">역할</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">팀</label>
              <select value={team} onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                {Object.entries(TEAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "생성 중..." : "생성"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </div>
      )}

      {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">이름</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">이메일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">역할</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">팀</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800">{u.name}</td>
                <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="py-2.5 px-3">{TEAM_LABELS[u.team] ?? u.team}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.is_active ? "활성" : "비활성"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">사용자가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

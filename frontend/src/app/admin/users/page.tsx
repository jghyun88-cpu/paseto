"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RotateCcw, Eye, EyeOff, Copy, Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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

function extractApiError(err: unknown): string {
  const resp = (err as { response?: { data?: { detail?: string } } })?.response;
  return resp?.data?.detail ?? "요청에 실패했습니다.";
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // 생성 폼
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [team, setTeam] = useState("sourcing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 수정 모달
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editTeam, setEditTeam] = useState("");

  // 비밀번호 관련
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ data: UserItem[] }>("/auth/users");
      setUsers(res.data.data ?? res.data as unknown as UserItem[]);
    } catch {
      try {
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
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }, [email, name, password, role, team, fetchData]);

  const handleToggleActive = useCallback(async (userId: string) => {
    setProcessingId(userId); setError("");
    try {
      await api.patch(`/auth/users/${userId}/toggle-active`);
      setSuccess("상태가 변경되었습니다.");
      await fetchData();
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setProcessingId(null);
    }
  }, [fetchData]);

  const handleResetPassword = useCallback(async (userId: string) => {
    if (!confirm("비밀번호를 리셋하시겠습니까? 임시 비밀번호가 생성됩니다.")) return;
    setProcessingId(userId); setError("");
    try {
      const res = await api.post<{ temp_password: string; message: string }>(
        `/auth/users/${userId}/reset-password`
      );
      setTempPasswords((prev) => ({ ...prev, [userId]: res.data.temp_password }));
      setVisiblePasswords((prev) => new Set(prev).add(userId));
      setSuccess(res.data.message);
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleDelete = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`"${userName}" 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setProcessingId(userId); setError("");
    try {
      await api.delete(`/auth/users/${userId}`);
      setSuccess(`"${userName}" 사용자가 삭제되었습니다.`);
      await fetchData();
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setProcessingId(null);
    }
  }, [fetchData]);

  const openEditModal = useCallback((u: UserItem) => {
    setEditUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditTeam(u.team);
    setError("");
  }, []);

  const handleEdit = useCallback(async () => {
    if (!editUser) return;
    setSaving(true); setError("");
    try {
      await api.patch(`/auth/users/${editUser.id}`, {
        name: editName,
        role: editRole,
        team: editTeam,
      });
      setEditUser(null);
      setSuccess("사용자 정보가 수정되었습니다.");
      await fetchData();
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }, [editUser, editName, editRole, editTeam, fetchData]);

  const togglePasswordVisibility = useCallback((userId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }
      return next;
    });
  }, []);

  const copyToClipboard = useCallback(async (userId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard API 실패 시 무시
    }
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">사용자 관리</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} className="mr-1" /> 사용자 추가
          </Button>
        )}
      </div>

      {/* 사용자 생성 폼 */}
      {showForm && isAdmin && (
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
          {error && showForm && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "생성 중..." : "생성"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </div>
      )}

      {success && <p className="text-sm text-green-600 mb-3">{success}</p>}
      {error && !showForm && !editUser && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {/* 사용자 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">이름</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">이메일</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">비밀번호</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">역할</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">팀</th>
              <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">상태</th>
              {isAdmin && <th className="text-left py-2.5 px-3 text-slate-600 font-semibold">관리</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800">{u.name}</td>
                <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    {tempPasswords[u.id] ? (
                      <>
                        <span className="font-mono text-xs text-slate-700">
                          {visiblePasswords.has(u.id) ? tempPasswords[u.id] : "••••••••••••"}
                        </span>
                        <button onClick={() => togglePasswordVisibility(u.id)}
                          className="text-slate-400 hover:text-slate-600"
                          title={visiblePasswords.has(u.id) ? "숨기기" : "보기"}>
                          {visiblePasswords.has(u.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => copyToClipboard(u.id, tempPasswords[u.id])}
                          className="text-slate-400 hover:text-slate-600" title="복사">
                          {copiedId === u.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleResetPassword(u.id)}
                            disabled={processingId === u.id}
                            className="ml-1 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                            title="비밀번호 재리셋">
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-slate-400">••••••••</span>
                        {isAdmin && (
                          <button onClick={() => handleResetPassword(u.id)}
                            disabled={processingId === u.id}
                            className="ml-1 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                            title="비밀번호 리셋">
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="py-2.5 px-3">{TEAM_LABELS[u.team] ?? u.team}</td>
                <td className="py-2.5 px-3">
                  {isAdmin ? (
                    <button
                      onClick={() => handleToggleActive(u.id)}
                      disabled={processingId === u.id || u.id === currentUser?.id}
                      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                        u.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      } ${(processingId === u.id || u.id === currentUser?.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={u.id === currentUser?.id ? "자기 자신의 상태는 변경할 수 없습니다" : "클릭하여 상태 변경"}>
                      {u.is_active ? "활성" : "비활성"}
                    </button>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? "활성" : "비활성"}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(u)}
                        disabled={processingId === u.id}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 disabled:opacity-50"
                        title="수정">
                        <Pencil size={13} />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u.id, u.name)}
                          disabled={processingId === u.id}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                          title="삭제">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">사용자가 없습니다.</div>
        )}
      </div>

      {/* 수정 모달 */}
      {editUser && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">사용자 수정</h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">이메일</label>
              <input type="email" value={editUser.email} disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">이름</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">역할</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">팀</label>
                <select value={editTeam} onChange={(e) => setEditTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                  {Object.entries(TEAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            {error && editUser && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleEdit} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditUser(null)}>취소</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

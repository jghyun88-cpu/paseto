"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface NotifItem {
  id: string; title: string; message: string; notification_type: string;
  is_read: boolean; related_entity_type: string | null; created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  handover_request: "인계", deadline_alert: "기한", ic_schedule: "IC일정",
  kpi_warning: "KPI", report_deadline: "보고", crisis_alert: "위기",
  escalation: "에스컬레이션", contract_overdue: "계약초과",
};

const TYPE_COLORS: Record<string, string> = {
  crisis_alert: "bg-red-100 text-red-700", escalation: "bg-red-100 text-red-700",
  kpi_warning: "bg-amber-100 text-amber-700", handover_request: "bg-blue-100 text-blue-700",
  deadline_alert: "bg-amber-100 text-amber-700", report_deadline: "bg-purple-100 text-purple-700",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/notifications/?page_size=50";
      if (filterType) url += `&notification_type=${filterType}`;
      const res = await api.get<{ data: NotifItem[] }>(url);
      setItems(res.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">알림</h2>
        <Button size="sm" variant="outline" onClick={handleMarkAllRead}>전체 읽음 처리</Button>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`px-3 py-1 text-xs rounded-full border ${!filterType ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterType(null)}>전체</button>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <button key={k} className={`px-3 py-1 text-xs rounded-full border ${filterType === k ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-300"}`} onClick={() => setFilterType(k === filterType ? null : k)}>{v}</button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 ${!n.is_read ? "border-l-4 border-l-blue-500" : ""}`} onClick={() => !n.is_read && handleMarkRead(n.id)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[n.notification_type] ?? "bg-slate-100 text-slate-600"}`}>
                  {TYPE_LABELS[n.notification_type] ?? n.notification_type}
                </span>
                <span className="text-sm font-semibold text-slate-800">{n.title}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
            <p className="text-sm text-slate-600">{n.message}</p>
          </div>
        ))}
        {items.length === 0 && <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">알림이 없습니다.</div>}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function HandoverNewPage() {
  const router = useRouter();
  const [startupId, setStartupId] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupId.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/handovers/", {
        startup_id: startupId,
        summary,
        status: "pending",
      });
      router.push("/sourcing/handover");
    } catch {
      alert("인계 패키지 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">인계 패키지 생성</h1>
      <p className="text-sm text-gray-500">심사팀에 전달할 인계 패키지를 생성합니다.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">스타트업 ID</label>
          <input
            type="text"
            value={startupId}
            onChange={(e) => setStartupId(e.target.value)}
            placeholder="스타트업 UUID"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">인계 요약</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="심사팀에 전달할 핵심 내용을 요약해주세요."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !startupId.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
        >
          {submitting ? "생성 중..." : "인계 패키지 생성"}
        </button>
      </form>
    </div>
  );
}

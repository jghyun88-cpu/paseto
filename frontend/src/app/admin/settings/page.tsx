"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("eLSA 딥테크 액셀러레이터");
  const [orgDescription, setOrgDescription] = useState(
    "딥테크 스타트업 전주기 투자 및 보육 운영 플랫폼"
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    try {
      // 추후 API 연동 예정
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess("설정이 저장되었습니다.");
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-5">조직/배치 설정</h2>

      <div className="space-y-6">
        {/* 조직 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">조직 정보</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">조직명</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">설명</label>
              <textarea
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 배치 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">현재 배치</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs text-slate-500 mb-1">배치명</span>
              <span className="text-sm font-medium text-slate-800">2026년 1기</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 mb-1">상태</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                운영중
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 mb-1">시작일</span>
              <span className="text-sm text-slate-800">2026.01.01</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 mb-1">종료일</span>
              <span className="text-sm text-slate-800">2026.12.31</span>
            </div>
          </div>
        </div>

        {success && <p className="text-sm text-green-600">{success}</p>}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "설정 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

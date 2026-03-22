"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { DOCUMENT_CATEGORY_LABEL, DOCUMENT_CATEGORY_OPTIONS } from "@/lib/constants";

interface DocItem {
  id: string;
  category: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploader_name: string | null;
  created_at: string;
}

function fmtFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsTabProps {
  startupId: string;
  /** 허용된 카테고리만 표시 (미지정 시 전체) */
  allowedCategories?: string[];
}

export default function DocumentsTab({ startupId, allowedCategories }: DocumentsTabProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 허용 카테고리 옵션만 필터링
  const categoryOptions = allowedCategories
    ? DOCUMENT_CATEGORY_OPTIONS.filter((opt) => allowedCategories.includes(opt.value))
    : DOCUMENT_CATEGORY_OPTIONS;

  const [category, setCategory] = useState(categoryOptions[0]?.value ?? "other");

  const loadDocs = useCallback(async () => {
    try {
      // 허용 카테고리가 있으면 각각 조회하여 합산
      let allDocs: DocItem[] = [];
      let allTotal = 0;

      if (allowedCategories && allowedCategories.length > 0) {
        const results = await Promise.all(
          allowedCategories.map((cat) =>
            api.get(`/documents/?startup_id=${startupId}&category=${cat}`)
          )
        );
        for (const res of results) {
          allDocs = allDocs.concat(res.data.data ?? []);
          allTotal += res.data.total ?? 0;
        }
        // 날짜 내림차순 정렬
        allDocs.sort((a, b) => b.created_at.localeCompare(a.created_at));
      } else {
        const res = await api.get(`/documents/?startup_id=${startupId}`);
        allDocs = res.data.data ?? [];
        allTotal = res.data.total ?? 0;
      }

      setDocs(allDocs);
      setTotal(allTotal);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [startupId, allowedCategories]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("startup_id", startupId);
      fd.append("category", category);

      await api.post("/documents/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadDocs();
    } catch {
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [startupId, category, loadDocs]);

  const handleDownload = useCallback(async (doc: DocItem) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("다운로드에 실패했습니다.");
    }
  }, []);

  const handleDelete = useCallback(async (doc: DocItem) => {
    if (!window.confirm(`"${doc.file_name}" 파일을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      await loadDocs();
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }, [loadDocs]);

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 px-3 border border-slate-300 rounded-md text-sm bg-white"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "업로드 중..." : "파일 첨부"}
            </Button>
          </div>
        </div>
      </div>

      {/* 문서 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">
            첨부 문서 <span className="text-slate-400 font-normal ml-1">{total}건</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">로딩 중...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">첨부된 문서가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-5 py-2 font-medium">파일명</th>
                <th className="text-left px-3 py-2 font-medium">카테고리</th>
                <th className="text-left px-3 py-2 font-medium">업로드자</th>
                <th className="text-left px-3 py-2 font-medium">날짜</th>
                <th className="text-right px-3 py-2 font-medium">크기</th>
                <th className="px-5 py-2 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 text-slate-800 font-medium truncate max-w-[200px]">
                    {doc.file_name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">
                      {DOCUMENT_CATEGORY_LABEL[doc.category] ?? doc.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{doc.uploader_name || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(doc.created_at)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{fmtFileSize(doc.file_size)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                        title="다운로드"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

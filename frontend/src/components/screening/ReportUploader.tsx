"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { showError, showSuccess } from "@/lib/toast";

/** 6종 보고서 유형 배지 */
const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  screening: { label: "스크리닝", className: "bg-purple-50 text-purple-700" },
  ir_analysis: { label: "IR분석", className: "bg-purple-50 text-purple-700" },
  risk_alert: { label: "리스크", className: "bg-purple-50 text-purple-700" },
  market_scan: { label: "시장분석", className: "bg-purple-50 text-purple-700" },
  investment_memo: { label: "투자검토", className: "bg-purple-50 text-purple-700" },
  portfolio_report: { label: "포트폴리오", className: "bg-purple-50 text-purple-700" },
};

const FILENAME_TYPE_PATTERNS: [RegExp, string][] = [
  [/screening|스크리닝/i, "screening"],
  [/ir[_-]?analysis|IR|심층분석/i, "ir_analysis"],
  [/risk|리스크/i, "risk_alert"],
  [/market|시장/i, "market_scan"],
  [/memo|투자.*검토/i, "investment_memo"],
  [/portfolio|포트폴리오/i, "portfolio_report"],
];

function guessReportType(filename: string): string | null {
  for (const [pattern, type] of FILENAME_TYPE_PATTERNS) {
    if (pattern.test(filename)) return type;
  }
  return null;
}

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
}

interface EvaluationResult {
  evaluation_id: string;
  status: "completed" | "pending";
  scores: Record<string, unknown> | null;
  recommendation: string | null;
  summary: string | null;
}

interface ReportUploaderProps {
  startupId: string;
  isDeeptech?: boolean | null;
  onComplete: (result: EvaluationResult) => void;
}

export default function ReportUploader({
  startupId,
  isDeeptech = null,
  onComplete,
}: ReportUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const allowed = Array.from(newFiles).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "md" || ext === "pdf";
    });

    if (allowed.length === 0) {
      showError("MD 또는 PDF 파일만 업로드 가능합니다.");
      return;
    }

    setFiles((prev) => {
      const total = prev.length + allowed.length;
      if (total > 6) {
        showError("최대 6개 파일만 업로드 가능합니다.");
        return prev;
      }
      return [
        ...prev,
        ...allowed.map((f) => ({ file: f, status: "pending" as const })),
      ];
    });
  }, []);

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) return;
    setUploading(true);

    // 모든 파일을 "uploading"으로 전환
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "uploading" as const })),
    );

    const fd = new FormData();
    for (const { file } of files) {
      fd.append("files", file);
    }

    try {
      const params = new URLSearchParams({ startup_id: startupId });
      if (isDeeptech !== null) {
        params.set("is_deeptech", String(isDeeptech));
      }

      const { data } = await api.post<EvaluationResult>(
        `/ai-analysis/evaluation/upload?${params}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      // 성공 → 모든 파일을 "done"으로
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "done" as const })),
      );

      showSuccess(
        data.status === "completed"
          ? "평가 완료! 결과를 확인하세요."
          : "평가가 시작되었습니다. 잠시 기다려주세요.",
      );

      onComplete(data);
    } catch (err) {
      // 실패 → 모든 파일을 "error"로
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "error" as const })),
      );
      showError("보고서 업로드에 실패했습니다.", err);
    } finally {
      setUploading(false);
    }
  }, [files, startupId, isDeeptech, onComplete]);

  return (
    <div className="space-y-4">
      {/* 드래그 존 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-3
          rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors
          ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50"
          }
        `}
      >
        <Upload className="h-8 w-8 text-slate-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            lsa 보고서 파일을 여기에 끌어놓으세요
          </p>
          <p className="text-xs text-slate-500 mt-1">
            MD, PDF 파일 지원 (최대 6종)
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          파일 선택
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(({ file, status }, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="flex-1 truncate">{file.name}</span>
              {(() => {
                const type = guessReportType(file.name);
                if (!type || !TYPE_BADGE[type]) return null;
                const badge = TYPE_BADGE[type];
                return (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                );
              })()}

              {status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {status === "done" && (
                <Check className="h-4 w-4 text-green-600" />
              )}
              {status === "error" && (
                <RotateCcw className="h-4 w-4 text-red-500 cursor-pointer" />
              )}

              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 제출 버튼 */}
      <Button
        onClick={handleSubmit}
        disabled={files.length === 0 || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            업로드 중...
          </>
        ) : (
          `보고서 ${files.length}개 업로드 및 평가 시작`
        )}
      </Button>
    </div>
  );
}

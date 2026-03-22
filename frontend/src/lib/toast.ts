/**
 * 전역 토스트 유틸리티 — sonner 기반
 *
 * catch 블록에서 에러 메시지를 사용자에게 표시할 때 사용.
 * React context 없이 어디서든 호출 가능.
 *
 * 사용법:
 *   import { showError } from "@/lib/toast";
 *   try { ... } catch { showError("데이터를 불러오는 데 실패했습니다."); }
 */

import { toast } from "sonner";

/** API 에러에서 한글 메시지 추출 */
function extractMessage(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "response" in error
  ) {
    const resp = (error as { response?: { data?: { detail?: string } } }).response;
    return resp?.data?.detail;
  }
  return undefined;
}

/** 에러 토스트 표시 */
export function showError(fallback: string, error?: unknown): void {
  const message = extractMessage(error) ?? fallback;
  toast.error(message);
}

/** 성공 토스트 표시 */
export function showSuccess(message: string): void {
  toast.success(message);
}

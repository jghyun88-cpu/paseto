import { useEffect, type RefObject } from "react";

/**
 * 지정된 ref 요소 외부 클릭 시 콜백 호출
 * 드롭다운, 모달 등에서 외부 클릭 감지에 사용
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
): void {
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onClickOutside]);
}

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Calls `onOutside` on a pointerdown outside both `containerRef` and, when
 * given, `anchorRef` (e.g. the trigger button that should re-toggle
 * instead of immediately reopening).
 */
export function useOutsideClick(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
  anchorRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return undefined;

    function handlePointerDown(event: PointerEvent | MouseEvent) {
      const container = containerRef.current;
      const anchor = anchorRef?.current;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (container?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onOutside();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [active, containerRef, anchorRef, onOutside]);
}

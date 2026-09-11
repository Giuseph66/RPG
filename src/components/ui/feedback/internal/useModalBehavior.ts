import { useLayoutEffect } from "react";
import type { RefObject } from "react";

import { useEscapeKey } from "./useEscapeKey";
import { useFocusTrap } from "./useFocusTrap";
import { useInertBackground } from "./useInertBackground";
import { useReturnFocus } from "./useReturnFocus";

export interface ModalBehaviorOptions {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Composes the mechanics shared by every modal-like surface: Escape to
 * close, Tab/Shift+Tab focus containment, background inertness, focus
 * returning to the trigger, and sensible initial focus.
 */
export function useModalBehavior(
  containerRef: RefObject<HTMLElement | null>,
  { open, onClose, initialFocusRef }: ModalBehaviorOptions,
): void {
  useEscapeKey(open, onClose);
  useFocusTrap(containerRef, open);
  useInertBackground(containerRef, open);
  useReturnFocus(open);

  useLayoutEffect(() => {
    if (!open) return;
    const target = initialFocusRef?.current ?? containerRef.current;
    target?.focus();
    // Only re-run when `open` flips; refs are stable identities we read at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { useEscapeKey } from "../internal/useEscapeKey";
import { useOutsideClick } from "../internal/useOutsideClick";
import styles from "./Popover.module.css";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger element the popover is positioned relative to. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Accessible name for the popover content. */
  label: string;
  children: ReactNode;
}

/**
 * Non-modal: does not trap focus, does not make the background inert.
 * Closes on Escape or on a pointerdown outside both the popover and its
 * anchor. Positioning is computed from the anchor's bounding rect; in
 * jsdom (no real layout) that rect is all-zero, so position assertions
 * are out of scope for these tests — only open/close and focus behavior
 * are verified.
 */
export function Popover({ open, onClose, anchorRef, label, children }: PopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: "0px", left: "0px" });

  useEscapeKey(open, onClose);
  useOutsideClick(containerRef, open, onClose, anchorRef);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: `calc(${rect.bottom}px + var(--spacing-sm))`,
      left: `${rect.left}px`,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    function recompute() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: `calc(${rect.bottom}px + var(--spacing-sm))`,
        left: `${rect.left}px`,
      });
    }
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className={styles.popover}
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>
  );
}

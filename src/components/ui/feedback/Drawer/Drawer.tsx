import { useId, useRef } from "react";
import type { MouseEvent, ReactNode, RefObject } from "react";

import { IconButton } from "../../IconButton/IconButton";
import { useEscapeKey } from "../internal/useEscapeKey";
import { useModalBehavior } from "../internal/useModalBehavior";
import styles from "./Drawer.module.css";

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Logical side, independent of writing direction. */
  side: "start" | "end";
  /** No default: caller must declare modal or non-modal explicitly. */
  modal: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  dismissOnBackdrop?: boolean;
}

/**
 * Detail/filter panel. When `modal` is true this reuses AppModal's exact
 * mechanics (focus trap, background inertness, backdrop). When `modal` is
 * false it only closes on Escape and does not trap focus or dim the rest
 * of the page — the caller is responsible for the non-modal layout not
 * overlapping content that still needs to stay reachable.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
  side,
  modal,
  initialFocusRef,
  dismissOnBackdrop = true,
}: DrawerProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useModalBehaviorConditional(modal, containerRef, { open, onClose, initialFocusRef });

  if (!open) return null;

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!modal || !dismissOnBackdrop) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const panel = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal={modal}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={[styles.panel, styles[side]].join(" ")}
    >
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <IconButton label="Fechar" icon={<span>×</span>} onClick={onClose} />
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );

  if (!modal) {
    return <div className={styles.nonModalWrapper}>{panel}</div>;
  }

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
      {panel}
    </div>
  );
}

/**
 * Applies full modal mechanics only when `modal` is true; otherwise only
 * Escape-to-close is wired up (still calling hooks unconditionally to
 * respect the Rules of Hooks).
 */
function useModalBehaviorConditional(
  modal: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options: { open: boolean; onClose: () => void; initialFocusRef?: RefObject<HTMLElement | null> },
): void {
  useModalBehavior(containerRef, {
    open: options.open && modal,
    onClose: options.onClose,
    initialFocusRef: options.initialFocusRef,
  });
  useEscapeKey(options.open && !modal, options.onClose);
}

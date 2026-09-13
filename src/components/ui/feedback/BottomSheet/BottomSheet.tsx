import { useId, useRef } from "react";
import type { MouseEvent, ReactNode, RefObject } from "react";

import { X } from "@phosphor-icons/react";

import { Button } from "../../Button/Button";
import { IconButton } from "../../IconButton/IconButton";
import { useModalBehavior } from "../internal/useModalBehavior";
import styles from "./BottomSheet.module.css";

export interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  dismissOnBackdrop?: boolean;
  footer?: ReactNode;
  /** Extra class on the sheet surface, for feature-specific skins. */
  className?: string;
}

/**
 * Same modal contract as AppModal (focus trap, Escape, return focus,
 * background inertness), anchored to the bottom of the viewport for
 * mobile use. Always renders a visible text "Fechar" button — dragging is
 * never the only way to dismiss it — plus the same header X as AppModal, so
 * a sheet tall enough to fill the screen can be dismissed without scrolling
 * down to the footer.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
  initialFocusRef,
  dismissOnBackdrop = true,
  footer,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useModalBehavior(containerRef, { open, onClose, initialFocusRef });

  if (!open) return null;

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!dismissOnBackdrop) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[styles.sheet, className].filter(Boolean).join(" ")}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton label="Fechar" icon={<X size={20} weight="bold" />} onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>
          {footer}
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

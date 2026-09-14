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
  /**
   * Hides the footer's text "Fechar" button. Defaults to visible — the
   * dragging-isn't-the-only-way-out guarantee below only holds with this at
   * its default. Only opt out when the header X (always present) reaches an
   * on-screen close some other way, e.g. a sheet that fills the viewport
   * where the header is never scrolled out of reach.
   */
  hideFooterCloseButton?: boolean;
  /** Extra class on the sheet surface, for feature-specific skins. */
  className?: string;
}

/**
 * Same modal contract as AppModal (focus trap, Escape, return focus,
 * background inertness), anchored to the bottom of the viewport for
 * mobile use. Renders the same header X as AppModal, plus by default a
 * visible text "Fechar" button in the footer — dragging is never the only
 * way to dismiss it. `hideFooterCloseButton` drops the second one for a
 * sheet where the header X is always reachable (see the prop's doc).
 */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
  initialFocusRef,
  dismissOnBackdrop = true,
  footer,
  hideFooterCloseButton = false,
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
        {footer || !hideFooterCloseButton ? (
          <div className={styles.footer}>
            {footer}
            {hideFooterCloseButton ? null : (
              <Button variant="secondary" onClick={onClose}>
                Fechar
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

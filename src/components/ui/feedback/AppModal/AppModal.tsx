import { useId, useRef } from "react";
import type { MouseEvent, ReactNode, RefObject } from "react";

import { IconButton } from "../../IconButton/IconButton";
import { useModalBehavior } from "../internal/useModalBehavior";
import styles from "./AppModal.module.css";

export interface AppModalProps {
  open: boolean;
  /** Required accessible name for the dialog. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Closes when clicking the backdrop. Defaults to true. */
  dismissOnBackdrop?: boolean;
  footer?: ReactNode;
  describedById?: string;
}

/**
 * Focal edit/review surface. Not built on `<dialog>`: the jsdom 29.1.1
 * pinned in this repo has an empty `HTMLDialogElement` implementation
 * (`showModal`/`close` are `undefined`) and does not implement `inert`
 * either — see `feedback/internal/focusUtils.ts` for the verification
 * notes. This uses a plain `role="dialog"` container with a manual focus
 * trap instead, which is both real-browser-correct and testable in jsdom.
 */
export function AppModal({
  open,
  title,
  onClose,
  children,
  initialFocusRef,
  dismissOnBackdrop = true,
  footer,
  describedById,
}: AppModalProps) {
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
        aria-describedby={describedById}
        tabIndex={-1}
        className={styles.dialog}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton label="Fechar" icon={<span>×</span>} onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}

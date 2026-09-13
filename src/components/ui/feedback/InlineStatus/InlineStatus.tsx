import type { ReactNode } from "react";
import { CheckCircle, Info, Warning, XCircle } from "@phosphor-icons/react";

import styles from "./InlineStatus.module.css";

export type InlineStatusTone = "info" | "success" | "warning" | "error";

export interface InlineStatusProps {
  tone: InlineStatusTone;
  /** Use for failures needing immediate assertive announcement (e.g.
   * failed save). Defaults to a polite, non-interrupting announcement. */
  assertive?: boolean;
  children: ReactNode;
}

const TONE_GLYPH: Record<InlineStatusTone, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
  error: XCircle,
};

/**
 * Field failure, autosave state, or blocking notice. Never steals focus:
 * only announces via a live region role, does not move keyboard focus.
 */
export function InlineStatus({ tone, assertive = false, children }: InlineStatusProps) {
  const Glyph = TONE_GLYPH[tone];
  return (
    <div
      role={assertive ? "alert" : "status"}
      className={[styles.status, styles[tone]].join(" ")}
    >
      <span aria-hidden="true" className={styles.glyph}>
        <Glyph size={18} weight="bold" />
      </span>
      <span>{children}</span>
    </div>
  );
}

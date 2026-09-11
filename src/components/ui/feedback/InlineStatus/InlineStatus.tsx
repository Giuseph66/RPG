import type { ReactNode } from "react";

import styles from "./InlineStatus.module.css";

export type InlineStatusTone = "info" | "success" | "warning" | "error";

export interface InlineStatusProps {
  tone: InlineStatusTone;
  /** Use for failures needing immediate assertive announcement (e.g.
   * failed save). Defaults to a polite, non-interrupting announcement. */
  assertive?: boolean;
  children: ReactNode;
}

const TONE_GLYPH: Record<InlineStatusTone, string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  error: "✕",
};

/**
 * Field failure, autosave state, or blocking notice. Never steals focus:
 * only announces via a live region role, does not move keyboard focus.
 */
export function InlineStatus({ tone, assertive = false, children }: InlineStatusProps) {
  return (
    <div
      role={assertive ? "alert" : "status"}
      className={[styles.status, styles[tone]].join(" ")}
    >
      <span aria-hidden="true" className={styles.glyph}>
        {TONE_GLYPH[tone]}
      </span>
      <span>{children}</span>
    </div>
  );
}

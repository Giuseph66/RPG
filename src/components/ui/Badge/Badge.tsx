import type { ReactNode } from "react";

import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "hp" | "xp" | "magic" | "warning" | "danger";

export interface BadgeProps {
  tone?: BadgeTone;
  /** Badges always carry text; color alone never conveys the meaning. */
  children: ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={[styles.badge, styles[tone]].join(" ")}>{children}</span>;
}

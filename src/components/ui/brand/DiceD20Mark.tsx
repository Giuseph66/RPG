import type { SVGAttributes } from "react";

import styles from "./brand.module.css";

export interface DiceD20MarkProps extends SVGAttributes<SVGSVGElement> {
  /** Optional accessible title; decorative marks remain hidden by default. */
  title?: string;
}

/** Product mark: a D20 medal with a readable twenty, rendered as responsive SVG. */
export function DiceD20Mark({ title, className, ...props }: DiceD20MarkProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 64 64"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      className={[styles.d20, className ?? ""].filter(Boolean).join(" ")}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle className={styles.ring} cx="32" cy="32" r="28" />
      <path d="m32 8 21 16-8 25H19l-8-25Z" />
      <path d="m32 8-1 16 14 25M53 24 31 24 11 24m20 0-12 25M31 24l-1 25" />
      <text x="32" y="39" textAnchor="middle" className={styles.number}>20</text>
    </svg>
  );
}

import type { SVGAttributes } from "react";

import styles from "./brand.module.css";

export interface CampaignSigilProps extends SVGAttributes<SVGSVGElement> {
  /** Optional accessible title; decorative marks remain hidden by default. */
  title?: string;
}

/** Product mark: a small geometric arcane seal, rendered as responsive SVG. */
export function CampaignSigil({ title, className, ...props }: CampaignSigilProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 48 48"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      className={[styles.sigil, className ?? ""].filter(Boolean).join(" ")}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M8 17 17 8h14l9 9v14l-9 9H17l-9-9Z" />
      <path d="m17 8 7 16 7-16M40 17 24 24 8 17m0 14 16-7 16 7M17 40l7-16 7 16" />
      <circle cx="24" cy="24" r="4" />
    </svg>
  );
}

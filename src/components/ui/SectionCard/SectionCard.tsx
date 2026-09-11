import { useId } from "react";
import type { ElementType, ReactNode } from "react";

import styles from "./SectionCard.module.css";

export interface SectionCardProps {
  heading: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Semantic wrapper element. Defaults to `section`. */
  as?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
}

export function SectionCard({
  heading,
  headingLevel = 2,
  as: Tag = "section",
  actions,
  children,
}: SectionCardProps) {
  const headingId = useId();
  const HeadingTag = `h${headingLevel}` as ElementType;

  return (
    <Tag className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <HeadingTag id={headingId} className={styles.heading}>
          {heading}
        </HeadingTag>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </Tag>
  );
}

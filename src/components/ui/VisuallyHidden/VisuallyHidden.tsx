import type { ElementType, ReactNode } from "react";

import styles from "./VisuallyHidden.module.css";

export interface VisuallyHiddenProps {
  children: ReactNode;
  as?: ElementType;
}

/**
 * Renders content that is present for assistive technology and absent
 * visually. Self-contained (does not depend on `src/styles/global.css`
 * being imported) so it works even before the app wires up the design
 * system's global stylesheet.
 */
export function VisuallyHidden({ children, as: Tag = "span" }: VisuallyHiddenProps) {
  return <Tag className={styles.hidden}>{children}</Tag>;
}

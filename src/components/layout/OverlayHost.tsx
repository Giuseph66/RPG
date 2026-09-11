import type { ReactNode } from "react";
import styles from "./layout.module.css";

export function OverlayHost({ children }: { readonly children?: ReactNode }) {
  return <div className={styles.overlayHost} aria-label="Área de sobreposições">{children}</div>;
}

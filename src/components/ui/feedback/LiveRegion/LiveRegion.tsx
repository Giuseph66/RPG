import styles from "./LiveRegion.module.css";

export interface LiveRegionProps {
  /** Current message to announce. Only actually announced by assistive
   * tech when this text changes from the previous render — the caller is
   * responsible for not re-sending the same string to avoid duplicate
   * announcements (e.g. a dice result should update this once per roll,
   * not once per animation frame). */
  message: string;
}

/**
 * A single polite live region for one-shot result announcements (e.g.
 * "Rolagem: 14"). Render once per app/feature and update `message`;
 * do not mount a new LiveRegion per event.
 */
export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={styles.liveRegion}>
      {message}
    </div>
  );
}

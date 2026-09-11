import styles from "./ProgressBar.module.css";

export type ProgressBarTone = "hp" | "xp" | "magic" | "neutral";

export interface ProgressBarProps {
  value: number;
  max: number;
  min?: number;
  /** Accessible name, e.g. "Pontos de vida". */
  label: string;
  tone?: ProgressBarTone;
  /** Temporary points (e.g. temp HP), shown separately from value/max. */
  tempValue?: number;
}

export function ProgressBar({
  value,
  max,
  min = 0,
  label,
  tone = "neutral",
  tempValue,
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = max > min ? ((clampedValue - min) / (max - min)) * 100 : 0;
  const valueText =
    tempValue && tempValue > 0
      ? `${clampedValue} de ${max}, mais ${tempValue} temporário`
      : `${clampedValue} de ${max}`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.valueText}>
          {clampedValue}/{max}
          {tempValue && tempValue > 0 ? (
            <span className={styles.tempValue}> (+{tempValue} temp)</span>
          ) : null}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clampedValue}
        aria-valuetext={valueText}
        className={styles.track}
      >
        <div
          className={[styles.fill, styles[tone]].join(" ")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

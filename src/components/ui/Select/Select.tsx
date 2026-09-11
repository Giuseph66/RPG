import { forwardRef, useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";

import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  /** Flat list of options. Ignored if `children` is provided, which lets
   * a consumer build `<optgroup>` structures directly. */
  options?: SelectOption[];
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      hint,
      error,
      id,
      required,
      options,
      children,
      className,
      "aria-describedby": ariaDescribedBy,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const selectId = id ?? autoId;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [ariaDescribedBy, hintId, errorId]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={[styles.field, className ?? ""].filter(Boolean).join(" ")}>
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required ? (
            <span aria-hidden="true" className={styles.requiredMark}>
              {" "}
              *
            </span>
          ) : null}
        </label>
        {hint ? (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-required={required ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={[styles.select, error ? styles.selectError : ""]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        >
          {children ??
            options?.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
        </select>
        {error ? (
          <p id={errorId} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

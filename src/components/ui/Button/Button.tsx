import { forwardRef, useId } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "disabled"
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Marks the button as performing an async action. Sets aria-busy and
   * blocks activation without hiding the label. */
  busy?: boolean;
  disabled?: boolean;
  /** Accessible reason shown when `disabled` is true. When present, the
   * button stays focusable so assistive tech can reach the explanation
   * instead of being silently skipped (native `disabled` removes it from
   * the tab order). */
  disabledReason?: ReactNode;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      busy = false,
      disabled = false,
      disabledReason,
      type = "button",
      className,
      onClick,
      onKeyDown,
      children,
      "aria-describedby": ariaDescribedBy,
      ...rest
    },
    ref,
  ) {
    const reasonId = useId();
    const isBlocked = disabled || busy;
    const describedBy = disabledReason
      ? [ariaDescribedBy, reasonId].filter(Boolean).join(" ")
      : ariaDescribedBy;

    return (
      <button
        ref={ref}
        type={type}
        className={[
          styles.button,
          styles[variant],
          styles[size],
          isBlocked ? styles.blocked : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-disabled={isBlocked ? true : undefined}
        aria-busy={busy ? true : undefined}
        aria-describedby={describedBy || undefined}
        onClick={(event) => {
          if (isBlocked) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (isBlocked && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            return;
          }
          onKeyDown?.(event);
        }}
        {...rest}
      >
        <span className={busy ? styles.labelWithSpinner : undefined}>
          {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
          {children}
        </span>
        {disabledReason ? (
          <span id={reasonId} className={styles.visuallyHidden}>
            {disabledReason}
          </span>
        ) : null}
      </button>
    );
  },
);

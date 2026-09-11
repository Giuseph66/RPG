import { forwardRef } from "react";
import type { ReactNode } from "react";

import { Button } from "../Button/Button";
import type { ButtonProps } from "../Button/Button";
import styles from "./IconButton.module.css";

export interface IconButtonProps
  extends Omit<ButtonProps, "children" | "aria-label"> {
  /** Required accessible name; there is no visible text alternative. */
  label: string;
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, icon, className, ...rest }, ref) {
    return (
      <Button
        ref={ref}
        aria-label={label}
        className={[styles.iconButton, className ?? ""].filter(Boolean).join(" ")}
        {...rest}
      >
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      </Button>
    );
  },
);

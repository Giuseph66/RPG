import { useId, useRef } from "react";

import { Button } from "../../Button/Button";
import { AppModal } from "../AppModal/AppModal";
import styles from "./ConfirmModal.module.css";

export interface ConfirmModalProps {
  open: boolean;
  /** Accessible dialog title, e.g. "Excluir personagem". */
  title: string;
  /** Name of the affected character/campaign/item, shown prominently. */
  targetName: string;
  /** Describes scope and effect of the action, e.g. "Esta ação remove
   * permanentemente a ficha e não pode ser desfeita." */
  description: string;
  /** Describes the effect, e.g. "Excluir Thalindra", not "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders the confirm action as the destructive (danger) variant. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  targetName,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AppModal
      open={open}
      title={title}
      onClose={onClose}
      initialFocusRef={cancelRef}
      dismissOnBackdrop={!busy}
      describedById={descriptionId}
      footer={
        <div className={styles.actions}>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            busy={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className={styles.target}>{targetName}</p>
      <p id={descriptionId} className={styles.description}>
        {description}
      </p>
    </AppModal>
  );
}

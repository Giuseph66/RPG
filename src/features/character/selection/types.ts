import type { CharacterSummary } from "@domain/contracts/character";
import type { CharacterDraftStep } from "@domain/contracts/character";
import type { IsoTimestamp, Uuid } from "@domain/contracts/ids";

/**
 * Nenhum port expõe listagem de rascunhos (`CharacterRepository.getDraft` é por ID); quem
 * conecta esta tela decide como enumerar rascunhos resumíveis e passa o resultado por prop.
 */
export interface DraftSummary {
  readonly id: Uuid;
  readonly name?: string;
  readonly currentStep: CharacterDraftStep;
  readonly updatedAt: IsoTimestamp;
}

export type SelectionStatus = "idle" | "loading" | "error";
export type CharacterSelectionStatus = SelectionStatus;

export interface CharacterSelectionProps {
  readonly characters?: readonly CharacterSummary[];
  readonly drafts?: readonly DraftSummary[];
  readonly status?: SelectionStatus;
  readonly error?: unknown;
  readonly onSelect?: (id: Uuid) => void;
  readonly onCreate?: () => void;
  readonly onResumeDraft?: (id: Uuid) => void;
  readonly onDiscardDraft?: (id: Uuid) => void;
  readonly onRetry?: () => void;
}

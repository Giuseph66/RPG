import type { Character } from "@domain/contracts/character";
import type { ProgressionCatalogInput, LevelUpRequest } from "@domain/character/progression";

export type ProgressionUiStatus = "idle" | "previewing" | "applying" | "error";

export interface CharacterProgressionProps {
  readonly character: Character;
  readonly catalog: ProgressionCatalogInput;
  readonly status?: ProgressionUiStatus;
  readonly error?: unknown;
  readonly onGrantXp?: (amount: number) => void;
  readonly onApplyLevelUp?: (request: LevelUpRequest) => void;
  /** Alias semântico para consumidores que chamam a intenção de avançar nível. */
  readonly onLevelUp?: (request: LevelUpRequest) => void;
  readonly onCancel?: () => void;
}

/**
 * DiceHistoryRepository. Autoridade: 11-DICE-ENGINE.md ("Histórico e UX").
 * "Limpeza de histórico exige confirmação própria" — a confirmação é responsabilidade da UI;
 * este contrato só expõe a operação, sem prompt nativo (00-START-HERE.md proíbe confirm()).
 */

import { type Uuid } from "@domain/contracts/ids";
import { type DiceHistoryEntry } from "@domain/contracts/dice";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type TransactionContext } from "./unit-of-work";

export interface DiceHistoryFilter {
  /** Ausente => rolagens livres globais, separadas do histórico por personagem. */
  readonly characterId?: Uuid;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface DiceHistoryPage {
  readonly entries: readonly DiceHistoryEntry[];
  readonly nextCursor?: string;
}

export interface DiceHistoryRepository {
  /** Com `context`, o roll fica no mesmo commit do personagem e do command receipt. */
  append(entry: DiceHistoryEntry, context?: TransactionContext): Promise<Result<void, AppError>>;
  list(filter: DiceHistoryFilter): Promise<Result<DiceHistoryPage, AppError>>;
  /** Nunca remove efeitos já aplicados na ficha — só o registro de histórico. */
  clear(characterId?: Uuid): Promise<Result<void, AppError>>;
}

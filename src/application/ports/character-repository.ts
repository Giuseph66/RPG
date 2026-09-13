/**
 * CharacterRepository. Autoridade: dados/schemas.md ("Aplicação e repositórios"),
 * 08-PERSISTENCIA-LOCAL.md.
 */

import { type Uuid } from "@domain/contracts/ids";
import { type Character, type CharacterDraft, type CharacterSummary } from "@domain/contracts/character";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type CommandReceipt } from "@domain/contracts/rules";
import { type Revision } from "@domain/contracts/versioning";
import { type TransactionContext } from "./unit-of-work";

export interface CharacterFilter {
  readonly campaignId?: Uuid;
  readonly includeArchived?: boolean;
}

export interface CharacterRepository {
  get(id: Uuid): Promise<Result<Character, AppError>>;
  list(filter?: CharacterFilter, context?: TransactionContext): Promise<Result<readonly CharacterSummary[], AppError>>;
  /** `commandReceipt` grava idempotência do comando na mesma transação (08-PERSISTENCIA-LOCAL.md). */
  /** `context` permite juntar personagem, rolagens e recibo no mesmo commit. */
  save(
    character: Character,
    expectedRevision: Revision,
    commandReceipt?: CommandReceipt,
    context?: TransactionContext,
  ): Promise<Result<Revision, AppError>>;
  delete(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;

  getDraft(id: Uuid): Promise<Result<CharacterDraft, AppError>>;
  saveDraft(draft: CharacterDraft): Promise<Result<CharacterDraft, AppError>>;
  deleteDraft(id: Uuid): Promise<Result<void, AppError>>;
}

import { type CreatureGuess, type CreatureRecord, type CreatureSighting } from "@domain/campaign/creatures";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { type Revision } from "@domain/contracts/versioning";

import { type TransactionContext } from "./unit-of-work";

export type JourneyVisibilityKind = "creature" | "sighting" | "guess";

export interface JourneyVisibilityRecordMap {
  readonly creature: CreatureRecord;
  readonly sighting: CreatureSighting;
  readonly guess: CreatureGuess;
}

/**
 * Persistência local de criaturas (mestre), avistamentos (projeção por jogador) e palpites.
 * Todas as gravações usam CAS por revisão e devolvem a revisão persistida.
 */
export interface JourneyVisibilityRepository {
  list<K extends JourneyVisibilityKind>(kind: K, campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly JourneyVisibilityRecordMap[K][], AppError>>;
  get<K extends JourneyVisibilityKind>(kind: K, id: string, context?: TransactionContext): Promise<Result<JourneyVisibilityRecordMap[K] | undefined, AppError>>;
  save<K extends JourneyVisibilityKind>(kind: K, record: JourneyVisibilityRecordMap[K], expectedRevision: Revision, context?: TransactionContext): Promise<Result<JourneyVisibilityRecordMap[K], AppError>>;
  delete(kind: JourneyVisibilityKind, id: string, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;
}

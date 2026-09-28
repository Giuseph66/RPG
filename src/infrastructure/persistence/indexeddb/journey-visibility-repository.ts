import { isCreatureGuess, isCreatureRecord, isCreatureSighting } from "@domain/campaign/creatures";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import {
  type JourneyVisibilityKind,
  type JourneyVisibilityRecordMap,
  type JourneyVisibilityRepository,
} from "@application/ports/journey-visibility-repository";
import { type Clock } from "@application/ports/clock";
import { type TransactionContext } from "@application/ports/unit-of-work";

import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransactionOrContext } from "./transaction";

const STORES: Readonly<Record<JourneyVisibilityKind, string>> = {
  creature: STORE_NAMES.creatures,
  sighting: STORE_NAMES.sightings,
  guess: STORE_NAMES.guesses,
};

const GUARDS: Readonly<Record<JourneyVisibilityKind, (value: unknown) => boolean>> = {
  creature: isCreatureRecord,
  sighting: isCreatureSighting,
  guess: isCreatureGuess,
};

export class IndexedDbJourneyVisibilityRepository implements JourneyVisibilityRepository {
  constructor(private readonly db: IDBDatabase, private readonly clock: Clock) {}

  async list<K extends JourneyVisibilityKind>(kind: K, campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly JourneyVisibilityRecordMap[K][], AppError>> {
    const store = STORES[kind];
    return runTransactionOrContext(this.db, [store], "readonly", context, async (tx) => {
      const raw = await requestToPromise(tx.objectStore(store).index("campaignId").getAll(campaignId)) as unknown[];
      // Registros inválidos (versão futura, snapshot parcial) são ignorados em vez de derrubar a jornada.
      const valid = raw.filter(GUARDS[kind]) as JourneyVisibilityRecordMap[K][];
      return ok(valid.sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)) || left.id.localeCompare(right.id)));
    });
  }

  async get<K extends JourneyVisibilityKind>(kind: K, id: string, context?: TransactionContext): Promise<Result<JourneyVisibilityRecordMap[K] | undefined, AppError>> {
    const store = STORES[kind];
    return runTransactionOrContext(this.db, [store], "readonly", context, async (tx) => {
      const raw = await requestToPromise(tx.objectStore(store).get(id));
      if (raw === undefined) return ok(undefined);
      return GUARDS[kind](raw) ? ok(raw as JourneyVisibilityRecordMap[K]) : err(appError.corruptRecord(id));
    });
  }

  async save<K extends JourneyVisibilityKind>(kind: K, record: JourneyVisibilityRecordMap[K], expectedRevision: Revision, context?: TransactionContext): Promise<Result<JourneyVisibilityRecordMap[K], AppError>> {
    const store = STORES[kind];
    const now = this.clock.now();
    return runTransactionOrContext(this.db, [store], "readwrite", context, async (tx) => {
      const objects = tx.objectStore(store);
      const raw = await requestToPromise(objects.get(record.id));
      const actual = raw === undefined ? asRevision(0) : GUARDS[kind](raw) ? asRevision((raw as { revision: number }).revision) : undefined;
      if (actual === undefined) return err(appError.corruptRecord(record.id));
      if (actual !== expectedRevision) return err(appError.conflict(expectedRevision, actual));
      const next = { ...record, revision: asRevision(expectedRevision + 1), updatedAt: now } as JourneyVisibilityRecordMap[K];
      if (!GUARDS[kind](next)) return err(appError.validation(kind, "Registro da jornada inválido."));
      await requestToPromise(objects.put(next));
      return ok(next);
    });
  }

  async delete(kind: JourneyVisibilityKind, id: string, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    const store = STORES[kind];
    return runTransactionOrContext(this.db, [store], "readwrite", context, async (tx) => {
      const objects = tx.objectStore(store);
      const raw = await requestToPromise(objects.get(id));
      if (raw === undefined) return ok(undefined);
      const actual = asRevision(Number((raw as { revision?: number }).revision ?? 0));
      if (actual !== expectedRevision) return err(appError.conflict(expectedRevision, actual));
      await requestToPromise(objects.delete(id));
      return ok(undefined);
    });
  }
}

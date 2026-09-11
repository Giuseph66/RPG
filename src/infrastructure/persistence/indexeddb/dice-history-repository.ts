import { type DiceHistoryFilter, type DiceHistoryPage, type DiceHistoryRepository } from "@application/ports/dice-history-repository";
import { type Clock } from "@application/ports/clock";
import { type TransactionContext } from "@application/ports/unit-of-work";
import { type DiceHistoryEntry, type DiceRoll } from "@domain/contracts/dice";
import { type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { persistToRecovery } from "./record-guards";
import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransaction, runTransactionOrContext } from "./transaction";

interface StoredRoll {
  readonly id: Uuid;
  readonly roll: DiceRoll;
  readonly characterId?: Uuid;
}

function isStoredRoll(value: unknown): value is StoredRoll {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const roll = record.roll;
  return (
    typeof record.id === "string" &&
    typeof roll === "object" && roll !== null &&
    typeof (roll as Record<string, unknown>).id === "string" &&
    record.id === (roll as Record<string, unknown>).id
  );
}

function asEntry(value: StoredRoll): DiceHistoryEntry {
  return { roll: value.roll, ...(value.characterId === undefined ? {} : { characterId: value.characterId }) };
}

function recordId(value: unknown, index: number): string {
  if (typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return `rolls:unknown:${index}`;
}

export class IndexedDbDiceHistoryRepository implements DiceHistoryRepository {
  constructor(private readonly db: IDBDatabase, private readonly clock: Clock) {}

  async append(entry: DiceHistoryEntry, context?: TransactionContext): Promise<Result<void, AppError>> {
    if (!entry || !entry.roll || typeof entry.roll.id !== "string") {
      return err(appError.validation("entry", "Registro de rolagem inválido."));
    }
    const stored: StoredRoll = { id: entry.roll.id, roll: entry.roll, characterId: entry.characterId };
    return runTransactionOrContext(this.db, [STORE_NAMES.rolls], "readwrite", context, async (tx) => {
      await requestToPromise(tx.objectStore(STORE_NAMES.rolls).put(stored));
      return ok(undefined);
    });
  }

  async list(filter: DiceHistoryFilter): Promise<Result<DiceHistoryPage, AppError>> {
    const result = await runTransaction(this.db, [STORE_NAMES.rolls], "readonly", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.rolls);
      const raws = filter.characterId === undefined
        ? await requestToPromise(store.getAll())
        : await requestToPromise(store.index("characterId").getAll(IDBKeyRange.only(filter.characterId)));
      return ok((raws as unknown[]).filter((raw) =>
        filter.characterId === undefined
          ? !isStoredRoll(raw) || (raw as StoredRoll).characterId === undefined
          : true,
      ));
    });
    if (!result.ok) return result;

    const entries: DiceHistoryEntry[] = [];
    for (const [index, raw] of result.value.entries()) {
      if (!isStoredRoll(raw)) {
        const id = recordId(raw, index);
        await persistToRecovery(this.db, id, STORE_NAMES.rolls, raw, this.clock.now());
        return err(appError.corruptRecord(id, undefined, id));
      }
      entries.push(asEntry(raw));
    }

    const offset = filter.cursor ? Number.parseInt(filter.cursor, 10) : 0;
    if (!Number.isInteger(offset) || offset < 0) return err(appError.validation("cursor", "Cursor de histórico inválido."));
    const limit = filter.limit ?? entries.length;
    if (!Number.isInteger(limit) || limit < 0) return err(appError.validation("limit", "Limite de histórico inválido."));
    const page = entries.slice(offset, offset + limit);
    const nextCursor = offset + limit < entries.length ? String(offset + limit) : undefined;
    return ok({ entries: page, ...(nextCursor === undefined ? {} : { nextCursor }) });
  }

  async clear(characterId?: Uuid): Promise<Result<void, AppError>> {
    const read = await runTransaction(this.db, [STORE_NAMES.rolls], "readonly", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.rolls);
      const raws = characterId === undefined
        ? await requestToPromise(store.getAll())
        : await requestToPromise(store.index("characterId").getAll(IDBKeyRange.only(characterId)));
      return ok(raws as unknown[]);
    });
    if (!read.ok) return read;
    const ids: Uuid[] = [];
    for (const [index, raw] of read.value.entries()) {
      if (!isStoredRoll(raw)) {
        const id = recordId(raw, index);
        await persistToRecovery(this.db, id, STORE_NAMES.rolls, raw, this.clock.now());
        return err(appError.corruptRecord(id, undefined, id));
      }
      ids.push(raw.id);
    }
    return runTransaction(this.db, [STORE_NAMES.rolls], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.rolls);
      for (const id of ids) await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }
}

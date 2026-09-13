import type { RecoveryRecordView, RecoveryStore } from "@application/transfer/types";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransaction } from "./transaction";

const SOURCE_STORES = new Set<string>(Object.values(STORE_NAMES).filter((name) => name !== STORE_NAMES.recovery));
const ALL_STORES = Object.values(STORE_NAMES);

function isRecoveryRecord(value: unknown): value is RecoveryRecordView {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.sourceStore === "string" && typeof record.recordedAt === "string" && "raw" in record;
}

function keyPathFor(storeName: string): "id" | "commandId" | "key" {
  if (storeName === STORE_NAMES.commandReceipts) return "commandId";
  if (storeName === STORE_NAMES.meta) return "key";
  return "id";
}

/** Recupera snapshots brutos preservados por corrupção ou substituição explícita. */
export class IndexedDbRecoveryRepository implements RecoveryStore {
  constructor(private readonly db: IDBDatabase) {}

  async list(): Promise<Result<readonly RecoveryRecordView[], AppError>> {
    return runTransaction(this.db, [STORE_NAMES.recovery], "readonly", async (tx) => {
      const raws = await requestToPromise(tx.objectStore(STORE_NAMES.recovery).getAll());
      const records: RecoveryRecordView[] = [];
      for (const raw of raws) {
        if (!isRecoveryRecord(raw)) return err(appError.corruptRecord("recovery"));
        records.push(raw);
      }
      return ok(records);
    });
  }

  async restore(id: string): Promise<Result<void, AppError>> {
    return runTransaction(this.db, ALL_STORES, "readwrite", async (tx) => {
      const recoveryStore = tx.objectStore(STORE_NAMES.recovery);
      const raw = await requestToPromise(recoveryStore.get(id));
      if (raw === undefined) return err(appError.notFound("recovery", id));
      if (!isRecoveryRecord(raw)) return err(appError.corruptRecord(id));
      if (!SOURCE_STORES.has(raw.sourceStore)) return err(appError.validation("sourceStore", "Store de recuperação desconhecida."));

      const sourceRecord = typeof raw.raw === "object" && raw.raw !== null ? raw.raw as Record<string, unknown> : undefined;
      const keyPath = keyPathFor(raw.sourceStore);
      if (sourceRecord === undefined || typeof sourceRecord[keyPath] !== "string") {
        return err(appError.corruptRecord(id));
      }

      await requestToPromise(tx.objectStore(raw.sourceStore).put(raw.raw));
      await requestToPromise(recoveryStore.delete(id));
      return ok(undefined);
    });
  }

  async discard(id: string): Promise<Result<void, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.recovery], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.recovery);
      const raw = await requestToPromise(store.get(id));
      if (raw === undefined) return err(appError.notFound("recovery", id));
      await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }
}

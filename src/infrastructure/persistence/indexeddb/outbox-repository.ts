import { type Clock } from "@application/ports/clock";
import { type OutboxListOptions, type OutboxRepository, type SyncFailure } from "@application/ports/outbox-repository";
import { type TransactionContext } from "@application/ports/unit-of-work";
import {
  isSyncOperation,
  syncOperationDedupeKey,
  type SyncConflict,
  type SyncOperation,
} from "@domain/contracts/cloud-sync";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asCommandId, asIsoTimestamp, type CommandId } from "@domain/contracts/ids";

import { persistToRecovery } from "./record-guards";
import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransaction, runTransactionOrContext } from "./transaction";

function operationIdOf(value: unknown, index = 0): string {
  return typeof value === "object" && value !== null && typeof (value as { operationId?: unknown }).operationId === "string"
    ? (value as { operationId: string }).operationId
    : `outbox:unknown:${index}`;
}

function equivalentOperation(left: SyncOperation, right: SyncOperation): boolean {
  return (
    left.operationId === right.operationId &&
    left.aggregateType === right.aggregateType &&
    left.aggregateId === right.aggregateId &&
    left.mutation === right.mutation &&
    left.baseRevision === right.baseRevision &&
    JSON.stringify(left.payload) === JSON.stringify(right.payload)
  );
}

function validateOperationForEnqueue(operation: SyncOperation): AppError | undefined {
  if (!isSyncOperation(operation)) return appError.validation("operation", "Operação de sincronização inválida.");
  if (operation.status !== "pending") return appError.validation("status", "Somente operações pending podem entrar no outbox.");
  if (operation.attempts !== 0) return appError.validation("attempts", "Operação nova deve iniciar com zero tentativas.");
  if (operation.dedupeKey !== syncOperationDedupeKey(operation)) return appError.validation("dedupeKey", "Chave de deduplicação inconsistente.");
  return undefined;
}

export class IndexedDbOutboxRepository implements OutboxRepository {
  constructor(private readonly db: IDBDatabase, private readonly clock: Clock) {}

  async enqueue(operation: SyncOperation, context?: TransactionContext): Promise<Result<SyncOperation, AppError>> {
    const invalid = validateOperationForEnqueue(operation);
    if (invalid) return err(invalid);

    const write = await runTransactionOrContext(this.db, [STORE_NAMES.outbox], "readwrite", context, async (tx) => {
      const store = tx.objectStore(STORE_NAMES.outbox);
      const existingRaw = await requestToPromise(store.index("dedupeKey").get(operation.dedupeKey));
      if (existingRaw !== undefined) {
        if (!isSyncOperation(existingRaw)) return err(appError.corruptRecord(operationIdOf(existingRaw), "Registro de outbox corrompido.", operationIdOf(existingRaw)));
        if (!equivalentOperation(existingRaw, operation)) {
          return err(appError.validation("dedupeKey", "Já existe uma operação diferente para a mesma chave de deduplicação."));
        }
        return ok(existingRaw);
      }
      await requestToPromise(store.put(operation));
      return ok(operation);
    });
    if (write.ok || context !== undefined || write.error.code !== "storage-unavailable") return write;

    // Duas abas podem ter lido a fila vazia simultaneamente. O índice unique faz uma
    // delas abortar; reler após o abort torna esse caso idempotente em vez de reportá-lo
    // como falha de armazenamento.
    const raced = await this.findByDedupeKey(operation.dedupeKey);
    if (raced.ok && equivalentOperation(raced.value, operation)) return raced;
    return write;
  }

  async get(operationId: CommandId): Promise<Result<SyncOperation, AppError>> {
    try {
      asCommandId(operationId);
    } catch (cause) {
      return err(appError.validation("operationId", cause instanceof Error ? cause.message : "ID inválido."));
    }
    const result = await runTransaction(this.db, [STORE_NAMES.outbox], "readonly", async (tx) => {
      return ok(await requestToPromise(tx.objectStore(STORE_NAMES.outbox).get(operationId)));
    });
    if (!result.ok) return result;
    if (result.value === undefined) return err(appError.notFound("sync-operation", operationId));
    return this.validateRead(result.value, operationId);
  }

  async listPending(options: OutboxListOptions = {}): Promise<Result<readonly SyncOperation[], AppError>> {
    const now = options.now ?? this.clock.now();
    try {
      asIsoTimestamp(now);
    } catch (cause) {
      return err(appError.validation("now", cause instanceof Error ? cause.message : "Momento inválido."));
    }
    if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 0)) {
      return err(appError.validation("limit", "Limite deve ser um inteiro >= 0."));
    }

    const result = await runTransaction(this.db, [STORE_NAMES.outbox], "readonly", async (tx) => {
      return ok(await requestToPromise(tx.objectStore(STORE_NAMES.outbox).getAll()));
    });
    if (!result.ok) return result;

    const operations: SyncOperation[] = [];
    for (const [index, raw] of (result.value as unknown[]).entries()) {
      const valid = await this.validateRead(raw, operationIdOf(raw, index));
      if (!valid.ok) return valid;
      const operation = valid.value;
      const retryable = operation.status === "failed" && operation.nextRetryAt !== undefined && operation.nextRetryAt <= now;
      if (operation.status === "pending" || retryable) operations.push(operation);
    }
    operations.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.operationId.localeCompare(right.operationId));
    return ok(options.limit === undefined ? operations : operations.slice(0, options.limit));
  }

  markSyncing(operationId: CommandId): Promise<Result<SyncOperation, AppError>> {
    return this.mutate(operationId, (operation) => {
      if (operation.status === "syncing") return operation;
      if (operation.status !== "pending" && operation.status !== "failed") return appError.validation("status", "Somente operações pending ou failed podem iniciar sincronização.");
      return {
        ...operation,
        status: "syncing",
        attempts: operation.attempts + 1,
        lastAttemptAt: this.clock.now(),
        nextRetryAt: undefined,
        lastError: undefined,
        conflict: undefined,
        updatedAt: this.clock.now(),
      };
    });
  }

  markAcked(operationId: CommandId): Promise<Result<SyncOperation, AppError>> {
    return this.mutate(operationId, (operation) => {
      if (operation.status === "acked") return operation;
      if (operation.status !== "syncing" && operation.status !== "pending") return appError.validation("status", "Somente operações pending ou syncing podem ser confirmadas.");
      return {
        ...operation,
        status: "acked",
        nextRetryAt: undefined,
        lastError: undefined,
        conflict: undefined,
        updatedAt: this.clock.now(),
      };
    });
  }

  markConflict(operationId: CommandId, conflict: Omit<SyncConflict, "detectedAt">): Promise<Result<SyncOperation, AppError>> {
    if (conflict.message.trim().length === 0) return Promise.resolve(err(appError.validation("conflict.message", "Conflito exige uma mensagem.")));
    return this.mutate(operationId, (operation) => {
      if (operation.status === "conflict") return operation;
      if (operation.status !== "syncing" && operation.status !== "pending" && operation.status !== "failed") return appError.validation("status", "Operação já finalizada não pode virar conflito.");
      return {
        ...operation,
        status: "conflict",
        conflict: { ...conflict, detectedAt: this.clock.now() },
        nextRetryAt: undefined,
        lastError: undefined,
        updatedAt: this.clock.now(),
      };
    });
  }

  markFailed(operationId: CommandId, failure: SyncFailure): Promise<Result<SyncOperation, AppError>> {
    if (failure.message.trim().length === 0) return Promise.resolve(err(appError.validation("failure.message", "Falha exige uma mensagem.")));
    return this.mutate(operationId, (operation) => {
      if (operation.status === "acked" || operation.status === "conflict") return appError.validation("status", "Operação finalizada não pode ser marcada como failed.");
      return {
        ...operation,
        status: "failed",
        lastError: failure.message,
        nextRetryAt: failure.nextRetryAt,
        conflict: undefined,
        updatedAt: this.clock.now(),
      };
    });
  }

  private async findByDedupeKey(dedupeKey: string): Promise<Result<SyncOperation, AppError>> {
    const result = await runTransaction(this.db, [STORE_NAMES.outbox], "readonly", async (tx) => {
      return ok(await requestToPromise(tx.objectStore(STORE_NAMES.outbox).index("dedupeKey").get(dedupeKey)));
    });
    if (!result.ok) return result;
    if (result.value === undefined) return err(appError.notFound("sync-operation", dedupeKey));
    return this.validateRead(result.value, operationIdOf(result.value));
  }

  private async validateRead(raw: unknown, recordId: string): Promise<Result<SyncOperation, AppError>> {
    if (isSyncOperation(raw)) return ok(raw);
    await persistToRecovery(this.db, recordId, STORE_NAMES.outbox, raw, this.clock.now());
    return err(appError.corruptRecord(recordId, "Registro de outbox corrompido.", recordId));
  }

  private async mutate(operationId: CommandId, update: (operation: SyncOperation) => SyncOperation | AppError): Promise<Result<SyncOperation, AppError>> {
    try {
      asCommandId(operationId);
    } catch (cause) {
      return err(appError.validation("operationId", cause instanceof Error ? cause.message : "ID inválido."));
    }
    return runTransaction(this.db, [STORE_NAMES.outbox], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.outbox);
      const raw = await requestToPromise(store.get(operationId));
      if (raw === undefined) return err(appError.notFound("sync-operation", operationId));
      if (!isSyncOperation(raw)) return err(appError.corruptRecord(operationId, "Registro de outbox corrompido.", operationId));
      const next = update(raw);
      if ("code" in next) return err(next);
      await requestToPromise(store.put(next));
      return ok(next);
    });
  }
}

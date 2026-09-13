/** Composição de aplicação para construir operações locais antes de enfileirá-las. */

import { type OutboxRepository } from "@application/ports/outbox-repository";
import { type TransactionContext } from "@application/ports/unit-of-work";
import { type AuthSession } from "@application/ports/auth-port";
import {
  isJsonValue,
  syncOperationDedupeKey,
  type JsonValue,
  type SyncAggregateType,
  type SyncMutation,
  type SyncOperation,
  type SyncScope,
} from "@domain/contracts/cloud-sync";
import { asCommandId, asIsoTimestamp, type AccountId, type CommandId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";

export * from "./worker";
export * from "./runtime";
export * from "./pull";
export * from "./campaign-cleanup";

export interface NewSyncOperation {
  readonly operationId: CommandId;
  readonly aggregateType: SyncAggregateType;
  readonly aggregateId: AccountId | Uuid;
  readonly mutation: SyncMutation;
  readonly baseRevision: Revision;
  readonly scope?: SyncScope;
  readonly payload?: JsonValue;
  readonly createdAt: IsoTimestamp;
}

/** Converte snapshots de agregados em JSON sem vazar propriedades opcionais `undefined`. */
export function toJsonSnapshot(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const items = value.map(toJsonSnapshot);
    return items.every((item): item is JsonValue => item !== undefined) ? items : undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const result: { [key: string]: JsonValue } = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    const snapshot = toJsonSnapshot(item);
    if (snapshot === undefined) return undefined;
    result[key] = snapshot;
  }
  return result;
}

/** Cria o envelope inicial sem chamar relógio, rede ou plataforma. */
export function createPendingSyncOperation(input: NewSyncOperation): Result<SyncOperation, AppError> {
  try {
    asCommandId(input.operationId);
    asIsoTimestamp(input.createdAt);
    asRevision(input.baseRevision);
  } catch (cause) {
    return err(appError.validation("operation", cause instanceof Error ? cause.message : "Operação inválida."));
  }
  if (input.aggregateId.trim().length === 0) return err(appError.validation("aggregateId", "Agregado deve ter um identificador."));
  if (input.mutation === "upsert" && input.payload === undefined) return err(appError.validation("payload", "Upsert exige snapshot serializável."));
  if (input.mutation === "delete" && input.payload !== undefined) return err(appError.validation("payload", "Delete não aceita snapshot."));
  if (input.mutation === "delete" && (input.aggregateType === "character" || input.aggregateType === "journal" || input.aggregateType === "map" || input.aggregateType === "session") && input.scope?.campaignId === undefined && !(input.aggregateType === "character" && input.scope?.ownerUid !== undefined)) {
    return err(appError.validation("scope", `${input.aggregateType} delete exige escopo imutável.`));
  }
  if (input.payload !== undefined && !isJsonValue(input.payload)) return err(appError.validation("payload", "Snapshot contém valor não serializável."));

  const operation: SyncOperation = {
    ...input,
    status: "pending",
    attempts: 0,
    updatedAt: input.createdAt,
    dedupeKey: syncOperationDedupeKey(input as SyncOperation),
  };
  return { ok: true, value: operation };
}

export interface SyncOutboxService {
  enqueue(input: NewSyncOperation, context?: TransactionContext): Promise<Result<SyncOperation, AppError>>;
}

/**
 * An operation is locally useful without an account, but must not enter the
 * cloud outbox until Firebase has established an identity. The owner marker
 * also prevents a later account from draining another account's local queue.
 */
export interface OwnedSyncOperation extends SyncOperation {
  readonly ownerUid?: string;
}

export interface SessionReader {
  currentSession(): AuthSession | null;
}

export interface SessionGatedOutboxOptions {
  readonly onEnqueued?: () => void;
}

/**
 * Keeps application writes local-only while signed out. Once authenticated it
 * delegates to the real IndexedDB outbox and tags each record with its owner.
 */
export function createSessionGatedOutboxRepository(
  repository: OutboxRepository,
  session: SessionReader,
  options: SessionGatedOutboxOptions = {},
): OutboxRepository {
  return {
    async enqueue(operation, context) {
      const current = session.currentSession();
      if (!current) return ok(operation);
      const owned = { ...operation, ownerUid: current.uid } as OwnedSyncOperation;
      const result = await repository.enqueue(owned, context);
      if (result.ok) options.onEnqueued?.();
      return result;
    },
    get: (operationId) => repository.get(operationId),
    listPending: (listOptions) => repository.listPending(listOptions),
    markSyncing: (operationId) => repository.markSyncing(operationId),
    markAcked: (operationId) => repository.markAcked(operationId),
    markConflict: (operationId, conflict) => repository.markConflict(operationId, conflict),
    markFailed: (operationId, failure) => repository.markFailed(operationId, failure),
  };
}

export function createSyncOutboxService(repository: OutboxRepository): SyncOutboxService {
  return {
    async enqueue(input, context) {
      const operation = createPendingSyncOperation(input);
      return operation.ok ? repository.enqueue(operation.value, context) : operation;
    },
  };
}

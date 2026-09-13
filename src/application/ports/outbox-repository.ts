/** Porta do outbox local. Nenhum método conhece Firebase ou outro transporte remoto. */

import { type SyncConflict, type SyncOperation } from "@domain/contracts/cloud-sync";
import { type CommandId, type IsoTimestamp } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type TransactionContext } from "./unit-of-work";

export interface OutboxListOptions {
  /** Limita a quantidade sem alterar a ordem FIFO. */
  readonly limit?: number;
  /** Momento usado para tornar falhas retryable elegíveis; default é o Clock do adapter. */
  readonly now?: IsoTimestamp;
}

export interface SyncFailure {
  readonly message: string;
  /** Se omitido, a operação continua failed até ser reagendada explicitamente. */
  readonly nextRetryAt?: IsoTimestamp;
}

export interface OutboxRepository {
  /** Grava uma operação pendente ou devolve o registro já existente com a mesma chave. */
  enqueue(operation: SyncOperation, context?: TransactionContext): Promise<Result<SyncOperation, AppError>>;
  get(operationId: CommandId): Promise<Result<SyncOperation, AppError>>;
  /** Retorna pending e failed cujo nextRetryAt já venceu, em ordem de criação. */
  listPending(options?: OutboxListOptions): Promise<Result<readonly SyncOperation[], AppError>>;
  markSyncing(operationId: CommandId): Promise<Result<SyncOperation, AppError>>;
  markAcked(operationId: CommandId): Promise<Result<SyncOperation, AppError>>;
  markConflict(operationId: CommandId, conflict: Omit<SyncConflict, "detectedAt">): Promise<Result<SyncOperation, AppError>>;
  markFailed(operationId: CommandId, failure: SyncFailure): Promise<Result<SyncOperation, AppError>>;
}

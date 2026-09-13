/**
 * Porta do transporte remoto opcional.
 *
 * O worker e a aplicação só conhecem este contrato; nenhum tipo do Firebase
 * atravessa a fronteira. IndexedDB continua sendo a fonte de escrita imediata.
 */

import { type JsonValue, type SyncAggregateType, type SyncConflict, type SyncOperation, type SyncScope } from "@domain/contracts/cloud-sync";
import { type IsoTimestamp } from "@domain/contracts/ids";
import { type Revision } from "@domain/contracts/versioning";

export type RemoteSyncErrorCode =
  | "remote-unavailable"
  | "remote-network"
  | "remote-permission"
  | "remote-error";

export interface RemoteSyncError {
  readonly code: RemoteSyncErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: string;
}

export interface RemoteSyncAck {
  readonly kind: "acked";
  readonly remoteRevision: Revision;
}

export interface RemoteSyncConflict {
  readonly kind: "conflict";
  readonly conflict: Omit<SyncConflict, "detectedAt">;
}

export type RemoteSyncApplyResult = RemoteSyncAck | RemoteSyncConflict;

/** Registro remoto já normalizado para o contrato local. */
export interface RemoteSyncPullRecord {
  readonly aggregateType: SyncAggregateType;
  readonly aggregateId: string;
  readonly scope?: SyncScope;
  readonly revision: Revision;
  readonly updatedAt?: IsoTimestamp;
  readonly payload: JsonValue;
}

export interface RemoteSyncPullResult {
  readonly records: readonly RemoteSyncPullRecord[];
  /** Cursor reservado para transports paginados; o pull atual é replay-safe sem cursor. */
  readonly cursor?: string;
}

export interface RemoteSyncPullAdapter {
  pull(): Promise<
    { readonly ok: true; readonly value: RemoteSyncPullResult } |
    { readonly ok: false; readonly error: RemoteSyncError }
  >;
  /** Listener de mudanças remotas. A callback só agenda novo pull. */
  subscribe?(listener: () => void): () => void;
}

export interface RemoteSyncAdapter {
  /** Indica disponibilidade sem iniciar uma chamada de rede. */
  isAvailable(): boolean;
  /** Aplica uma operação já persistida no outbox e só resolve após o commit remoto. */
  apply(operation: SyncOperation): Promise<
    { readonly ok: true; readonly value: RemoteSyncApplyResult } |
    { readonly ok: false; readonly error: RemoteSyncError }
  >;
  /** Opcional: leitura inicial/contínua após autenticação. */
  readonly pull?: RemoteSyncPullAdapter["pull"];
  readonly subscribe?: RemoteSyncPullAdapter["subscribe"];
}

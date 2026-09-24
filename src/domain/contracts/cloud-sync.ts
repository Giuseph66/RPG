/**
 * Contratos serializáveis da sincronização opcional.
 * Autoridade: docs/criacao/decisoes/ADR-0007-cloud-sync.md.
 *
 * Estes tipos não importam Firebase, IndexedDB, Date, Blob ou qualquer tipo de SDK.
 * O formato local é deliberadamente independente do formato remoto.
 */

import { type AccountId, type CommandId, type IsoTimestamp, type Uuid } from "./ids";
import { type Revision, type SchemaVersion } from "./versioning";

export type { AccountId } from "./ids";

export type CampaignRole = "master" | "player";
export type MembershipStatus = "invited" | "active" | "revoked";

/** Perfil local mínimo da conta; senha e tokens nunca pertencem a este contrato. */
export interface Account {
  readonly id: AccountId;
  readonly email: string | null;
  readonly displayName?: string;
  /** Preferência de papel padrão para novas campanhas; nunca concede privilégio de mestre em campanhas existentes. */
  readonly preferredCampaignRole?: CampaignRole;
  /** Revisão local do perfil; ausente somente em registros legados. */
  readonly revision?: Revision;
  readonly schemaVersion: SchemaVersion;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Vínculo explícito entre uma conta e uma campanha. Papel não é inferido pelo cliente. */
export interface Membership {
  readonly campaignId: Uuid;
  readonly accountId: AccountId;
  readonly role: CampaignRole;
  readonly status: MembershipStatus;
  /** Conta que emitiu o convite; obrigatório no snapshot remoto de convites. */
  readonly invitedBy?: AccountId;
  readonly revision: Revision;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly inviteExpiresAt?: IsoTimestamp;
}

/** JSON cloneable e livre de objetos de SDK, usado no snapshot de uma operação. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type SyncAggregateType =
  | "account"
  | "membership"
  | "campaign"
  | "campaign-cleanup"
  | "character"
  | "journal"
  | "map"
  | "asset"
  | "session";

const SYNC_AGGREGATE_TYPES: readonly SyncAggregateType[] = [
  "account", "membership", "campaign", "campaign-cleanup", "character", "journal", "map", "asset", "session",
];

/** Referência explícita de um asset da campanha durante uma remoção remota. */
export interface CampaignCleanupAsset {
  readonly assetId: string;
  readonly ownerUid: string;
  readonly campaignId: string;
  readonly firestorePath: string;
  readonly storagePath: string;
  readonly sha256: string;
  /** Assets compartilhados ou privados jamais são apagados por esta saga. */
  readonly shared?: boolean;
}

/** Manifesto capturado antes da remoção local; não depende de queries remotas. */
export interface CampaignCleanupManifest {
  readonly schemaVersion: 1;
  readonly campaignId: string;
  readonly campaignRevision: Revision;
  readonly memberAccountIds: readonly string[];
  readonly characterIds: readonly string[];
  readonly journalIds: readonly string[];
  readonly mapIds: readonly string[];
  readonly sessionIds: readonly string[];
  readonly assets: readonly CampaignCleanupAsset[];
}

export type SyncMutation = "upsert" | "delete";
export type SyncOperationStatus = "pending" | "syncing" | "acked" | "conflict" | "failed";

/** Escopo imutável usado para construir a rota remota, inclusive em deletes. */
export interface SyncScope {
  readonly campaignId?: Uuid;
  readonly accountId?: AccountId;
  readonly ownerUid?: AccountId;
}

export interface SyncConflict {
  readonly remoteRevision: Revision;
  readonly remoteSnapshot?: JsonValue;
  readonly detectedAt: IsoTimestamp;
  readonly message: string;
}

/** Dados persistidos no outbox. Todos os campos são structured-clone/JSON friendly. */
export interface SyncOperation {
  readonly operationId: CommandId;
  readonly aggregateType: SyncAggregateType;
  readonly aggregateId: AccountId | Uuid;
  readonly mutation: SyncMutation;
  readonly baseRevision: Revision;
  readonly scope?: SyncScope;
  readonly payload?: JsonValue;
  readonly status: SyncOperationStatus;
  readonly attempts: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly lastAttemptAt?: IsoTimestamp;
  readonly nextRetryAt?: IsoTimestamp;
  readonly lastError?: string;
  readonly conflict?: SyncConflict;
  /** Chave derivada para deduplicação atômica local; não é uma chave remota. */
  readonly dedupeKey: string;
}

export function syncOperationDedupeKey(operation: Pick<SyncOperation, "operationId" | "aggregateType" | "aggregateId" | "mutation" | "baseRevision" | "scope">): string {
  const key: string[] = [
    operation.operationId,
    operation.aggregateType,
    operation.aggregateId,
    operation.mutation,
    String(operation.baseRevision),
  ];
  const scoped = operation.scope;
  if (scoped !== undefined) {
    // Ordem fixa evita chaves diferentes quando o mesmo escopo é criado com
    // propriedades em ordem distinta.
    key.push([scoped.campaignId ?? "", scoped.accountId ?? "", scoped.ownerUid ?? ""].join(":"));
  }
  return key.join("|");
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (isJsonPrimitive(value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(isJsonValue);
}

export function isSyncOperation(value: unknown): value is SyncOperation {
  if (typeof value !== "object" || value === null) return false;
  const operation = value as Record<string, unknown>;
  if (
    typeof operation.operationId !== "string" ||
    typeof operation.aggregateType !== "string" ||
    !SYNC_AGGREGATE_TYPES.includes(operation.aggregateType as SyncAggregateType) ||
    typeof operation.aggregateId !== "string" ||
    (operation.mutation !== "upsert" && operation.mutation !== "delete") ||
    typeof operation.baseRevision !== "number" ||
    !Number.isInteger(operation.baseRevision) ||
    operation.baseRevision < 0 ||
    (operation.status !== "pending" && operation.status !== "syncing" && operation.status !== "acked" && operation.status !== "conflict" && operation.status !== "failed") ||
    typeof operation.attempts !== "number" ||
    !Number.isInteger(operation.attempts) ||
    operation.attempts < 0 ||
    typeof operation.createdAt !== "string" ||
    typeof operation.updatedAt !== "string" ||
    typeof operation.dedupeKey !== "string"
  ) return false;
  if (operation.scope !== undefined) {
    if (!isJsonValue(operation.scope)) return false;
    const scope = operation.scope as Record<string, unknown>;
    if (Object.keys(scope).some((key) => key !== "campaignId" && key !== "accountId" && key !== "ownerUid")) return false;
    for (const key of ["campaignId", "accountId", "ownerUid"]) {
      if (scope[key] !== undefined && (typeof scope[key] !== "string" || String(scope[key]).trim().length === 0)) return false;
    }
  }
  if (operation.mutation === "delete" && operation.payload !== undefined) return false;
  if (operation.mutation === "upsert" && operation.payload === undefined) return false;
  if (operation.payload !== undefined && !isJsonValue(operation.payload)) return false;
  if (operation.lastAttemptAt !== undefined && typeof operation.lastAttemptAt !== "string") return false;
  if (operation.nextRetryAt !== undefined && typeof operation.nextRetryAt !== "string") return false;
  if (operation.lastError !== undefined && typeof operation.lastError !== "string") return false;
  if (operation.conflict !== undefined) {
    const conflict = operation.conflict;
    if (typeof conflict !== "object" || conflict === null) return false;
    const item = conflict as Record<string, unknown>;
    if (typeof item.remoteRevision !== "number" || !Number.isInteger(item.remoteRevision) || item.remoteRevision < 0 || typeof item.detectedAt !== "string" || typeof item.message !== "string") return false;
    if (item.remoteSnapshot !== undefined && !isJsonValue(item.remoteSnapshot)) return false;
  }
  return operation.dedupeKey === syncOperationDedupeKey(operation as unknown as SyncOperation);
}

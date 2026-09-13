import { type RemoteHydrationPort, type RemoteHydrationReport, type RemoteHydrationConflict } from "@application/sync";
import { type RemoteSyncPullRecord } from "@application/ports/remote-sync-adapter";
import { type SyncOperation } from "@domain/contracts/cloud-sync";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { runTransaction, requestToPromise } from "./transaction";
import { STORE_NAMES } from "./schema";

type RecordMap = Record<string, unknown>;

function record(value: unknown): RecordMap | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordMap : undefined;
}

function revision(value: unknown): number {
  const item = record(value)?.revision;
  return typeof item === "number" && Number.isInteger(item) && item >= 0 ? item : 0;
}

function validPayload(type: RemoteSyncPullRecord["aggregateType"], payload: unknown): boolean {
  const item = record(payload);
  if (!item || typeof item.id !== "string") return false;
  if (type === "account") return (typeof item.email === "string" || item.email === null) && Number.isInteger(item.schemaVersion) && typeof item.createdAt === "string" && typeof item.updatedAt === "string";
  if (type === "membership") return typeof item.campaignId === "string" && typeof item.accountId === "string" && (item.role === "master" || item.role === "player") && (item.status === "invited" || item.status === "active" || item.status === "revoked") && typeof item.createdAt === "string" && typeof item.updatedAt === "string";
  if (type === "campaign" || type === "character") return Number.isInteger(item.schemaVersion) && typeof item.revision === "number" && Number.isInteger(item.revision) && item.revision >= 0 && typeof item.createdAt === "string" && typeof item.updatedAt === "string";
  if (type === "journal") return typeof item.campaignId === "string" && typeof item.title === "string" && typeof item.body === "string";
  if (type === "map") return typeof item.campaignId === "string" && typeof item.assetId === "string" && Array.isArray(item.pins) && typeof item.revision === "number" && Number.isInteger(item.revision) && item.revision >= 0;
  if (type === "session") return typeof item.campaignId === "string" && Number.isInteger(item.schemaVersion) && typeof item.revision === "number" && Number.isInteger(item.revision) && item.revision >= 0 && typeof item.title === "string" && typeof item.notes === "string" && typeof item.summary === "string" && Array.isArray(item.attendance);
  return false;
}

function pendingKey(operation: SyncOperation): string {
  return `${operation.aggregateType}|${operation.aggregateId}|${operation.scope?.campaignId ?? operation.scope?.ownerUid ?? ""}`;
}

function pullKey(entry: RemoteSyncPullRecord): string {
  return `${entry.aggregateType}|${entry.aggregateId}|${entry.scope?.campaignId ?? entry.scope?.ownerUid ?? ""}`;
}

function storeName(type: RemoteSyncPullRecord["aggregateType"]): string | undefined {
  switch (type) {
    case "account": return STORE_NAMES.accounts;
    case "membership": return STORE_NAMES.memberships;
    case "campaign": return STORE_NAMES.campaigns;
    case "character": return STORE_NAMES.characters;
    case "journal": return STORE_NAMES.journalEntries;
    case "map": return STORE_NAMES.maps;
    case "session": return STORE_NAMES.sessions;
    // Asset metadata alone cannot hydrate an Asset: bytes belong to Storage.
    default: return undefined;
  }
}

function localKey(type: RemoteSyncPullRecord["aggregateType"], entry: RemoteSyncPullRecord): IDBValidKey {
  return type === "membership"
    ? [entry.scope?.campaignId ?? (record(entry.payload)?.campaignId as string), record(entry.payload)?.accountId as string]
    : entry.aggregateId;
}

/** Hidrata somente snapshots remotos permitidos; nenhuma operação é criada no outbox. */
export class IndexedDbRemoteHydrationRepository implements RemoteHydrationPort {
  constructor(private readonly db: IDBDatabase) {}

  async hydrate(input: Parameters<RemoteHydrationPort["hydrate"]>[0]): Promise<Result<RemoteHydrationReport, AppError>> {
    const memberships = new Map<string, RecordMap>();
    for (const entry of input.pull.records) {
      if (entry.aggregateType !== "membership") continue;
      const payload = record(entry.payload);
      if (payload?.accountId === input.ownerUid && typeof payload.campaignId === "string") memberships.set(payload.campaignId, payload);
    }
    const allowedCampaigns = new Set([...memberships.entries()].filter(([, item]) => item.status === "active").map(([id]) => id));
    const pending = new Map(input.pending.filter((operation) => {
      const owner = (operation as SyncOperation & { readonly ownerUid?: unknown }).ownerUid;
      return owner === undefined || owner === input.ownerUid;
    }).map((operation) => [pendingKey(operation), operation]));
    const ordered = [...input.pull.records].sort((left, right) =>
      (left.aggregateType === "membership" ? 0 : 1) - (right.aggregateType === "membership" ? 0 : 1) ||
      left.aggregateType.localeCompare(right.aggregateType) || left.aggregateId.localeCompare(right.aggregateId),
    );
    const conflicts: RemoteHydrationConflict[] = [];
    let applied = 0;
    let skipped = 0;

    const result = await runTransaction(this.db, Object.values(STORE_NAMES), "readwrite", async (tx) => {
      for (const entry of ordered) {
        const store = storeName(entry.aggregateType);
        if (!store) { skipped += 1; continue; }
        const payload = record(entry.payload);
        if (!payload || !validPayload(entry.aggregateType, payload)) return err(appError.validation("remote-pull", `Snapshot remoto inválido: ${entry.aggregateType}/${entry.aggregateId}.`));
        if (entry.aggregateType === "account" && entry.aggregateId !== input.ownerUid) { skipped += 1; continue; }
        if (entry.aggregateType === "membership" && payload.accountId !== input.ownerUid) { skipped += 1; continue; }
        const campaignId = entry.scope?.campaignId ?? (typeof payload.campaignId === "string" ? payload.campaignId : undefined);
        if (entry.aggregateType !== "account" && entry.aggregateType !== "membership" && campaignId !== undefined && !allowedCampaigns.has(campaignId)) { skipped += 1; continue; }
        if (entry.aggregateType === "character" && entry.scope?.ownerUid !== undefined && entry.scope.ownerUid !== input.ownerUid) { skipped += 1; continue; }

        const operation = pending.get(pullKey(entry));
        if (operation) {
          conflicts.push({ aggregateType: entry.aggregateType, aggregateId: entry.aggregateId, remoteRevision: entry.revision, message: `Pull preservado: há operação local ${operation.operationId} pendente para o agregado.` });
          skipped += 1;
          continue;
        }
        const current = await requestToPromise(tx.objectStore(store).get(localKey(entry.aggregateType, entry)));
        if (current !== undefined && revision(current) >= entry.revision) { skipped += 1; continue; }
        await requestToPromise(tx.objectStore(store).put(payload));
        applied += 1;
      }
      return ok(undefined);
    });
    if (!result.ok) return result;
    return ok({ received: input.pull.records.length, applied, skipped, conflicts });
  }
}

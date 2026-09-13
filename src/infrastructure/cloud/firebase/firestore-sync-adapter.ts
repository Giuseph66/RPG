/**
 * Transporte Firestore para a outbox local.
 *
 * A operação é aplicada em uma transação Firestore com CAS. O documento remoto
 * só é escrito quando `remote.revision === operation.baseRevision`; divergências
 * retornam um snapshot serializável para a fila local marcar como conflito.
 * Assets carregam somente metadados: bytes nunca são enviados a este adapter.
 */

import {
  type AssetTransferPort,
} from "@application/ports/asset-transfer";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction as firebaseRunTransaction,
  where,
  type DocumentReference,
  type Firestore,
  type Query,
  type Transaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  type RemoteSyncAdapter,
  type RemoteSyncApplyResult,
  type RemoteSyncError,
  type RemoteSyncPullRecord,
  type RemoteSyncPullResult,
} from "@application/ports/remote-sync-adapter";
import { err, ok, type Result } from "@domain/contracts/errors";
import {
  type JsonValue,
  type CampaignCleanupManifest,
  type SyncConflict,
  type SyncOperation,
} from "@domain/contracts/cloud-sync";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { asIsoTimestamp } from "@domain/contracts/ids";

type FirestoreData = Record<string, unknown>;
type FirestoreTransaction = Pick<Transaction, "get" | "set" | "delete">;

export interface FirestoreSyncDeps {
  readonly doc: (firestore: Firestore, path: string) => DocumentReference;
  readonly runTransaction: <T>(
    firestore: Firestore,
    updateFunction: (transaction: FirestoreTransaction) => Promise<T>,
  ) => Promise<T>;
  readonly getDoc: (reference: DocumentReference) => Promise<FirestoreDocumentSnapshot>;
  readonly getDocs: (target: unknown) => Promise<FirestoreQuerySnapshot>;
  readonly collection: (firestore: Firestore, path: string) => unknown;
  readonly collectionGroup: (firestore: Firestore, id: string) => unknown;
  readonly query: (target: unknown, ...constraints: readonly unknown[]) => unknown;
  readonly where: (field: string, op: "==", value: string) => unknown;
  readonly onSnapshot: (target: unknown, next: () => void, error: (cause: unknown) => void) => () => void;
}

interface FirestoreDocumentSnapshot {
  exists(): boolean;
  data(): unknown;
  ref?: { readonly path?: string };
}

interface FirestoreQueryDocument extends FirestoreDocumentSnapshot {
  readonly ref: { readonly path: string };
}

interface FirestoreQuerySnapshot {
  readonly docs: readonly FirestoreQueryDocument[];
}

const defaultDeps: FirestoreSyncDeps = {
  doc: (firestore, path) => doc(firestore, path),
  runTransaction: <T>(firestore: Firestore, updateFunction: (transaction: FirestoreTransaction) => Promise<T>) =>
    firebaseRunTransaction(firestore, updateFunction as (transaction: Transaction) => Promise<T>),
  getDoc: (reference) => getDoc(reference),
  getDocs: (target) => getDocs(target as Query),
  collection: (firestore, path) => collection(firestore, path),
  collectionGroup: (firestore, id) => collectionGroup(firestore, id),
  query: (target, ...constraints) => query(target as Query, ...(constraints as Parameters<typeof query>[1][])),
  where: (field, op, value) => where(field, op, value),
  onSnapshot: (target, next, error) => onSnapshot(target as Query, next, error),
};

export interface FirebaseFirestoreSyncAdapterOptions {
  readonly firestore: Firestore | null | undefined;
  readonly ownerUid: string;
  /** Configuração/auth podem desaparecer durante a sessão sem derrubar o modo local. */
  readonly isAvailable?: () => boolean;
  readonly deps?: Partial<FirestoreSyncDeps>;
  /** Necessário para concluir a etapa de bytes da saga de limpeza. */
  readonly assetStorage?: AssetTransferPort;
}

function isRecord(value: unknown): value is FirestoreData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(payload: unknown, key: string): string | undefined {
  if (!isRecord(payload)) return undefined;
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function scopeField(operation: SyncOperation, key: "campaignId" | "accountId" | "ownerUid"): string | undefined {
  const value = operation.scope?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function pathError(message: string): RemoteSyncError {
  return { code: "remote-error", message, retryable: false };
}

/** Retorna o caminho remoto sem expor tipos do SDK para a aplicação. */
export function firestorePathForOperation(operation: SyncOperation, privateOwnerUid = "unknown"): Result<string, RemoteSyncError> {
  const id = operation.aggregateId;
  const deleting = operation.mutation === "delete";
  switch (operation.aggregateType) {
    case "account":
      return ok(`users/${id}`);
    case "campaign":
      return ok(`campaigns/${id}`);
    case "campaign-cleanup":
      return ok(`campaigns/${id}/_cleanup/${operation.operationId}`);
    case "membership": {
      const campaignId = scopeField(operation, "campaignId") ?? (deleting ? undefined : stringField(operation.payload, "campaignId"));
      const accountId = scopeField(operation, "accountId") ?? (deleting ? undefined : stringField(operation.payload, "accountId") ?? stringField(operation.payload, "uid"));
      return campaignId && accountId
        ? ok(`campaigns/${campaignId}/members/${accountId}`)
        : err(pathError("Membership exige campaignId e accountId no snapshot."));
    }
    case "character": {
      const campaignId = scopeField(operation, "campaignId") ?? (deleting ? undefined : stringField(operation.payload, "campaignId"));
      // Personagens privados têm namespace próprio do usuário, conforme ADR-0007.
      return campaignId
        ? ok(`campaigns/${campaignId}/characters/${id}`)
        : scopeField(operation, "ownerUid")
          ? ok(`users/${scopeField(operation, "ownerUid")}/characters/${id}`)
          : deleting
            ? err(pathError("Delete de personagem exige campaignId ou ownerUid no escopo."))
            : ok(`users/${privateOwnerUid}/characters/${id}`);
    }
    case "journal": {
      const campaignId = scopeField(operation, "campaignId") ?? (deleting ? undefined : stringField(operation.payload, "campaignId"));
      return campaignId
        ? ok(`campaigns/${campaignId}/journals/${id}`)
        : err(pathError("Entrada de diário exige campaignId no snapshot."));
    }
    case "map": {
      const campaignId = scopeField(operation, "campaignId") ?? (deleting ? undefined : stringField(operation.payload, "campaignId"));
      return campaignId
        ? ok(`campaigns/${campaignId}/maps/${id}`)
        : err(pathError("Mapa exige campaignId no snapshot."));
    }
    case "session": {
      const parts = id.split("/");
      const campaignId = scopeField(operation, "campaignId") ?? (deleting ? undefined : stringField(operation.payload, "campaignId"));
      const sessionId = stringField(operation.payload, "id") ?? (parts.length === 2 ? parts[1] : undefined);
      return campaignId && sessionId
        ? ok(`campaigns/${campaignId}/sessions/${sessionId}`)
        : err(pathError("Sessão exige campaignId no escopo e ID no snapshot."));
    }
    case "asset":
      return ok(`assets/${id}`);
    default:
      return err(pathError(`Tipo de agregado não suportado: ${String(operation.aggregateType)}.`));
  }
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const values: JsonValue[] = [];
    for (const item of value) {
      const converted = toJsonValue(item);
      if (converted === undefined) return undefined;
      values.push(converted);
    }
    return values;
  }
  if (!isRecord(value)) return undefined;
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const converted = toJsonValue(item);
    if (converted !== undefined) result[key] = converted;
  }
  return result;
}

function remoteRevision(data: FirestoreData | undefined): Revision {
  const value = data?.revision;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? asRevision(value) : asRevision(0);
}

function remoteConflict(operation: SyncOperation, data: FirestoreData | undefined): RemoteSyncConflictResult {
  const revision = remoteRevision(data);
  const snapshot = toJsonValue(data);
  const conflict: Omit<SyncConflict, "detectedAt"> = {
    remoteRevision: revision,
    ...(snapshot === undefined ? {} : { remoteSnapshot: snapshot }),
    message: `Conflito remoto em ${operation.aggregateType}/${operation.aggregateId}: revisão ${revision} não corresponde à esperada ${operation.baseRevision}.`,
  };
  return { kind: "conflict", conflict };
}

type RemoteSyncConflictResult = Extract<RemoteSyncApplyResult, { kind: "conflict" }>;

function assetMetadata(payload: FirestoreData, ownerUid: string, assetId: string, scopedCampaignId?: string): FirestoreData {
  // Asset.bytes pertence ao armazenamento local/Cloud Storage. A lista explícita
  // evita que bytes, base64 ou conteúdo arbitrário atravessem para o Firestore.
  const allowed = new Set([
    "id", "mediaType", "contentType", "hash", "sha256", "width", "height", "originalName", "size",
    "storagePath", "path", "ownerUid", "campaignId", "createdAt", "updatedAt", "revision", "schemaVersion",
  ]);
  const campaignId = scopedCampaignId ?? stringField(payload, "campaignId");
  const hash = stringField(payload, "sha256") ?? stringField(payload, "hash");
  const contentType = stringField(payload, "contentType") ?? stringField(payload, "mediaType");
  const storagePath = stringField(payload, "storagePath") ??
    (campaignId ? `campaigns/${campaignId}/assets/${assetId}` : `users/${ownerUid}/assets/${assetId}`);
  const metadata = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)));
  return {
    ...metadata,
    id: stringField(payload, "id") ?? assetId,
    ...(campaignId ? { campaignId } : {}),
    ...(hash ? { hash, sha256: hash } : {}),
    ...(contentType ? { contentType, mediaType: contentType } : {}),
    storagePath,
    schemaVersion: typeof payload.schemaVersion === "number" && Number.isInteger(payload.schemaVersion)
      ? payload.schemaVersion
      : 1,
  };
}

function firestoreDocument(operation: SyncOperation, ownerUid: string, existing?: FirestoreData): FirestoreData {
  const payload = isRecord(operation.payload) ? operation.payload : {};
  const base = operation.aggregateType === "asset"
    ? assetMetadata(payload, ownerUid, operation.aggregateId, scopeField(operation, "campaignId"))
    : { ...payload };
  // Membership ownership is the campaign owner's authority, while the actor
  // may be the invited player accepting their own link. Keep that authority
  // stable across both writes; rules separately validate actor permissions.
  const documentOwnerUid = operation.aggregateType === "membership"
    ? (typeof existing?.ownerUid === "string" ? existing.ownerUid : ownerUid)
    : ownerUid;
  const document: FirestoreData = {
    ...base,
    ownerUid: documentOwnerUid,
    operationId: operation.operationId,
    // Local ISO strings are useful in IndexedDB, but remote authorization and
    // ordering use trusted Firestore timestamps. Preserve the original creation
    // timestamp on updates so rules can enforce immutability.
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    revision: operation.aggregateType === "account" && existing === undefined
      ? operation.baseRevision
      : typeof base.revision === "number" && Number.isInteger(base.revision)
        ? base.revision
        : operation.baseRevision + 1,
  };
  if (operation.aggregateType === "account") document.uid = ownerUid;
  if (operation.aggregateType === "membership") {
    document.accountId = stringField(payload, "accountId") ?? stringField(payload, "uid") ?? operation.aggregateId;
  }
  return document;
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) return String((error as { code: unknown }).code);
  return "unknown";
}

function remoteError(error: unknown): RemoteSyncError {
  const code = errorCode(error).replace(/^firestore\//, "");
  const message = error instanceof Error ? error.message : "Falha ao sincronizar com o Firestore.";
  if (code === "permission-denied" || code === "unauthenticated") {
    return { code: "remote-permission", message, retryable: false, cause: code };
  }
  const retryable = new Set([
    "unavailable", "deadline-exceeded", "aborted", "resource-exhausted",
    "network-request-failed", "failed-precondition",
  ]).has(code);
  return {
    code: retryable ? "remote-network" : "remote-error",
    message,
    retryable,
    cause: code,
  };
}

function isoRemoteValue(value: unknown): JsonValue | undefined {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return toJsonValue(value);
}

function pullPayload(raw: unknown, fallbackId: string): JsonValue | undefined {
  if (!isRecord(raw)) return undefined;
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    // These fields are transport metadata and must never become local domain data.
    if (key === "ownerUid" || key === "operationId") continue;
    const normalized = isoRemoteValue(value);
    if (normalized !== undefined) result[key] = normalized;
  }
  if (result.id === undefined) result.id = fallbackId;
  return result;
}

function pathParts(path: string): string[] {
  return path.split("/").filter((part) => part.length > 0);
}

function pullRevision(payload: JsonValue): Revision {
  const revision = isRecord(payload) && typeof payload.revision === "number" && Number.isInteger(payload.revision) && payload.revision >= 0
    ? payload.revision
    : 0;
  return asRevision(revision);
}

function pullUpdatedAt(payload: JsonValue): string | undefined {
  const value = isRecord(payload) ? payload.updatedAt : undefined;
  return typeof value === "string" ? value : undefined;
}

function recordFromDoc(type: RemoteSyncPullRecord["aggregateType"], id: string, payload: JsonValue, scope?: RemoteSyncPullRecord["scope"]): RemoteSyncPullRecord {
  return {
    aggregateType: type,
    aggregateId: id,
    ...(scope === undefined ? {} : { scope }),
    revision: pullRevision(payload),
    ...(pullUpdatedAt(payload) === undefined ? {} : { updatedAt: asIsoTimestamp(pullUpdatedAt(payload)!) }),
    payload,
  };
}

function documentId(path: string): string | undefined {
  const parts = pathParts(path);
  return parts.at(-1);
}

function campaignIdFromMemberPath(path: string): string | undefined {
  const parts = pathParts(path);
  return parts.length >= 4 && parts[0] === "campaigns" && parts[2] === "members" ? parts[1] : undefined;
}

const CLEANUP_SEGMENT = /^[A-Za-z0-9_-]+$/;

function stringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !CLEANUP_SEGMENT.test(item))) return undefined;
  return [...new Set(value)];
}

function cleanupManifest(operation: SyncOperation): Result<CampaignCleanupManifest, RemoteSyncError> {
  if (operation.aggregateType !== "campaign-cleanup" || operation.mutation !== "upsert" || !isRecord(operation.payload)) {
    return err(pathError("Limpeza de campanha exige operação upsert com manifesto."));
  }
  const raw = operation.payload;
  const campaignId = stringField(raw, "campaignId");
  const campaignRevision = raw.campaignRevision;
  const memberAccountIds = stringArray(raw.memberAccountIds);
  const characterIds = stringArray(raw.characterIds);
  const journalIds = stringArray(raw.journalIds);
  const mapIds = stringArray(raw.mapIds);
  const sessionIds = stringArray(raw.sessionIds);
  const assets = raw.assets;
  if (
    raw.schemaVersion !== 1 || campaignId === undefined || campaignId !== String(operation.aggregateId) ||
    typeof campaignRevision !== "number" || !Number.isInteger(campaignRevision) || campaignRevision < 0 ||
    memberAccountIds === undefined || characterIds === undefined || journalIds === undefined ||
    mapIds === undefined || sessionIds === undefined || !Array.isArray(assets)
  ) return err(pathError("Manifesto de limpeza de campanha inválido."));

  const normalizedAssets: CampaignCleanupManifest["assets"][number][] = [];
  for (const rawAsset of assets) {
    if (!isRecord(rawAsset)) return err(pathError("Referência de asset inválida no manifesto."));
    const assetId = stringField(rawAsset, "assetId");
    const ownerUid = stringField(rawAsset, "ownerUid");
    const scopedCampaignId = stringField(rawAsset, "campaignId");
    const firestorePath = stringField(rawAsset, "firestorePath");
    const storagePath = stringField(rawAsset, "storagePath");
    const sha256 = stringField(rawAsset, "sha256");
    if (!assetId || !ownerUid || scopedCampaignId !== campaignId || !firestorePath || !storagePath || !sha256 || (rawAsset.shared !== undefined && typeof rawAsset.shared !== "boolean")) {
      return err(pathError("Asset de limpeza não pertence à campanha ou está incompleto."));
    }
    if (!/^assets\/[A-Za-z0-9_-]+$/.test(firestorePath) && !new RegExp(`^campaigns/${campaignId}/assets/[A-Za-z0-9_-]+$`).test(firestorePath)) {
      return err(pathError("Caminho Firestore de asset fora da campanha."));
    }
    const expectedStoragePath = `campaigns/${campaignId}/assets/${assetId}`;
    if (storagePath !== expectedStoragePath || !CLEANUP_SEGMENT.test(assetId) || !CLEANUP_SEGMENT.test(ownerUid) || !/^[a-f0-9]{64}$/.test(sha256)) {
      return err(pathError("Caminho Storage de asset inválido."));
    }
    normalizedAssets.push({ assetId, ownerUid, campaignId, firestorePath, storagePath, sha256, ...(rawAsset.shared === true ? { shared: true } : {}) });
  }
  return ok({ schemaVersion: 1, campaignId, campaignRevision: asRevision(campaignRevision), memberAccountIds, characterIds, journalIds, mapIds, sessionIds, assets: normalizedAssets });
}

function cleanupPath(campaignId: string, collectionName: string, id: string): string {
  return `campaigns/${campaignId}/${collectionName}/${id}`;
}

/** Adapter injetável; não inicializa Firebase e não toca rede em modo indisponível. */
export class FirebaseFirestoreSyncAdapter implements RemoteSyncAdapter {
  private readonly firestore: Firestore | null | undefined;
  private readonly ownerUid: string;
  private readonly availability: () => boolean;
  private readonly deps: FirestoreSyncDeps;
  private readonly assetStorage?: AssetTransferPort;

  constructor(options: FirebaseFirestoreSyncAdapterOptions);
  constructor(firestore: Firestore | null | undefined, ownerUid: string, deps?: Partial<FirestoreSyncDeps>);
  constructor(
    optionsOrFirestore: FirebaseFirestoreSyncAdapterOptions | Firestore | null | undefined,
    ownerUid?: string,
    deps: Partial<FirestoreSyncDeps> = {},
  ) {
    if (typeof optionsOrFirestore === "object" && optionsOrFirestore !== null && "ownerUid" in optionsOrFirestore) {
      const options = optionsOrFirestore as FirebaseFirestoreSyncAdapterOptions;
      this.firestore = options.firestore;
      this.ownerUid = options.ownerUid;
      this.availability = options.isAvailable ?? (() => true);
      this.deps = { ...defaultDeps, ...options.deps };
      this.assetStorage = options.assetStorage;
    } else {
      this.firestore = optionsOrFirestore as Firestore | null | undefined;
      this.ownerUid = ownerUid ?? "";
      this.availability = () => true;
      this.deps = { ...defaultDeps, ...deps };
      this.assetStorage = undefined;
    }
  }

  isAvailable(): boolean {
    return this.firestore !== null && this.firestore !== undefined && this.ownerUid.trim().length > 0 && this.availability();
  }

  private async deleteFirestoreDocument(path: string): Promise<Result<void, RemoteSyncError>> {
    try {
      await this.deps.runTransaction(this.firestore!, async (transaction) => {
        const reference = this.deps.doc(this.firestore!, path);
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) transaction.delete(reference);
      });
      return ok(undefined);
    } catch (cause) {
      return err(remoteError(cause));
    }
  }

  private async deleteCampaignAssetMetadata(asset: CampaignCleanupManifest["assets"][number], campaignId: string): Promise<Result<void, RemoteSyncError>> {
    try {
      await this.deps.runTransaction(this.firestore!, async (transaction) => {
        const reference = this.deps.doc(this.firestore!, asset.firestorePath);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (!isRecord(data) || data.campaignId !== campaignId || data.storagePath !== asset.storagePath) {
          throw Object.assign(new Error(`Metadados do asset ${asset.assetId} não pertencem à campanha.`), { code: "permission-denied" });
        }
        transaction.delete(reference);
      });
      return ok(undefined);
    } catch (cause) {
      return err(remoteError(cause));
    }
  }

  private async applyCampaignCleanup(operation: SyncOperation): Promise<Result<RemoteSyncApplyResult, RemoteSyncError>> {
    const parsed = cleanupManifest(operation);
    if (!parsed.ok) return parsed;
    const manifest = parsed.value;
    const childPaths = [
      ...manifest.memberAccountIds.map((id) => cleanupPath(manifest.campaignId, "members", id)),
      ...manifest.characterIds.map((id) => cleanupPath(manifest.campaignId, "characters", id)),
      ...manifest.journalIds.map((id) => cleanupPath(manifest.campaignId, "journals", id)),
      ...manifest.mapIds.map((id) => cleanupPath(manifest.campaignId, "maps", id)),
      ...manifest.sessionIds.map((id) => cleanupPath(manifest.campaignId, "sessions", id)),
    ];

    // Each path is explicit and idempotent. This avoids implicit Firestore
    // cascade behavior and keeps a retry bounded to the immutable manifest.
    for (const path of childPaths) {
      const deleted = await this.deleteFirestoreDocument(path);
      if (!deleted.ok) return err({ ...deleted.error, message: `Limpeza ${path}: ${deleted.error.message}` });
    }

    for (const asset of manifest.assets) {
      // `shared` is a hard safety fence. Private assets cannot appear with a
      // campaign storage path after manifest validation, so they are rejected.
      if (asset.shared === true) continue;
      const metadataDeleted = await this.deleteCampaignAssetMetadata(asset, manifest.campaignId);
      if (!metadataDeleted.ok) return err({ ...metadataDeleted.error, message: `Metadados ${asset.assetId}: ${metadataDeleted.error.message}` });
      if (!this.assetStorage || !this.assetStorage.isAvailable()) {
        return err({ code: "remote-network", retryable: true, message: `Bytes do asset ${asset.assetId} aguardam Cloud Storage disponível.` });
      }
      const bytesDeleted = await this.assetStorage.delete({
        ownerUid: asset.ownerUid,
        campaignId: manifest.campaignId,
        assetId: asset.assetId as never,
        sha256: asset.sha256,
        storagePath: asset.storagePath,
      });
      if (!bytesDeleted.ok) {
        return err({ code: "remote-network", retryable: true, message: `Bytes do asset ${asset.assetId}: ${bytesDeleted.error.message}` });
      }
    }

    // The root is deliberately last. CAS prevents a stale cleanup from
    // deleting a campaign recreated with the same ID after a partial retry.
    try {
      const result = await this.deps.runTransaction(this.firestore!, async (transaction) => {
        const reference = this.deps.doc(this.firestore!, `campaigns/${manifest.campaignId}`);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) return { kind: "acked", remoteRevision: asRevision(0) } satisfies RemoteSyncApplyResult;
        const data = snapshot.data() as FirestoreData;
        const actual = remoteRevision(data);
        if (actual !== manifest.campaignRevision) return remoteConflict(operation, data);
        transaction.delete(reference);
        return { kind: "acked", remoteRevision: actual } satisfies RemoteSyncApplyResult;
      });
      return ok(result);
    } catch (cause) {
      return err(remoteError(cause));
    }
  }

  async apply(operation: SyncOperation): Promise<Result<RemoteSyncApplyResult, RemoteSyncError>> {
    if (!this.isAvailable()) {
      return err({
        code: "remote-unavailable",
        message: "Firebase indisponível; operação permanece local até a reconexão.",
        retryable: true,
      });
    }
    if (operation.aggregateType === "campaign-cleanup") return this.applyCampaignCleanup(operation);
    if (operation.mutation === "upsert" && !isRecord(operation.payload)) {
      return err(pathError("Upsert remoto exige snapshot serializável."));
    }
    const path = firestorePathForOperation(operation, this.ownerUid);
    if (!path.ok) return path;
    const reference = this.deps.doc(this.firestore!, path.value);

    try {
      const result = await this.deps.runTransaction(this.firestore!, async (transaction) => {
        const snapshot = await transaction.get(reference);
        const data = snapshot.exists() ? (snapshot.data() as FirestoreData) : undefined;
        // Reenvio após resposta perdida: a própria operação já foi aplicada.
        // operationId is globally unique per local command. Matching it is enough
        // to acknowledge a replay, including the first owner membership whose
        // valid remote revision is also zero.
        if (data?.operationId === operation.operationId) {
          return { kind: "acked", remoteRevision: remoteRevision(data) } satisfies RemoteSyncApplyResult;
        }

        const actual = remoteRevision(data);
        // Deletes are acknowledged idempotently after the first commit removed
        // the document. A missing document cannot regress a later remote value,
        // while existing documents still go through the normal CAS check below.
        if (operation.mutation === "delete" && !snapshot.exists() && operation.baseRevision > 0) {
          return { kind: "acked", remoteRevision: actual } satisfies RemoteSyncApplyResult;
        }
        if (actual !== operation.baseRevision) return remoteConflict(operation, data);

        if (operation.mutation === "delete") {
          if (snapshot.exists()) transaction.delete(reference);
          return { kind: "acked", remoteRevision: actual } satisfies RemoteSyncApplyResult;
        }

        const document = firestoreDocument(operation, this.ownerUid, data);
        transaction.set(reference, document);
        return { kind: "acked", remoteRevision: remoteRevision(document) } satisfies RemoteSyncApplyResult;
      });
      return ok(result);
    } catch (cause) {
      return err(remoteError(cause));
    }
  }

  /**
   * Lê somente a conta atual, seus personagens privados e campanhas para as
   * quais existe vínculo. Convites entram pela collectionGroup de membros;
   * conteúdo de campanha só é lido para vínculos ativos (ou papel master).
   */
  async pull(): Promise<Result<RemoteSyncPullResult, RemoteSyncError>> {
    if (!this.isAvailable()) {
      return err({ code: "remote-unavailable", message: "Firebase indisponível; dados locais permanecem utilizáveis.", retryable: true });
    }

    try {
      const records: RemoteSyncPullRecord[] = [];
      const userReference = this.deps.doc(this.firestore!, `users/${this.ownerUid}`);
      const user = await this.deps.getDoc(userReference);
      if (user.exists()) {
        const payload = pullPayload(user.data(), this.ownerUid);
        if (payload !== undefined) records.push(recordFromDoc("account", this.ownerUid, payload));
      }

      const privateCharacters = await this.deps.getDocs(this.deps.collection(this.firestore!, `users/${this.ownerUid}/characters`));
      for (const item of privateCharacters.docs) {
        const id = documentId(item.ref.path);
        const payload = id === undefined ? undefined : pullPayload(item.data(), id);
        if (id !== undefined && payload !== undefined) records.push(recordFromDoc("character", id, payload, { ownerUid: this.ownerUid as never }));
      }

      const membershipQuery = this.deps.query(
        this.deps.collectionGroup(this.firestore!, "members"),
        this.deps.where("accountId", "==", this.ownerUid),
      );
      const memberships = await this.deps.getDocs(membershipQuery);
      const activeCampaigns = new Set<string>();
      for (const item of memberships.docs) {
        const campaignId = campaignIdFromMemberPath(item.ref.path);
        if (campaignId === undefined) continue;
        const accountId = documentId(item.ref.path);
        const payload = pullPayload(item.data(), accountId ?? this.ownerUid);
        if (payload === undefined) continue;
        records.push(recordFromDoc("membership", `${campaignId}:${accountId ?? this.ownerUid}`, payload, { campaignId: campaignId as never, accountId: (accountId ?? this.ownerUid) as never }));
        const status = isRecord(payload) ? payload.status : undefined;
        const role = isRecord(payload) ? payload.role : undefined;
        if (status === "active" && (role === "master" || role === "player")) activeCampaigns.add(campaignId);
      }

      for (const campaignId of [...activeCampaigns].sort()) {
        const campaignReference = this.deps.doc(this.firestore!, `campaigns/${campaignId}`);
        const campaign = await this.deps.getDoc(campaignReference);
        if (campaign.exists()) {
          const payload = pullPayload(campaign.data(), campaignId);
          if (payload !== undefined) records.push(recordFromDoc("campaign", campaignId, payload));
        }
        for (const [collectionName, aggregateType] of [
          ["characters", "character"],
          ["journals", "journal"],
          ["maps", "map"],
          ["sessions", "session"],
        ] as const) {
          const documents = await this.deps.getDocs(this.deps.collection(this.firestore!, `campaigns/${campaignId}/${collectionName}`));
          for (const item of documents.docs) {
            const id = documentId(item.ref.path);
            const payload = id === undefined ? undefined : pullPayload(item.data(), id);
            if (id !== undefined && payload !== undefined) records.push(recordFromDoc(aggregateType, id, payload, { campaignId: campaignId as never }));
          }
        }
      }

      const unique = new Map<string, RemoteSyncPullRecord>();
      for (const record of records) {
        const key = `${record.aggregateType}|${record.aggregateId}|${record.scope?.campaignId ?? record.scope?.ownerUid ?? ""}`;
        const previous = unique.get(key);
        if (!previous || record.revision > previous.revision) unique.set(key, record);
      }
      return ok({ records: [...unique.values()].sort((left, right) =>
        left.aggregateType.localeCompare(right.aggregateType) || left.aggregateId.localeCompare(right.aggregateId),
      ) });
    } catch (cause) {
      return err(remoteError(cause));
    }
  }

  /** Escuta membros/personagens; uma mudança dispara novo pull completo e idempotente. */
  subscribe(listener: () => void): () => void {
    if (!this.isAvailable()) return () => undefined;
    const errors = () => undefined;
    const unsubs = [
      this.deps.onSnapshot(this.deps.collection(this.firestore!, `users/${this.ownerUid}/characters`), listener, errors),
      this.deps.onSnapshot(
        this.deps.query(
          this.deps.collectionGroup(this.firestore!, "members"),
          this.deps.where("accountId", "==", this.ownerUid),
        ),
        listener,
        errors,
      ),
    ];
    return () => { for (const unsubscribe of unsubs) unsubscribe(); };
  }
}

/** Ajuda a compor o adapter sem expor a instância do SDK nos ports. */
export function createFirebaseFirestoreSyncAdapter(options: FirebaseFirestoreSyncAdapterOptions): RemoteSyncAdapter {
  return new FirebaseFirestoreSyncAdapter(options);
}

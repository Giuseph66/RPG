import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import {
  CLOUD_ASSET_MEDIA_TYPE,
  FIRESTORE_MAP_CHUNK_BASE64_MAX_CHARS,
  FIRESTORE_MAP_CHUNK_BYTES,
  MAX_CLOUD_ASSET_BYTES,
  type AssetDownloadResult,
  type AssetTransferPort,
  type AssetTransferReceipt,
  type AssetTransferReference,
  type AssetUploadRequest,
} from "@application/ports/asset-transfer";

const HASH = /^[a-f0-9]{64}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
const MAX_CHUNKS = Math.ceil(MAX_CLOUD_ASSET_BYTES / FIRESTORE_MAP_CHUNK_BYTES);

interface MapContentManifest {
  readonly kind: "map-image";
  readonly schemaVersion: 1;
  readonly campaignId: string;
  readonly mapId: string;
  readonly ownerUid: string;
  readonly sha256: string;
  readonly mediaType: string;
  readonly size: number;
  readonly chunkSize: typeof FIRESTORE_MAP_CHUNK_BYTES;
  readonly chunkCount: number;
  readonly complete: boolean;
}

interface MapContentChunk {
  readonly schemaVersion: 1;
  readonly index: number;
  readonly chunkCount: number;
  readonly size: number;
  readonly sha256: string;
  readonly data: string;
}

export interface FirestoreMapAssetDeps {
  readonly doc: typeof doc;
  readonly getDoc: typeof getDoc;
  readonly setDoc: typeof setDoc;
  readonly deleteDoc: typeof deleteDoc;
}

const defaultDeps: FirestoreMapAssetDeps = { doc, getDoc, setDoc, deleteDoc };

export interface FirestoreMapAssetTransferOptions {
  readonly firestore: Firestore | null | undefined;
  readonly deps?: Partial<FirestoreMapAssetDeps>;
  readonly isAuthenticated?: () => boolean;
  /** Lazy legacy adapter: instantiated only when an existing Storage path is read/deleted. */
  readonly legacy?: () => AssetTransferPort | undefined;
}

interface CanonicalReference {
  readonly campaignId: string;
  readonly mapId: string;
  readonly sha256: string;
  readonly path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codeOf(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { readonly code: unknown }).code) : "unknown";
}

function remoteFailure(operation: string, cause: unknown): Result<never, AppError> {
  return err(appError.storageUnavailable(`${operation}: Firestore indisponível; tente novamente.`, codeOf(cause)));
}

function canonicalPath(campaignId: string, mapId: string, sha256: string): string {
  return `campaigns/${campaignId}/maps/${mapId}/content/${sha256}`;
}

function parseCanonicalPath(path: string | undefined): Result<CanonicalReference | undefined, AppError> {
  if (path === undefined || path === "") return ok(undefined);
  if (!path.startsWith("campaigns/") || !path.includes("/maps/")) return ok(undefined);
  const match = /^campaigns\/([A-Za-z0-9_-]+)\/maps\/([A-Za-z0-9_-]+)\/content\/([a-f0-9]{64})$/.exec(path);
  if (!match) return err(appError.validation("storagePath", "Caminho Firestore de mapa inválido."));
  return ok({ campaignId: match[1]!, mapId: match[2]!, sha256: match[3]!, path });
}

function mapPath(campaignId: string, mapId: string, sha256: string): string {
  return `campaigns/${campaignId}/maps/${mapId}/content/${sha256}`;
}

function chunkPath(reference: CanonicalReference, index: number): string {
  return `${mapPath(reference.campaignId, reference.mapId, reference.sha256)}/chunks/${index}`;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array | undefined {
  if (value.length === 0 || value.length > FIRESTORE_MAP_CHUNK_BASE64_MAX_CHARS || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return undefined;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return undefined;
  }
}

export async function firestoreMapSha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function manifestFrom(value: unknown, reference: CanonicalReference): Result<MapContentManifest, AppError> {
  if (!isRecord(value) || value.kind !== "map-image" || value.schemaVersion !== 1 || value.campaignId !== reference.campaignId ||
    value.mapId !== reference.mapId || typeof value.ownerUid !== "string" || !SAFE_SEGMENT.test(value.ownerUid) || value.sha256 !== reference.sha256 ||
    typeof value.mediaType !== "string" || !CLOUD_ASSET_MEDIA_TYPE.test(value.mediaType) || typeof value.size !== "number" ||
    !Number.isInteger(value.size) || value.size <= 0 || value.size > MAX_CLOUD_ASSET_BYTES || value.chunkSize !== FIRESTORE_MAP_CHUNK_BYTES ||
    typeof value.chunkCount !== "number" || !Number.isInteger(value.chunkCount) || value.chunkCount <= 0 || value.chunkCount > MAX_CHUNKS ||
    value.chunkCount !== Math.ceil(value.size / FIRESTORE_MAP_CHUNK_BYTES) || typeof value.complete !== "boolean") {
    return err(appError.corruptRecord(reference.path, "Manifesto Firestore do mapa inválido."));
  }
  return ok(value as unknown as MapContentManifest);
}

function chunkFrom(value: unknown, reference: CanonicalReference, index: number, expectedSize: number): Result<MapContentChunk, AppError> {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.index !== index || typeof value.chunkCount !== "number" ||
    !Number.isInteger(value.chunkCount) || typeof value.size !== "number" || value.size !== expectedSize || !Number.isInteger(value.size) ||
    value.size <= 0 || value.size > FIRESTORE_MAP_CHUNK_BYTES || typeof value.sha256 !== "string" || !HASH.test(value.sha256) ||
    typeof value.data !== "string") return err(appError.corruptRecord(`${reference.path}/chunks/${index}`, "Fragmento Firestore do mapa inválido."));
  const bytes = decodeBase64(value.data);
  if (!bytes || bytes.byteLength !== value.size) return err(appError.corruptRecord(`${reference.path}/chunks/${index}`, "Base64 ou tamanho do fragmento inválido."));
  return ok(value as unknown as MapContentChunk);
}

function receipt(reference: CanonicalReference, manifest: MapContentManifest): AssetTransferReceipt {
  return { location: "firestore-map", storagePath: reference.path, sha256: manifest.sha256, size: manifest.size, mediaType: manifest.mediaType };
}

export function createFirestoreMapAssetTransferAdapter(options: FirestoreMapAssetTransferOptions): AssetTransferPort {
  const deps = { ...defaultDeps, ...options.deps };
  const authenticated = options.isAuthenticated ?? (() => true);
  const available = () => options.firestore !== null && options.firestore !== undefined && authenticated();
  const ready = (): Result<Firestore, AppError> => available() && options.firestore ? ok(options.firestore) : err(appError.storageUnavailable("Firestore exige configuração e usuário autenticado."));
  const referenceFor = (firestore: Firestore, path: string): DocumentReference => deps.doc(firestore, path);

  async function readDoc(firestore: Firestore, path: string): Promise<{ readonly exists: boolean; readonly data?: unknown }> {
    const snapshot = await deps.getDoc(referenceFor(firestore, path));
    return { exists: snapshot.exists(), ...(snapshot.exists() ? { data: snapshot.data() } : {}) };
  }

  async function readChunks(firestore: Firestore, reference: CanonicalReference, manifest: MapContentManifest): Promise<Result<Uint8Array, AppError>> {
    const chunks: Uint8Array[] = [];
    for (let index = 0; index < manifest.chunkCount; index += 1) {
      const expectedSize = index === manifest.chunkCount - 1 ? manifest.size - FIRESTORE_MAP_CHUNK_BYTES * (manifest.chunkCount - 1) : FIRESTORE_MAP_CHUNK_BYTES;
      const raw = await readDoc(firestore, chunkPath(reference, index));
      if (!raw.exists) return err(appError.corruptRecord(reference.path, `Fragmento ${index} ausente no manifesto completo.`));
      const checked = chunkFrom(raw.data, reference, index, expectedSize);
      if (!checked.ok) return checked;
      if (checked.value.chunkCount !== manifest.chunkCount) return err(appError.corruptRecord(`${reference.path}/chunks/${index}`, "Contagem do fragmento não confere com o manifesto."));
      const bytes = decodeBase64(checked.value.data)!;
      if (await firestoreMapSha256Hex(bytes) !== checked.value.sha256) return err(appError.corruptRecord(`${reference.path}/chunks/${index}`, "Hash do fragmento não confere."));
      chunks.push(bytes);
    }
    const bytes = new Uint8Array(manifest.size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (await firestoreMapSha256Hex(bytes) !== manifest.sha256) return err(appError.corruptRecord(reference.path, "Hash final do conteúdo não confere."));
    return ok(bytes);
  }

  async function upload(request: AssetUploadRequest): Promise<Result<AssetTransferReceipt, AppError>> {
    const firebase = ready();
    if (!firebase.ok) return firebase;
    if (!request.mapId || !SAFE_SEGMENT.test(request.mapId)) return err(appError.validation("mapId", "mapId obrigatório para novo conteúdo de mapa."));
    if (!SAFE_SEGMENT.test(request.ownerUid) || !SAFE_SEGMENT.test(request.campaignId ?? "")) return err(appError.validation("scope", "Campanha ou dono inválido."));
    if (!CLOUD_ASSET_MEDIA_TYPE.test(request.mediaType)) return err(appError.validation("mediaType", "Tipo de asset não permitido."));
    if (request.bytes.byteLength <= 0 || request.bytes.byteLength > MAX_CLOUD_ASSET_BYTES) return err(appError.quotaExceeded("Imagem do mapa excede 10 MiB ou está vazia.", request.bytes.byteLength, MAX_CLOUD_ASSET_BYTES));
    let sha256: string;
    try { sha256 = await firestoreMapSha256Hex(request.bytes); } catch (cause) { return remoteFailure("Hash do conteúdo", cause); }
    const reference: CanonicalReference = { campaignId: request.campaignId!, mapId: request.mapId, sha256, path: canonicalPath(request.campaignId!, request.mapId, sha256) };
    const chunkCount = Math.ceil(request.bytes.byteLength / FIRESTORE_MAP_CHUNK_BYTES);
    const manifest: MapContentManifest = { kind: "map-image", schemaVersion: 1, campaignId: request.campaignId!, mapId: request.mapId, ownerUid: request.ownerUid, sha256, mediaType: request.mediaType, size: request.bytes.byteLength, chunkSize: FIRESTORE_MAP_CHUNK_BYTES, chunkCount, complete: false };
    try {
      const existingRaw = await readDoc(firebase.value, mapPath(reference.campaignId, reference.mapId, reference.sha256));
      if (existingRaw.exists) {
        const existing = manifestFrom(existingRaw.data, reference);
        if (!existing.ok) return existing;
        if (existing.value.ownerUid !== request.ownerUid || existing.value.mediaType !== manifest.mediaType || existing.value.size !== manifest.size || existing.value.chunkCount !== manifest.chunkCount) return err(appError.corruptRecord(reference.path, "Manifesto existente diverge do upload."));
        if (existing.value.complete) {
          const verified = await readChunks(firebase.value, reference, existing.value);
          return verified.ok ? ok(receipt(reference, existing.value)) : verified;
        }
      } else {
        await deps.setDoc(referenceFor(firebase.value, mapPath(reference.campaignId, reference.mapId, reference.sha256)), manifest);
      }
      for (let index = 0; index < chunkCount; index += 1) {
        const start = index * FIRESTORE_MAP_CHUNK_BYTES;
        const bytes = request.bytes.slice(start, Math.min(request.bytes.byteLength, start + FIRESTORE_MAP_CHUNK_BYTES));
        const data = encodeBase64(bytes);
        const chunk: MapContentChunk = { schemaVersion: 1, index, chunkCount, size: bytes.byteLength, sha256: await firestoreMapSha256Hex(bytes), data };
        if (data.length > FIRESTORE_MAP_CHUNK_BASE64_MAX_CHARS) return err(appError.quotaExceeded("Fragmento Firestore excede o limite do documento.", data.length, FIRESTORE_MAP_CHUNK_BASE64_MAX_CHARS));
        const existingChunk = await readDoc(firebase.value, chunkPath(reference, index));
        if (existingChunk.exists) {
          const checked = chunkFrom(existingChunk.data, reference, index, bytes.byteLength);
          if (!checked.ok || checked.value.chunkCount !== chunk.chunkCount || checked.value.sha256 !== chunk.sha256 || checked.value.data !== chunk.data) return err(appError.corruptRecord(`${reference.path}/chunks/${index}`, "Fragmento existente diverge; não será sobrescrito."));
          continue;
        }
        await deps.setDoc(referenceFor(firebase.value, chunkPath(reference, index)), chunk);
      }
      await deps.setDoc(referenceFor(firebase.value, mapPath(reference.campaignId, reference.mapId, reference.sha256)), { complete: true }, { merge: true });
      return ok(receipt(reference, manifest));
    } catch (cause) {
      return remoteFailure("Publicação do conteúdo do mapa", cause);
    }
  }

  async function download(reference: AssetTransferReference): Promise<Result<AssetDownloadResult, AppError>> {
    const canonical = parseCanonicalPath(reference.storagePath);
    if (!canonical.ok) return canonical;
    if (!canonical.value) {
      const legacy = options.legacy?.();
      return legacy ? legacy.download(reference) : err(appError.storageUnavailable("Referência Storage legada sem adapter compatível."));
    }
    const parsed = canonical.value;
    if (reference.campaignId !== parsed.campaignId || reference.mapId !== parsed.mapId || reference.sha256 !== parsed.sha256) return err(appError.validation("storagePath", "Referência Firestore não pertence ao mapa informado."));
    const firebase = ready();
    if (!firebase.ok) return firebase;
    try {
      const raw = await readDoc(firebase.value, mapPath(parsed.campaignId, parsed.mapId, parsed.sha256));
      if (!raw.exists) return err(appError.corruptRecord(parsed.path, "Manifesto do conteúdo do mapa não encontrado."));
      const manifest = manifestFrom(raw.data, parsed);
      if (!manifest.ok) return manifest;
      if (manifest.value.ownerUid !== reference.ownerUid) return err(appError.corruptRecord(parsed.path, "Dono do manifesto não confere com a referência."));
      if (!manifest.value.complete) return err(appError.corruptRecord(parsed.path, "Conteúdo do mapa ainda não está completo."));
      const bytes = await readChunks(firebase.value, parsed, manifest.value);
      return bytes.ok ? ok({ bytes: bytes.value, receipt: receipt(parsed, manifest.value) }) : bytes;
    } catch (cause) {
      return remoteFailure("Leitura do conteúdo do mapa", cause);
    }
  }

  async function remove(reference: AssetTransferReference): Promise<Result<void, AppError>> {
    const canonical = parseCanonicalPath(reference.storagePath);
    if (!canonical.ok) return canonical;
    if (!canonical.value) {
      const legacy = options.legacy?.();
      return legacy ? legacy.delete(reference) : err(appError.storageUnavailable("Referência Storage legada sem adapter compatível."));
    }
    const parsed = canonical.value;
    if (reference.campaignId !== parsed.campaignId || reference.mapId !== parsed.mapId || reference.sha256 !== parsed.sha256) return err(appError.validation("storagePath", "Referência Firestore não pertence ao mapa informado."));
    const firebase = ready();
    if (!firebase.ok) return firebase;
    try {
      const raw = await readDoc(firebase.value, mapPath(parsed.campaignId, parsed.mapId, parsed.sha256));
      if (!raw.exists) return ok(undefined);
      const manifest = manifestFrom(raw.data, parsed);
      if (!manifest.ok) return manifest;
      for (let index = 0; index < manifest.value.chunkCount; index += 1) await deps.deleteDoc(referenceFor(firebase.value, chunkPath(parsed, index)));
      await deps.deleteDoc(referenceFor(firebase.value, mapPath(parsed.campaignId, parsed.mapId, parsed.sha256)));
      return ok(undefined);
    } catch (cause) {
      return remoteFailure("Exclusão do conteúdo do mapa", cause);
    }
  }

  return { isAvailable: available, upload, download, delete: remove };
}

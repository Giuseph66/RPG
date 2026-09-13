import {
  deleteObject as firebaseDeleteObject,
  getBytes as firebaseGetBytes,
  getMetadata as firebaseGetMetadata,
  ref as firebaseRef,
  uploadBytes as firebaseUploadBytes,
  type FirebaseStorage,
  type FullMetadata,
  type StorageReference,
  type UploadMetadata,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import {
  CLOUD_ASSET_MEDIA_TYPE,
  MAX_CLOUD_ASSET_BYTES,
  type AssetDownloadResult,
  type AssetTransferPort,
  type AssetTransferReceipt,
  type AssetTransferReference,
  type AssetUploadRequest,
} from "@application/ports/asset-transfer";
import { getStorageClient } from "./storage-client";

export interface FirebaseAssetStorageDeps {
  readonly ref: typeof firebaseRef;
  readonly uploadBytes: typeof firebaseUploadBytes;
  readonly getBytes: typeof firebaseGetBytes;
  readonly getMetadata: typeof firebaseGetMetadata;
  readonly deleteObject: typeof firebaseDeleteObject;
}

const defaultDeps: FirebaseAssetStorageDeps = {
  ref: firebaseRef,
  uploadBytes: firebaseUploadBytes,
  getBytes: firebaseGetBytes,
  getMetadata: firebaseGetMetadata,
  deleteObject: firebaseDeleteObject,
};

const HASH = /^[a-f0-9]{64}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto indisponível.");
  // Copia para um ArrayBuffer próprio: TS 7 diferencia SharedArrayBuffer de
  // BufferSource aceito pelo Web Crypto, e assets podem vir de views externas.
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unavailable(message: string, cause?: unknown): Result<never, AppError> {
  return err(appError.storageUnavailable(message, cause instanceof Error ? cause.message : cause ? String(cause) : undefined));
}

function codeOf(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "unknown";
}

function isMissing(error: unknown): boolean {
  return codeOf(error) === "storage/object-not-found";
}

function pathFor(scope: AssetTransferReference | AssetUploadRequest, sha256: string): Result<string, AppError> {
  if (!SAFE_SEGMENT.test(scope.ownerUid)) return err(appError.validation("ownerUid", "ownerUid inválido."));
  if (scope.campaignId !== undefined && !SAFE_SEGMENT.test(scope.campaignId)) return err(appError.validation("campaignId", "campaignId inválido."));
  if (!HASH.test(sha256)) return err(appError.validation("sha256", "Hash SHA-256 inválido."));
  // O documento `assets/{assetId}` é a autoridade de metadados e autorização.
  // O caminho não pode usar o hash: assetId é a chave estável compartilhada por
  // mapas/personagens e o hash permanece no metadata para verificação de bytes.
  if (!scope.assetId || !SAFE_SEGMENT.test(scope.assetId)) return err(appError.validation("assetId", "assetId obrigatório e inválido."));
  if ("storagePath" in scope && scope.storagePath !== undefined) {
    const expectedPrefix = scope.campaignId
      ? `campaigns/${scope.campaignId}/assets/`
      : `users/${scope.ownerUid}/assets/`;
    if (!scope.storagePath.startsWith(expectedPrefix) || scope.storagePath !== `${expectedPrefix}${scope.assetId}`) {
      return err(appError.validation("storagePath", "Caminho de asset não pertence ao escopo informado."));
    }
    return ok(scope.storagePath);
  }
  return ok(scope.campaignId
    ? `campaigns/${scope.campaignId}/assets/${scope.assetId}`
    : `users/${scope.ownerUid}/assets/${scope.assetId}`);
}

function validateUpload(request: AssetUploadRequest): Result<void, AppError> {
  if (!request.ownerUid.trim()) return err(appError.validation("ownerUid", "ownerUid obrigatório."));
  if (!request.assetId || !SAFE_SEGMENT.test(request.assetId)) return err(appError.validation("assetId", "assetId obrigatório e inválido."));
  if (!CLOUD_ASSET_MEDIA_TYPE.test(request.mediaType)) return err(appError.validation("mediaType", "Tipo de asset não permitido."));
  if (request.bytes.byteLength <= 0 || request.bytes.byteLength > MAX_CLOUD_ASSET_BYTES) {
    return err(appError.quotaExceeded("Asset excede o limite de 10 MiB ou está vazio.", request.bytes.byteLength, MAX_CLOUD_ASSET_BYTES));
  }
  return ok(undefined);
}

function receipt(location: AssetTransferReceipt["location"], storagePath: string, sha256: string, size: number, mediaType: string): AssetTransferReceipt {
  return { location, storagePath, sha256, size, mediaType };
}

function remoteFailure(operation: string, error: unknown): Result<never, AppError> {
  const code = codeOf(error);
  if (code === "storage/unauthorized" || code === "storage/unauthenticated") {
    return unavailable(`${operation}: autenticação ou permissão do Cloud Storage recusada.`, code);
  }
  return unavailable(`${operation}: Cloud Storage indisponível; tente novamente quando houver conexão.`, code);
}

export interface FirebaseAssetStorageOptions {
  readonly app: FirebaseApp | null | undefined;
  readonly deps?: Partial<FirebaseAssetStorageDeps>;
  /** Permite o runtime passar a sessão já observada, sem duplicar estado de Auth. */
  readonly isAuthenticated?: () => boolean;
}

export function createFirebaseAssetStorageAdapter(options: FirebaseAssetStorageOptions): AssetTransferPort {
  const deps = { ...defaultDeps, ...options.deps };
  const storage: FirebaseStorage | null = options.app ? getStorageClient(options.app) : null;
  const authenticated = options.isAuthenticated ?? (() => {
    if (!options.app) return false;
    try { return getAuth(options.app).currentUser !== null; } catch { return false; }
  });

  function available(): boolean { return storage !== null && authenticated(); }
  function requireReady(): Result<FirebaseStorage, AppError> {
    return available() && storage ? ok(storage) : unavailable("Cloud Storage exige Firebase configurado e usuário autenticado.");
  }
  function storageRef(storageValue: FirebaseStorage, path: string): StorageReference {
    return deps.ref(storageValue, path);
  }

  return {
    isAvailable: available,
    async upload(request) {
      const ready = requireReady(); if (!ready.ok) return ready;
      const valid = validateUpload(request); if (!valid.ok) return valid;
      let sha256: string;
      try { sha256 = await sha256Hex(request.bytes); } catch (error) { return unavailable("Não foi possível calcular o hash do asset.", error); }
      const path = pathFor(request, sha256); if (!path.ok) return path;
      const target = storageRef(ready.value, path.value);
      try {
        const existing = await deps.getMetadata(target);
        const existingHash = existing.customMetadata?.sha256;
        const existingCampaign = existing.customMetadata?.campaignId;
        if (
          existingHash !== sha256 ||
          existing.size !== request.bytes.byteLength ||
          existing.contentType !== request.mediaType ||
          existing.customMetadata?.ownerUid !== request.ownerUid ||
          existingCampaign !== (request.campaignId ?? undefined)
        ) return err(appError.corruptRecord(path.value, "Asset existente diverge dos metadados esperados."));
        return ok(receipt("cloud-storage", path.value, sha256, existing.size, existing.contentType ?? request.mediaType));
      } catch (error) {
        if (!isMissing(error)) return remoteFailure("Leitura do asset", error);
      }
      const metadata: UploadMetadata = {
        contentType: request.mediaType,
        customMetadata: {
          sha256,
          ownerUid: request.ownerUid,
          ...(request.campaignId ? { campaignId: request.campaignId } : {}),
        },
      };
      try {
        const uploaded = await deps.uploadBytes(target, request.bytes, metadata);
        return ok(receipt("cloud-storage", path.value, sha256, uploaded.metadata.size, uploaded.metadata.contentType ?? request.mediaType));
      } catch (error) { return remoteFailure("Upload do asset", error); }
    },
    async download(reference) {
      const ready = requireReady(); if (!ready.ok) return ready;
      const path = pathFor(reference, reference.sha256); if (!path.ok) return path;
      const target = storageRef(ready.value, path.value);
      try {
        const metadata: FullMetadata = await deps.getMetadata(target);
        if (metadata.size <= 0 || metadata.size > MAX_CLOUD_ASSET_BYTES) return err(appError.corruptRecord(path.value, "Asset remoto excede o limite permitido."));
        const bytes = new Uint8Array(await deps.getBytes(target, MAX_CLOUD_ASSET_BYTES));
        const actual = await sha256Hex(bytes);
        if (
          actual !== reference.sha256 ||
          metadata.customMetadata?.sha256 !== reference.sha256 ||
          metadata.customMetadata?.ownerUid !== reference.ownerUid ||
          metadata.customMetadata?.campaignId !== (reference.campaignId ?? undefined) ||
          metadata.size !== bytes.byteLength
        ) {
          return err(appError.corruptRecord(path.value, "Hash ou tamanho do asset remoto não confere."));
        }
        return ok({ bytes, receipt: receipt("cloud-storage", path.value, actual, bytes.byteLength, metadata.contentType ?? "application/octet-stream") } satisfies AssetDownloadResult);
      } catch (error) { return remoteFailure("Download do asset", error); }
    },
    async delete(reference) {
      const ready = requireReady(); if (!ready.ok) return ready;
      const path = pathFor(reference, reference.sha256); if (!path.ok) return path;
      try {
        await deps.deleteObject(storageRef(ready.value, path.value));
        return ok(undefined);
      } catch (error) {
        if (isMissing(error)) return ok(undefined);
        return remoteFailure("Exclusão do asset", error);
      }
    },
  };
}

/**
 * Porta para bytes de assets. Metadados podem seguir pela outbox/Firestore;
 * bytes passam por esta porta e nunca entram em snapshots JSON.
 */

import type { AppError, Result } from "@domain/contracts/errors";
import type { Uuid } from "@domain/contracts/ids";

export const MAX_CLOUD_ASSET_BYTES = 10 * 1024 * 1024;
export const CLOUD_ASSET_MEDIA_TYPE = /^image\/(png|jpeg|webp)$/;
/** Fragmento cru máximo; base64 ocupa até 873816 caracteres, abaixo de 1 MiB. */
export const FIRESTORE_MAP_CHUNK_BYTES = 655_360;
export const FIRESTORE_MAP_CHUNK_BASE64_MAX_CHARS = 873_816;

export interface AssetTransferScope {
  readonly ownerUid: string;
  readonly campaignId?: string;
}

export interface AssetUploadRequest extends AssetTransferScope {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly originalName?: string;
  /** ID local opcional; não participa do caminho cloud, que é content-addressed. */
  readonly assetId?: Uuid;
  /** Obrigatório para novas imagens de mapa; determina o ACL do documento pai. */
  readonly mapId?: Uuid;
}

export interface AssetTransferReference extends AssetTransferScope {
  readonly sha256: string;
  /** Necessário apenas para adaptadores que leem a cópia local. */
  readonly assetId?: Uuid;
  /** Caminho capturado pelo manifesto; evita reconstrução ambígua após remoção local. */
  readonly storagePath?: string;
  /** Obrigatório quando a referência usa o conteúdo Firestore de um mapa. */
  readonly mapId?: Uuid;
}

export interface AssetTransferReceipt {
  readonly location: "cloud-storage" | "firestore-map" | "local";
  readonly storagePath: string;
  readonly sha256: string;
  readonly size: number;
  readonly mediaType: string;
}

export interface AssetDownloadResult {
  readonly bytes: Uint8Array;
  readonly receipt: AssetTransferReceipt;
}

export interface AssetTransferPort {
  /** Checagem síncrona; não inicia I/O. */
  isAvailable(): boolean;
  upload(request: AssetUploadRequest): Promise<Result<AssetTransferReceipt, AppError>>;
  download(reference: AssetTransferReference): Promise<Result<AssetDownloadResult, AppError>>;
  delete(reference: AssetTransferReference): Promise<Result<void, AppError>>;
}

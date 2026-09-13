/**
 * Porta para bytes de assets. Metadados podem seguir pela outbox/Firestore;
 * bytes passam por esta porta e nunca entram em snapshots JSON.
 */

import type { AppError, Result } from "@domain/contracts/errors";
import type { Uuid } from "@domain/contracts/ids";

export const MAX_CLOUD_ASSET_BYTES = 10 * 1024 * 1024;
export const CLOUD_ASSET_MEDIA_TYPE = /^image\/(png|jpeg|webp)$/;

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
}

export interface AssetTransferReference extends AssetTransferScope {
  readonly sha256: string;
  /** Necessário apenas para adaptadores que leem a cópia local. */
  readonly assetId?: Uuid;
  /** Caminho capturado pelo manifesto; evita reconstrução ambígua após remoção local. */
  readonly storagePath?: string;
}

export interface AssetTransferReceipt {
  readonly location: "cloud-storage" | "local";
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

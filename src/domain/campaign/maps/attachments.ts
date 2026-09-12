import { type Asset } from "@domain/contracts/campaign";

import { type AttachmentQuota, type MapAttachment, type MapDomainError, type MapResult, type MapRasterMediaType, type MapValidationPolicy } from "./types";

export const DEFAULT_MAP_VALIDATION_POLICY: Required<Omit<MapValidationPolicy, "allowedMediaTypes" | "quotaBytes" | "usedBytes">> & Pick<MapValidationPolicy, "allowedMediaTypes" | "quotaBytes" | "usedBytes"> = {
  allowedMediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  maxBytes: 25 * 1024 * 1024,
  maxWidth: 10000,
  maxHeight: 10000,
};

const error = {
  missingAttachment(): MapDomainError { return { code: "missing-attachment", field: "asset", message: "O anexo do mapa não foi encontrado." }; },
  mediaType(value: string): MapDomainError { return { code: "invalid-media-type", field: "mediaType", message: `Tipo de imagem não permitido: ${value}.` }; },
  tooLarge(maxBytes: number, actualBytes: number): MapDomainError { return { code: "attachment-too-large", field: "bytes", maxBytes, actualBytes, message: `A imagem excede o limite de ${maxBytes} bytes.` }; },
  dimensions(field: "width" | "height"): MapDomainError { return { code: "invalid-dimensions", field, message: "Dimensões da imagem devem ser positivas e finitas." }; },
  quota(requestedBytes: number, availableBytes: number): MapDomainError { return { code: "quota-exceeded", field: "quota", requestedBytes, availableBytes, message: "A cota de anexos do dispositivo foi excedida." }; },
  inconsistent(): MapDomainError { return { code: "inconsistent-attachment", field: "assetId", message: "O mapa referencia um anexo diferente do metadado recebido." }; },
};

function isRasterMediaType(value: string, allowed: readonly MapRasterMediaType[]): value is MapRasterMediaType {
  return allowed.includes(value as MapRasterMediaType);
}

export function validateMapAttachment(asset: Partial<Asset> | null | undefined, policy: MapValidationPolicy = DEFAULT_MAP_VALIDATION_POLICY): MapResult<MapAttachment> {
  if (!asset) return { ok: false, error: error.missingAttachment() };
  const allowed: readonly MapRasterMediaType[] = policy.allowedMediaTypes ?? (DEFAULT_MAP_VALIDATION_POLICY.allowedMediaTypes as readonly MapRasterMediaType[]);
  if (typeof asset.mediaType !== "string" || !isRasterMediaType(asset.mediaType, allowed)) return { ok: false, error: error.mediaType(asset.mediaType ?? "desconhecido") };
  if (!(asset.bytes instanceof Uint8Array) || asset.bytes.byteLength === 0) return { ok: false, error: error.missingAttachment() };
  const maxBytes = policy.maxBytes ?? DEFAULT_MAP_VALIDATION_POLICY.maxBytes;
  if (asset.bytes.byteLength > maxBytes) return { ok: false, error: error.tooLarge(maxBytes, asset.bytes.byteLength) };
  const width = asset.width;
  const height = asset.height;
  const maxWidth = policy.maxWidth ?? DEFAULT_MAP_VALIDATION_POLICY.maxWidth;
  const maxHeight = policy.maxHeight ?? DEFAULT_MAP_VALIDATION_POLICY.maxHeight;
  if (typeof width !== "number" || !Number.isFinite(width) || !Number.isInteger(width) || width <= 0 || width > maxWidth) return { ok: false, error: error.dimensions("width") };
  if (typeof height !== "number" || !Number.isFinite(height) || !Number.isInteger(height) || height <= 0 || height > maxHeight) return { ok: false, error: error.dimensions("height") };
  if (typeof asset.id !== "string" || typeof asset.hash !== "string" || typeof asset.originalName !== "string") return { ok: false, error: error.missingAttachment() };
  if (policy.quotaBytes !== undefined && policy.usedBytes !== undefined) {
    const quotaResult = validateAttachmentQuota(asset.bytes.byteLength, { usedBytes: policy.usedBytes, quotaBytes: policy.quotaBytes });
    if (!quotaResult.ok) return quotaResult;
  }
  return { ok: true, value: { ...asset, mediaType: asset.mediaType, bytes: asset.bytes, width, height } as MapAttachment };
}

export function validateAttachmentQuota(requestedBytes: number, quota: AttachmentQuota): MapResult<void> {
  if (!Number.isFinite(requestedBytes) || requestedBytes < 0) return { ok: false, error: error.quota(requestedBytes, Math.max(0, quota.quotaBytes - quota.usedBytes)) };
  const availableBytes = Math.max(0, quota.quotaBytes - quota.usedBytes);
  return requestedBytes <= availableBytes ? { ok: true, value: undefined } : { ok: false, error: error.quota(requestedBytes, availableBytes) };
}

export function validateMapAttachmentQuota(asset: Pick<Asset, "bytes">, quota: AttachmentQuota): MapResult<void> {
  return validateAttachmentQuota(asset.bytes.byteLength, quota);
}

export function validateMapAttachmentImport(asset: Partial<Asset> | null | undefined, policy: MapValidationPolicy = DEFAULT_MAP_VALIDATION_POLICY, quota?: AttachmentQuota): MapResult<MapAttachment> {
  const validated = validateMapAttachment(asset, policy);
  if (!validated.ok || !quota) return validated;
  const available = validateMapAttachmentQuota(validated.value, quota);
  return available.ok ? validated : available;
}

export function validateMapAttachmentConsistency(mapAssetId: string, attachment: MapAttachment | null | undefined): MapResult<MapAttachment> {
  return findMapAttachment(mapAssetId, attachment);
}

export function validateMapRecordConsistency(map: { readonly assetId: string }, attachment: MapAttachment | null | undefined): MapResult<MapAttachment> {
  return findMapAttachment(String(map.assetId), attachment);
}

export function findMapAttachment(mapAssetId: string, attachment: MapAttachment | null | undefined): MapResult<MapAttachment> {
  if (!attachment) return { ok: false, error: error.missingAttachment() };
  return String(attachment.id) === mapAssetId ? { ok: true, value: attachment } : { ok: false, error: error.inconsistent() };
}

export const validateMapAsset = validateMapAttachment;
export const validateMapImage = validateMapAttachment;
export const checkAttachmentQuota = validateAttachmentQuota;

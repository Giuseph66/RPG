import type { AssetSyncService } from "@application/assets/service";
import { MAX_PORTRAIT_BASE64_LENGTH, MAX_PORTRAIT_BYTES, type PortraitRemoteStore } from "@application/ports/portrait-store";
import type { SyncOutboxService } from "@application/sync";
import type { Asset } from "@domain/contracts/campaign";
import { asCommandId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import type { SheetPortrait } from "@features/character/sheet";

const ENCODINGS: readonly { readonly edge: number; readonly quality: number }[] = [
  { edge: 1024, quality: 0.85 },
  { edge: 900, quality: 0.78 },
  { edge: 768, quality: 0.72 },
  { edge: 640, quality: 0.65 },
];

export interface PortraitServiceOptions {
  readonly assets: AssetSyncService;
  readonly outbox?: SyncOutboxService;
  readonly remote?: PortraitRemoteStore;
  readonly cloudUid: () => string | undefined;
  readonly newId: () => Uuid;
  readonly now: () => IsoTimestamp;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array | undefined {
  if (value.length === 0 || value.length > MAX_PORTRAIT_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return undefined;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return undefined;
  }
}

async function shrink(file: File): Promise<{ readonly bytes: Uint8Array; readonly mediaType: string; readonly width: number; readonly height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    let last: { bytes: Uint8Array; mediaType: string; width: number; height: number } | undefined;
    for (const { edge, quality } of ENCODINGS) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponível para processar a imagem.");
      context.drawImage(bitmap, 0, 0, width, height);
      const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
      const webp = await encode("image/webp");
      const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
      if (!blob) throw new Error("Não foi possível codificar a imagem.");
      last = { bytes: new Uint8Array(await blob.arrayBuffer()), mediaType: blob.type || "image/jpeg", width, height };
      if (last.bytes.byteLength > 0 && last.bytes.byteLength <= MAX_PORTRAIT_BYTES) return last;
    }
    throw new Error("Não foi possível reduzir a imagem para o limite do Firestore.");
  } finally {
    bitmap.close();
  }
}

function toUrl(asset: Pick<Asset, "bytes" | "mediaType">): string {
  const copy = new Uint8Array(asset.bytes.byteLength);
  copy.set(asset.bytes);
  return URL.createObjectURL(new Blob([copy.buffer], { type: asset.mediaType }));
}

export function createPortraitService(options: PortraitServiceOptions): SheetPortrait & { publishExisting(assetId: Uuid): Promise<void> } {
  const { assets, outbox, remote, cloudUid, newId, now } = options;
  const queued = new Set<string>();
  const inFlight = new Set<string>();

  async function publish(asset: Asset, uid: string): Promise<void> {
    if (!remote || !outbox || asset.bytes.byteLength > MAX_PORTRAIT_BYTES) return;
    const key = `${uid}:${asset.id}`;
    if (queued.has(key) || inFlight.has(key)) return;
    inFlight.add(key);
    try {
      const result = await outbox.enqueue({
        operationId: asCommandId(`portrait:${uid}:${asset.id}`),
        aggregateType: "portrait",
        aggregateId: asset.id,
        mutation: "upsert",
        baseRevision: asRevision(0),
        payload: {
          id: asset.id,
          sha256: asset.hash,
          mediaType: asset.mediaType,
          ...(asset.width ? { width: asset.width } : {}),
          ...(asset.height ? { height: asset.height } : {}),
          data: toBase64(asset.bytes),
          revision: 1,
          schemaVersion: 1,
        },
        createdAt: now(),
      });
      if (result.ok && cloudUid() === uid) queued.add(key);
    } catch (cause) {
      console.error("Falha ao enfileirar retrato no Firestore", cause);
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    async publishExisting(assetId) {
      const uid = cloudUid();
      if (!uid) return;
      const local = await assets.getLocal(assetId);
      if (local.ok) await publish(local.value, uid);
    },
    async load(assetId, sha256) {
      const local = await assets.getLocal(assetId);
      const uid = cloudUid();
      if (local.ok && (!sha256 || local.value.hash === sha256)) {
        if (uid) void publish(local.value, uid);
        return toUrl(local.value);
      }
      if (!uid || !remote || !sha256) return undefined;
      const record = await remote.get(assetId);
      if (!record || record.ownerUid !== uid || record.sha256 !== sha256 ||
        !/^image\/(webp|jpeg)$/.test(record.mediaType)) return undefined;
      const bytes = fromBase64(record.data);
      if (!bytes || await sha256Hex(bytes) !== sha256) return undefined;
      const asset: Asset = { id: assetId, bytes, hash: sha256, mediaType: record.mediaType, originalName: `portrait-${assetId}` };
      await assets.saveLocal(asset);
      queued.add(`${uid}:${assetId}`);
      return toUrl(asset);
    },
    async upload(file) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return { ok: false, message: "Use uma imagem PNG, JPEG ou WebP." };
      let processed: Awaited<ReturnType<typeof shrink>>;
      try {
        processed = await shrink(file);
      } catch (cause) {
        return { ok: false, message: cause instanceof Error ? cause.message : "Não foi possível ler a imagem." };
      }
      const hash = await sha256Hex(processed.bytes);
      const asset: Asset = { id: newId(), bytes: processed.bytes, hash, mediaType: processed.mediaType, width: processed.width, height: processed.height, originalName: file.name || "retrato" };
      const saved = await assets.saveLocal(asset);
      if (!saved.ok) return { ok: false, message: saved.error.message };
      const uid = cloudUid();
      if (uid) void publish(asset, uid);
      return { ok: true, assetId: asset.id, sha256: hash };
    },
  };
}

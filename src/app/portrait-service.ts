/**
 * Retratos de personagem. A imagem escolhida é reduzida no navegador, gravada como
 * `Asset` no IndexedDB (funciona offline) e, com sessão Firebase, publicada em duas
 * etapas: metadados `assets/{id}` pela outbox e bytes no Cloud Storage. Em outro
 * dispositivo, `load` baixa os bytes pelo hash salvo na ficha e guarda a cópia local.
 */
import type { AssetSyncService } from "@application/assets/service";
import type { SyncOutboxService } from "@application/sync";
import type { Asset } from "@domain/contracts/campaign";
import { asCommandId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import type { SheetPortrait } from "@features/character/sheet";

const MAX_EDGE = 1024;
const UPLOAD_RETRY_DELAYS_MS = [2_000, 6_000, 15_000, 45_000];

export interface PortraitServiceOptions {
  readonly assets: AssetSyncService;
  readonly outbox?: SyncOutboxService;
  /** UID do Firebase quando há sessão; `undefined` mantém tudo local. */
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

/** Reduz para no máximo 1024 px no maior lado e recodifica em WebP (JPEG como reserva). */
async function shrink(file: File): Promise<{ readonly bytes: Uint8Array; readonly mediaType: string; readonly width: number; readonly height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível para processar a imagem.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const blob = (await encode("image/webp")) ?? (await encode("image/jpeg"));
  if (!blob) throw new Error("Não foi possível codificar a imagem.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mediaType: blob.type || "image/jpeg", width, height };
}

function toUrl(asset: Pick<Asset, "bytes" | "mediaType">): string {
  const copy = new Uint8Array(asset.bytes.byteLength);
  copy.set(asset.bytes);
  return URL.createObjectURL(new Blob([copy.buffer], { type: asset.mediaType }));
}

export function createPortraitService(options: PortraitServiceOptions): SheetPortrait {
  const { assets, outbox, cloudUid, newId, now } = options;

  /** Metadados primeiro (as regras do Storage exigem `assets/{id}`), bytes depois, com novas tentativas. */
  async function publish(asset: Asset, uid: string): Promise<void> {
    if (!outbox) return;
    const storagePath = `users/${uid}/assets/${asset.id}`;
    const queued = await outbox.enqueue({
      operationId: asCommandId(`portrait-${asset.id}`),
      aggregateType: "asset",
      aggregateId: asset.id,
      mutation: "upsert",
      baseRevision: asRevision(0),
      payload: {
        id: asset.id,
        hash: asset.hash,
        mediaType: asset.mediaType,
        ...(asset.width ? { width: asset.width } : {}),
        ...(asset.height ? { height: asset.height } : {}),
        originalName: asset.originalName,
        size: asset.bytes.byteLength,
        storagePath,
        revision: 1,
        schemaVersion: 1,
      },
      createdAt: now(),
    });
    if (!queued.ok) return;
    for (const delay of UPLOAD_RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (cloudUid() !== uid) return;
      const uploaded = await assets.uploadRemote({ ownerUid: uid, assetId: asset.id, bytes: asset.bytes, mediaType: asset.mediaType, originalName: asset.originalName });
      if (uploaded.ok) return;
    }
  }

  // Bytes que ainda não chegaram ao Storage (ex.: Storage desativado) são reenviados uma vez
  // por sessão quando a ficha abre; o upload é idempotente para o mesmo asset.
  const retried = new Set<string>();

  return {
    async load(assetId, sha256) {
      const local = await assets.getLocal(assetId);
      if (local.ok) {
        const uid = cloudUid();
        if (uid && !retried.has(assetId)) {
          retried.add(assetId);
          void assets.uploadRemote({ ownerUid: uid, assetId, bytes: local.value.bytes, mediaType: local.value.mediaType, originalName: local.value.originalName });
        }
        return toUrl(local.value);
      }
      const uid = cloudUid();
      if (!uid || !sha256) return undefined;
      const remote = await assets.downloadRemote({ ownerUid: uid, assetId, sha256 });
      if (!remote.ok) return undefined;
      const asset: Asset = { id: assetId, bytes: remote.value.bytes, hash: sha256, mediaType: remote.value.receipt.mediaType, originalName: `portrait-${assetId}` };
      await assets.saveLocal(asset);
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

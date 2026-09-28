/**
 * Publicação de mapas para os jogadores.
 *
 * O mestre importa a imagem localmente; para que um jogador a veja, os bytes precisam
 * estar confirmados no Cloud Storage (`campaigns/{campaignId}/assets/{assetId}`) e o mapa
 * precisa listar o público em `visibleTo`. O Storage só aceita o upload depois que o
 * documento de metadados do asset existe no Firestore, por isso a outbox é drenada antes.
 */

import { type Asset, type CampaignAudience, type MapRecord } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { CLOUD_ASSET_MEDIA_TYPE, MAX_CLOUD_ASSET_BYTES, type AssetDownloadResult, type AssetTransferReceipt, type AssetTransferReference, type AssetUploadRequest } from "@application/ports/asset-transfer";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { toJsonSnapshot, type NewSyncOperation } from "@application/sync";

export interface MapPublicationOptions {
  readonly getLocalAsset: (id: Uuid) => Promise<Result<Asset, AppError>>;
  readonly saveLocalAsset: (asset: Asset) => Promise<Result<Asset, AppError>>;
  readonly upload: (request: AssetUploadRequest) => Promise<Result<AssetTransferReceipt, AppError>>;
  readonly download: (reference: AssetTransferReference) => Promise<Result<AssetDownloadResult, AppError>>;
  readonly cloudAvailable: () => boolean;
  /** UID Firebase atual; ausente quando a conta está desconectada. */
  readonly ownerUid: () => string | undefined;
  readonly enqueue: (operation: NewSyncOperation) => Promise<Result<unknown, AppError>>;
  /** Envia operações pendentes (e lê o remoto) antes do upload dos bytes. */
  readonly flush: () => Promise<void>;
  readonly saveMap: (map: MapRecord, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export interface MapPublication {
  /** Pode enviar agora? Falso sem conta conectada ou sem Firebase configurado. */
  canPublish(): boolean;
  /** Envia (ou confirma) a imagem no Firebase e grava a confirmação no mapa. */
  publish(map: MapRecord): Promise<Result<MapRecord, AppError>>;
  /** Define quem vê o mapa. Compartilhar exige a imagem confirmada no Firebase. */
  share(map: MapRecord, audience: CampaignAudience): Promise<Result<MapRecord, AppError>>;
  /** Imagem local ou, para jogadores, baixada do Firebase e guardada neste aparelho. */
  loadImage(map: MapRecord): Promise<Result<Asset, AppError>>;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createMapPublication(options: MapPublicationOptions): MapPublication {
  const { clock, idGenerator } = options;

  async function saved(map: MapRecord, patch: Partial<MapRecord>): Promise<Result<MapRecord, AppError>> {
    const next = { ...map, ...patch };
    const revision = await options.saveMap(next, map.revision);
    return revision.ok ? ok({ ...next, revision: revision.value }) : revision;
  }

  async function publish(map: MapRecord): Promise<Result<MapRecord, AppError>> {
    const ownerUid = options.ownerUid();
    if (!ownerUid || !options.cloudAvailable()) return err(appError.storageUnavailable("Entre na sua conta para enviar a imagem do mapa ao Firebase."));
    const local = await options.getLocalAsset(map.assetId);
    if (!local.ok) return err(appError.storageUnavailable("A imagem deste mapa não está neste aparelho; envie a partir do dispositivo onde ela foi importada."));
    const asset = local.value;
    if (!CLOUD_ASSET_MEDIA_TYPE.test(asset.mediaType)) return err(appError.validation("mediaType", "Para compartilhar, reimporte o mapa em PNG, JPG ou WebP."));
    if (asset.bytes.byteLength > MAX_CLOUD_ASSET_BYTES) return err(appError.validation("bytes", "Para compartilhar, a imagem do mapa precisa ter até 10 MB."));
    const sha256 = await sha256Hex(asset.bytes);

    let current = map;
    let target = asset;
    // Assets antigos foram registrados sem campanha (ou com hash curto) e o caminho remoto
    // é imutável. Uma cópia vinculada à campanha recebe um ID novo e metadados corretos.
    if (asset.campaignId !== map.campaignId || asset.hash !== sha256) {
      target = { ...asset, id: idGenerator.uuid(), hash: sha256, campaignId: map.campaignId };
      const stored = await options.saveLocalAsset(target);
      if (!stored.ok) return stored;
      const payload = toJsonSnapshot({ id: target.id, campaignId: map.campaignId, mediaType: target.mediaType, hash: sha256, width: target.width, height: target.height, originalName: target.originalName, size: target.bytes.byteLength });
      const queued = await options.enqueue({ operationId: idGenerator.commandId(), aggregateType: "asset", aggregateId: target.id, mutation: "upsert", baseRevision: asRevision(0), scope: { campaignId: map.campaignId }, payload, createdAt: clock.now() });
      if (!queued.ok) return queued;
      const rebound = await saved(current, { assetId: target.id, image: undefined });
      if (!rebound.ok) return rebound;
      current = rebound.value;
    }

    await options.flush();
    const receipt = await options.upload({ ownerUid, campaignId: map.campaignId, bytes: target.bytes, mediaType: target.mediaType, originalName: target.originalName, assetId: target.id });
    if (!receipt.ok) return receipt;
    const confirmed = await saved(current, {
      image: {
        storagePath: receipt.value.storagePath,
        sha256: receipt.value.sha256,
        ownerUid,
        mediaType: target.mediaType,
        ...(target.width ? { width: target.width } : {}),
        ...(target.height ? { height: target.height } : {}),
        originalName: target.originalName,
        confirmedAt: clock.now(),
      },
    });
    if (confirmed.ok) void options.flush();
    return confirmed;
  }

  return {
    canPublish: () => Boolean(options.ownerUid()) && options.cloudAvailable(),
    publish,
    async share(map, audience) {
      const unique = [...new Set(audience)];
      let current = map;
      if (unique.length > 0 && !current.image) {
        const published = await publish(current);
        if (!published.ok) return published;
        current = published.value;
      }
      const next = await saved(current, unique.length > 0 ? { visibleTo: unique } : { visibleTo: undefined });
      if (next.ok) void options.flush();
      return next;
    },
    async loadImage(map) {
      const local = await options.getLocalAsset(map.assetId);
      if (local.ok) return local;
      if (!map.image) return err(appError.notFound("asset", map.assetId));
      const downloaded = await options.download({ ownerUid: map.image.ownerUid, campaignId: map.campaignId, sha256: map.image.sha256, assetId: map.assetId, storagePath: map.image.storagePath });
      if (!downloaded.ok) return downloaded;
      const asset: Asset = {
        id: map.assetId,
        bytes: downloaded.value.bytes,
        hash: map.image.sha256,
        mediaType: map.image.mediaType,
        ...(map.image.width ? { width: map.image.width } : {}),
        ...(map.image.height ? { height: map.image.height } : {}),
        originalName: map.image.originalName,
        campaignId: map.campaignId,
      };
      // Guardar a cópia é só cache: a imagem baixada continua válida mesmo se falhar.
      await options.saveLocalAsset(asset);
      return ok(asset);
    },
  };
}

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import type { Asset } from "@domain/contracts/campaign";
import type { AssetRepository } from "@application/ports/asset-repository";
import type {
  AssetDownloadResult,
  AssetTransferPort,
  AssetTransferReference,
  AssetTransferReceipt,
  AssetUploadRequest,
} from "@application/ports/asset-transfer";

/**
 * Coordena cópia local imediata e transferência cloud opcional.
 * Ausência da nuvem é um erro explícito; nunca é reportada como upload remoto concluído.
 */
export class AssetSyncService {
  constructor(
    private readonly local: AssetRepository,
    private readonly remote?: AssetTransferPort,
  ) {}

  saveLocal(asset: Asset): Promise<Result<Asset, AppError>> {
    return this.local.put(asset);
  }

  getLocal(id: Asset["id"]): Promise<Result<Asset, AppError>> {
    return this.local.get(id);
  }

  deleteLocal(id: Asset["id"]): Promise<Result<void, AppError>> {
    return this.local.delete(id);
  }

  uploadRemote(request: AssetUploadRequest): Promise<Result<AssetTransferReceipt, AppError>> {
    if (!this.remote || !this.remote.isAvailable()) {
      return Promise.resolve(err(appError.storageUnavailable("Cloud Storage indisponível; asset mantido localmente.")));
    }
    return this.remote.upload(request);
  }

  downloadRemote(reference: AssetTransferReference): Promise<Result<AssetDownloadResult, AppError>> {
    if (!this.remote || !this.remote.isAvailable()) {
      return Promise.resolve(err(appError.storageUnavailable("Cloud Storage indisponível; download remoto não executado.")));
    }
    return this.remote.download(reference);
  }

  deleteRemote(reference: AssetTransferReference): Promise<Result<void, AppError>> {
    if (!this.remote || !this.remote.isAvailable()) {
      return Promise.resolve(err(appError.storageUnavailable("Cloud Storage indisponível; exclusão remota não executada.")));
    }
    return this.remote.delete(reference);
  }
}

export function createAssetSyncService(local: AssetRepository, remote?: AssetTransferPort): AssetSyncService {
  return new AssetSyncService(local, remote);
}

/** Adaptador local deliberadamente explícito: seu receipt nunca se apresenta como cloud. */
export function createLocalAssetTransferAdapter(repository: AssetRepository): AssetTransferPort {
  return {
    isAvailable: () => true,
    async upload(request) {
      if (!request.assetId || !request.originalName) {
        return err(appError.validation("assetId", "Adaptador local exige assetId e originalName."));
      }
      const asset: Asset = {
        id: request.assetId,
        bytes: new Uint8Array(request.bytes),
        hash: request.assetId,
        mediaType: request.mediaType,
        originalName: request.originalName,
      };
      const saved = await repository.put(asset);
      if (!saved.ok) return saved;
      return ok({
        location: "local",
        storagePath: `local/assets/${request.assetId}`,
        sha256: request.assetId,
        size: request.bytes.byteLength,
        mediaType: request.mediaType,
      });
    },
    async download(reference) {
      if (!reference.assetId) return err(appError.validation("assetId", "Adaptador local exige assetId."));
      const found = await repository.get(reference.assetId);
      if (!found.ok) return found;
      return ok({
        bytes: new Uint8Array(found.value.bytes),
        receipt: {
          location: "local",
          storagePath: `local/assets/${reference.assetId}`,
          sha256: reference.sha256,
          size: found.value.bytes.byteLength,
          mediaType: found.value.mediaType,
        },
      });
    },
    delete(reference) {
      if (!reference.assetId) return Promise.resolve(err(appError.validation("assetId", "Adaptador local exige assetId.")));
      return repository.delete(reference.assetId);
    },
  };
}

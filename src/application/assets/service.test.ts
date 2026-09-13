import { describe, expect, it, vi } from "vitest";

import { appError, err, ok } from "@domain/contracts/errors";
import { asUuid } from "@domain/contracts/ids";
import type { Asset } from "@domain/contracts/campaign";
import type { AssetRepository } from "@application/ports/asset-repository";
import type { AssetTransferPort } from "@application/ports/asset-transfer";
import { AssetSyncService, createLocalAssetTransferAdapter, createAssetSyncService } from "./service";

const id = asUuid("00000000-0000-4000-8000-000000000001");
const asset: Asset = { id, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "local-hash", originalName: "a.png" };

function repository(): AssetRepository {
  const values = new Map([[id, asset]]);
  return { get: async (key) => values.has(key) ? ok(values.get(key)!) : err(appError.notFound("asset", key)), put: async (value) => { values.set(value.id, value); return ok(value); }, delete: async (key) => { values.delete(key); return ok(undefined); } };
}

describe("AssetSyncService", () => {
  it("mantém o caminho local funcional e explicita ausência da nuvem", async () => {
    const local = repository();
    const service = createAssetSyncService(local);
    expect((await service.saveLocal(asset)).ok).toBe(true);
    const result = await service.uploadRemote({ ownerUid: "owner", assetId: id, bytes: asset.bytes, mediaType: asset.mediaType, originalName: asset.originalName });
    expect(result.ok ? "success" : result.error.code).toBe("storage-unavailable");
  });

  it("não transforma falha cloud em sucesso local/remoto", async () => {
    const remote: AssetTransferPort = { isAvailable: () => false, upload: vi.fn(), download: vi.fn(), delete: vi.fn() };
    const service = new AssetSyncService(repository(), remote);
    const result = await service.downloadRemote({ ownerUid: "owner", sha256: "a".repeat(64) });
    expect(result).toMatchObject({ ok: false, error: { code: "storage-unavailable" } });
    expect(remote.download).not.toHaveBeenCalled();
  });

  it("receipt local nunca se declara cloud", async () => {
    const adapter = createLocalAssetTransferAdapter(repository());
    const result = await adapter.upload({ ownerUid: "owner", assetId: id, bytes: asset.bytes, mediaType: asset.mediaType, originalName: asset.originalName });
    expect(result).toMatchObject({ ok: true, value: { location: "local" } });
  });
});

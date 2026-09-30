import { describe, expect, it, vi } from "vitest";

import { ok, err, appError } from "@domain/contracts/errors";
import type { Asset } from "@domain/contracts/campaign";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import type { PortraitRecord, PortraitRemoteStore } from "@application/ports/portrait-store";
import type { NewSyncOperation } from "@application/sync";
import type { SyncOperation } from "@domain/contracts/cloud-sync";

import { createPortraitService } from "./portrait-service";

const id = asUuid("11111111-1111-4111-8111-111111111111");
const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4, 5]);

async function sha256(value: Uint8Array): Promise<string> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fakeAssets(initial?: Asset) {
  const store = new Map<string, Asset>(initial ? [[initial.id, initial]] : []);
  return {
    store,
    service: {
      getLocal: vi.fn(async (assetId: string) => store.has(assetId) ? ok(store.get(assetId)!) : err(appError.notFound("asset", assetId))),
      saveLocal: vi.fn(async (asset: Asset) => { store.set(asset.id, asset); return ok(asset); }),
    } as never,
  };
}

function fakeRemote(initial?: PortraitRecord): PortraitRemoteStore & { readonly records: Map<string, PortraitRecord> } {
  const records = new Map<string, PortraitRecord>(initial ? [[initial.id, initial]] : []);
  return { records, get: vi.fn(async (key) => records.get(key)) };
}

const now = () => asIsoTimestamp("2026-09-24T00:00:00.000Z");
const fakeOutbox = () => ({ enqueue: vi.fn(async (operation: NewSyncOperation) => ok(operation as SyncOperation)) });

globalThis.URL.createObjectURL ??= () => "blob:test";

describe("createPortraitService (Firestore)", () => {
  it("enfileira para o Firestore o retrato que só existia neste aparelho", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets({ id, bytes, hash, mediaType: "image/webp", originalName: "r.webp" });
    const remote = fakeRemote();
    const outbox = fakeOutbox();
    const service = createPortraitService({ assets: assets.service, remote, outbox, cloudUid: () => "uid-1", newId: () => id, now });
    expect(await service.load(id, hash)).toMatch(/^blob:/);
    await vi.waitFor(() => expect(outbox.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      aggregateType: "portrait", aggregateId: id,
      payload: expect.objectContaining({ sha256: hash, mediaType: "image/webp", data: btoa(String.fromCharCode(...bytes)) }),
    })));
  });

  it("baixa em outro aparelho, confere o hash e guarda a cópia local", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets();
    const remote = fakeRemote({ id, ownerUid: "uid-1", mediaType: "image/webp", sha256: hash, data: btoa(String.fromCharCode(...bytes)) });
    const service = createPortraitService({ assets: assets.service, remote, cloudUid: () => "uid-1", newId: () => id, now });
    expect(await service.load(id, hash)).toMatch(/^blob:/);
    expect([...assets.store.get(id)!.bytes]).toEqual([...bytes]);
  });

  it("mestre baixa da cópia da campanha o retrato de outro jogador e não o republica", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets();
    const record: PortraitRecord = { id, ownerUid: "uid-jogador", mediaType: "image/webp", sha256: hash, data: btoa(String.fromCharCode(...bytes)) };
    const get = vi.fn(async (_key: string, campaignId?: string) => campaignId === "camp-1" ? record : undefined);
    const outbox = fakeOutbox();
    const service = createPortraitService({ assets: assets.service, remote: { get }, outbox, cloudUid: () => "uid-mestre", newId: () => id, now });
    expect(await service.load(id, hash, { campaignId: "camp-1", ownerUid: "uid-jogador" })).toMatch(/^blob:/);
    expect(get).not.toHaveBeenCalledWith(id);
    expect(await service.load(id, hash, { campaignId: "camp-1", ownerUid: "uid-jogador" })).toMatch(/^blob:/);
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it("recusa a cópia da campanha quando o dono não é o esperado", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets();
    const record: PortraitRecord = { id, ownerUid: "intruso", mediaType: "image/webp", sha256: hash, data: btoa(String.fromCharCode(...bytes)) };
    const service = createPortraitService({ assets: assets.service, remote: { get: vi.fn(async () => record) }, cloudUid: () => "uid-mestre", newId: () => id, now });
    expect(await service.load(id, hash, { campaignId: "camp-1", ownerUid: "uid-jogador" })).toBeUndefined();
  });

  it("dono grava direto a cópia da campanha quando o personagem está vinculado", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets({ id, bytes, hash, mediaType: "image/webp", originalName: "r.webp" });
    const outbox = fakeOutbox();
    const putCampaignCopy = vi.fn(async () => undefined);
    const service = createPortraitService({ assets: assets.service, remote: { get: vi.fn(async () => undefined), putCampaignCopy }, outbox, cloudUid: () => "uid-1", newId: () => id, now });
    await service.publishExisting(id, "camp-1");
    expect(putCampaignCopy).toHaveBeenCalledWith(expect.objectContaining({ id, campaignId: "camp-1", ownerUid: "uid-1", sha256: hash, data: btoa(String.fromCharCode(...bytes)) }));
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledWith(expect.not.objectContaining({ scope: expect.anything() }));
  });

  it("recusa do Firebase na cópia da campanha não trava: a próxima publicação tenta de novo", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets({ id, bytes, hash, mediaType: "image/webp", originalName: "r.webp" });
    const putCampaignCopy = vi.fn().mockRejectedValueOnce(new Error("permission-denied")).mockResolvedValue(undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const service = createPortraitService({ assets: assets.service, remote: { get: vi.fn(async () => undefined), putCampaignCopy }, outbox: fakeOutbox(), cloudUid: () => "uid-1", newId: () => id, now });
    await service.publishExisting(id, "camp-1");
    await service.publishExisting(id, "camp-1");
    expect(putCampaignCopy).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it("recusa bytes que não batem com o hash da ficha", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets();
    const remote = fakeRemote({ id, ownerUid: "uid-1", mediaType: "image/webp", sha256: hash, data: btoa("adulterado") });
    const service = createPortraitService({ assets: assets.service, remote, cloudUid: () => "uid-1", newId: () => id, now });
    expect(await service.load(id, hash)).toBeUndefined();
    expect(assets.store.has(id)).toBe(false);
  });

  it("sem sessão Firebase fica só no aparelho", async () => {
    const hash = await sha256(bytes);
    const assets = fakeAssets({ id, bytes, hash, mediaType: "image/webp", originalName: "r.webp" });
    const remote = fakeRemote();
    const outbox = fakeOutbox();
    const service = createPortraitService({ assets: assets.service, remote, outbox, cloudUid: () => undefined, newId: () => id, now });
    await service.load(id, hash);
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});

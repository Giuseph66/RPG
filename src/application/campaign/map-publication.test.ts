import { describe, expect, it, vi } from "vitest";

import { type Asset, type MapRecord } from "@domain/contracts/campaign";
import { appError, err, ok } from "@domain/contracts/errors";
import { asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import { createMapPublication, type MapPublicationOptions } from "./map-publication";

const campaignId = asUuid("00000000-0000-4000-8000-00000000ca01");
const bytes = new Uint8Array([1, 2, 3, 4]);
const map: MapRecord = { id: asUuid("00000000-0000-4000-8000-00000000aa01"), campaignId, name: "Costa", assetId: asUuid("00000000-0000-4000-8000-00000000bb01"), pins: [], revision: asRevision(1) };

async function sha(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setup(asset: Asset | undefined, overrides: Partial<MapPublicationOptions> = {}) {
  const assets = new Map<string, Asset>(asset ? [[asset.id, asset]] : []);
  let revision = 1;
  const calls: string[] = [];
  let sequence = 0;
  const options: MapPublicationOptions = {
    getLocalAsset: async (id) => assets.has(id) ? ok(assets.get(id)!) : err(appError.notFound("asset", id)),
    saveLocalAsset: async (value) => { assets.set(value.id, value); return ok(value); },
    upload: vi.fn(async (request) => { calls.push(`upload:${request.assetId}`); return ok({ location: "cloud-storage" as const, storagePath: `campaigns/${campaignId}/assets/${request.assetId}`, sha256: await sha(request.bytes), size: request.bytes.byteLength, mediaType: request.mediaType }); }),
    download: vi.fn(async () => ok({ bytes, receipt: { location: "cloud-storage" as const, storagePath: "x", sha256: "y", size: 4, mediaType: "image/png" } })),
    cloudAvailable: () => true,
    ownerUid: () => "master-uid",
    enqueue: vi.fn(async (operation) => { calls.push(`enqueue:${operation.aggregateType}`); return ok(undefined); }),
    flush: vi.fn(async () => { calls.push("flush"); }),
    saveMap: vi.fn(async (_value, expected) => { if (expected !== revision) return err(appError.conflict(expected, asRevision(revision))); revision += 1; return ok(asRevision(revision)); }),
    clock: { now: () => asIsoTimestamp("2026-09-28T12:00:00.000Z") },
    idGenerator: { uuid: () => asUuid(`00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`), commandId: () => asCommandId(`cmd-${++sequence}`) },
    ...overrides,
  };
  return { publication: createMapPublication(options), options, calls, assets };
}

describe("MapPublication", () => {
  it("drena a outbox antes do upload e grava a confirmação no mapa", async () => {
    const hash = await sha(bytes);
    const { publication, calls } = setup({ id: map.assetId, bytes, hash, mediaType: "image/png", originalName: "costa.png", campaignId });
    const result = await publication.publish(map);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(calls.slice(0, 2)).toEqual(["flush", `upload:${map.assetId}`]);
    expect(result.value.image).toMatchObject({ sha256: hash, ownerUid: "master-uid", storagePath: `campaigns/${campaignId}/assets/${map.assetId}` });
    expect(result.value.revision).toBe(2);
  });

  it("copia assets antigos (sem campanha ou hash curto) para um ID vinculado à campanha", async () => {
    const { publication, calls, options } = setup({ id: map.assetId, bytes, hash: "curto", mediaType: "image/png", originalName: "costa.png" });
    const result = await publication.publish(map);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.assetId).not.toBe(map.assetId);
    expect(calls[0]).toBe("enqueue:asset");
    expect(vi.mocked(options.enqueue).mock.calls[0]![0]).toMatchObject({ scope: { campaignId }, payload: { campaignId, hash: await sha(bytes) } });
  });

  it("compartilhar publica a imagem primeiro e grava o público", async () => {
    const { publication } = setup({ id: map.assetId, bytes, hash: await sha(bytes), mediaType: "image/png", originalName: "costa.png", campaignId });
    const result = await publication.share(map, ["*"]);
    expect(result.ok && result.value.visibleTo).toEqual(["*"]);
    expect(result.ok && result.value.image).toBeDefined();
  });

  it("sem conta conectada não finge envio", async () => {
    const { publication } = setup(undefined, { ownerUid: () => undefined });
    expect(publication.canPublish()).toBe(false);
    const result = await publication.publish(map);
    expect(result).toMatchObject({ ok: false, error: { code: "storage-unavailable" } });
  });

  it("o jogador baixa a imagem confirmada e guarda cópia local", async () => {
    const { publication, assets } = setup(undefined);
    const shared: MapRecord = { ...map, image: { storagePath: "p", sha256: "s", ownerUid: "master-uid", mediaType: "image/png", originalName: "costa.png", confirmedAt: asIsoTimestamp("2026-09-28T12:00:00.000Z") } };
    const result = await publication.loadImage(shared);
    expect(result.ok).toBe(true);
    expect(assets.has(map.assetId)).toBe(true);
  });
});

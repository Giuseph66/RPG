import { describe, expect, it, vi } from "vitest";

import { ok } from "@domain/contracts/errors";
import { asUuid } from "@domain/contracts/ids";
import { FIRESTORE_MAP_CHUNK_BYTES, type AssetTransferPort, type AssetTransferReference } from "@application/ports/asset-transfer";

import { createFirestoreMapAssetTransferAdapter, firestoreMapSha256Hex } from "./firestore-map-asset-adapter";

const campaignId = asUuid("11111111-1111-4111-8111-111111111111");
const mapId = asUuid("22222222-2222-4222-8222-222222222222");
const assetId = asUuid("33333333-3333-4333-8333-333333333333");

function fakeFirestore() {
  const documents = new Map<string, Record<string, unknown>>();
  const setCalls: Array<{ path: string; value: Record<string, unknown>; merge?: boolean }> = [];
  const deleteCalls: string[] = [];
  const deps = {
    doc: vi.fn((_firestore: never, path: string) => ({ path }) as never),
    getDoc: vi.fn(async (reference: { readonly path: string }) => ({
      exists: () => documents.has(reference.path),
      data: () => documents.get(reference.path),
    })),
    setDoc: vi.fn(async (reference: { readonly path: string }, value: Record<string, unknown>, options?: { readonly merge?: boolean }) => {
      setCalls.push({ path: reference.path, value, ...(options?.merge ? { merge: true } : {}) });
      documents.set(reference.path, options?.merge ? { ...documents.get(reference.path), ...value } : value);
    }),
    deleteDoc: vi.fn(async (reference: { readonly path: string }) => {
      deleteCalls.push(reference.path);
      documents.delete(reference.path);
    }),
  };
  return { documents, setCalls, deleteCalls, deps };
}

function adapter(fake: ReturnType<typeof fakeFirestore>, legacy?: () => AssetTransferPort | undefined) {
  return createFirestoreMapAssetTransferAdapter({
    firestore: {} as never,
    isAuthenticated: () => true,
    deps: fake.deps as never,
    ...(legacy ? { legacy } : {}),
  });
}

function bytesOf(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  return bytes;
}

function referenceFrom(receipt: { readonly storagePath: string; readonly sha256: string }): AssetTransferReference {
  return { ownerUid: "owner-1", campaignId, mapId, assetId, sha256: receipt.sha256, storagePath: receipt.storagePath };
}

describe("createFirestoreMapAssetTransferAdapter", () => {
  it("publica imagem pequena em manifesto/chunk base64 e retorna caminho canônico", async () => {
    const fake = fakeFirestore();
    const transfer = adapter(fake);
    const result = await transfer.upload({ ownerUid: "owner-1", campaignId, mapId, assetId, bytes: bytesOf(4), mediaType: "image/png", originalName: "mapa.png" });

    expect(result).toMatchObject({ ok: true, value: { location: "firestore-map" } });
    if (!result.ok) return;
    expect(result.value.storagePath).toBe(`campaigns/${campaignId}/maps/${mapId}/content/${result.value.sha256}`);
    expect(fake.setCalls.map((call) => call.path)).toEqual(expect.arrayContaining([
      `campaigns/${campaignId}/maps/${mapId}/content/${result.ok ? result.value.sha256 : ""}`,
      `campaigns/${campaignId}/maps/${mapId}/content/${result.ok ? result.value.sha256 : ""}/chunks/0`,
    ]));
    expect(fake.documents.get(fake.setCalls[1]!.path)?.data).toBeDefined();
  });

  it("fragmenta imagem acima de 1 MiB, valida hash e torna retry idempotente", async () => {
    const fake = fakeFirestore();
    const transfer = adapter(fake);
    const bytes = bytesOf(FIRESTORE_MAP_CHUNK_BYTES * 2 + 123);
    const request = { ownerUid: "owner-1", campaignId, mapId, assetId, bytes, mediaType: "image/jpeg" } as const;
    const first = await transfer.upload(request);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const callsAfterFirst = fake.setCalls.length;
    expect(fake.setCalls.filter((call) => call.path.includes("/chunks/")).map((call) => call.path)).toHaveLength(3);
    expect(await firestoreMapSha256Hex(bytes)).toBe(first.value.sha256);
    const second = await transfer.upload(request);
    expect(second).toEqual(first);
    expect(fake.setCalls).toHaveLength(callsAfterFirst);
  });

  it("baixa, recompõe e verifica todos os chunks; ausência ou corrupção não vira sucesso", async () => {
    const fake = fakeFirestore();
    const transfer = adapter(fake);
    const bytes = bytesOf(FIRESTORE_MAP_CHUNK_BYTES + 17);
    const uploaded = await transfer.upload({ ownerUid: "owner-1", campaignId, mapId, assetId, bytes, mediaType: "image/webp" });
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) return;
    const reference = referenceFrom(uploaded.value);
    const downloaded = await transfer.download(reference);
    expect(downloaded).toMatchObject({ ok: true, value: { receipt: { location: "firestore-map", sha256: uploaded.value.sha256 } } });
    if (downloaded.ok) expect([...downloaded.value.bytes]).toEqual([...bytes]);

    const chunkPrefix = `campaigns/${campaignId}/maps/${mapId}/content/${uploaded.value.sha256}/chunks/`;
    fake.documents.delete(`${chunkPrefix}1`);
    expect(await transfer.download(reference)).toMatchObject({ ok: false, error: { code: "corrupt-record" } });
    const repaired = await transfer.upload({ ownerUid: "owner-1", campaignId, mapId, assetId, bytes, mediaType: "image/webp" });
    expect(repaired).toMatchObject({ ok: false, error: { code: "corrupt-record" } });
  });

  it("não sobrescreve fragmento divergente e rejeita referência fora do caminho", async () => {
    const fake = fakeFirestore();
    const transfer = adapter(fake);
    const bytes = bytesOf(16);
    const uploaded = await transfer.upload({ ownerUid: "owner-1", campaignId, mapId, assetId, bytes, mediaType: "image/png" });
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) return;
    const chunkPath = `campaigns/${campaignId}/maps/${mapId}/content/${uploaded.value.sha256}/chunks/0`;
    const chunk = fake.documents.get(chunkPath)!;
    fake.documents.set(chunkPath, { ...chunk, data: "////" });
    expect(await transfer.upload({ ownerUid: "owner-1", campaignId, mapId, assetId, bytes, mediaType: "image/png" })).toMatchObject({ ok: false, error: { code: "corrupt-record" } });
    expect(await transfer.download({ ...referenceFrom(uploaded.value), mapId: asUuid("44444444-4444-4444-8444-444444444444") })).toMatchObject({ ok: false, error: { code: "validation-error" } });
  });

  it("delegata somente referências Storage legadas ao adapter antigo", async () => {
    const fake = fakeFirestore();
    const legacy = { isAvailable: () => true, upload: vi.fn(), download: vi.fn(async () => ok({ bytes: new Uint8Array([9]), receipt: { location: "cloud-storage" as const, storagePath: "legacy", sha256: "a".repeat(64), size: 1, mediaType: "image/png" } })), delete: vi.fn() };
    const transfer = adapter(fake, () => legacy);
    const result = await transfer.download({ ownerUid: "owner-1", campaignId, mapId, assetId, sha256: "a".repeat(64), storagePath: `campaigns/${campaignId}/assets/${assetId}` });
    expect(result).toMatchObject({ ok: true, value: { receipt: { location: "cloud-storage" } } });
    expect(legacy.download).toHaveBeenCalledTimes(1);
    expect(fake.deps.getDoc).not.toHaveBeenCalled();
  });

  it("remove referência nova somente depois de executar exclusão individual dos chunks", async () => {
    const fake = fakeFirestore();
    const transfer = adapter(fake);
    const bytes = bytesOf(FIRESTORE_MAP_CHUNK_BYTES + 1);
    const uploaded = await transfer.upload({ ownerUid: "owner-1", campaignId, mapId, assetId, bytes, mediaType: "image/png" });
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) return;

    const result = await transfer.delete(referenceFrom(uploaded.value));
    expect(result).toEqual({ ok: true, value: undefined });
    expect(fake.deleteCalls).toHaveLength(3);
    expect(fake.documents.size).toBe(0);
  });
});

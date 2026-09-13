import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asUuid } from "@domain/contracts/ids";

const { getStorage, ref, uploadBytes, getBytes, getMetadata, deleteObject } = vi.hoisted(() => ({
  getStorage: vi.fn(() => ({ name: "storage" })),
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: vi.fn(),
  getBytes: vi.fn(),
  getMetadata: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("firebase/storage", () => ({
  getStorage,
  ref,
  uploadBytes,
  getBytes,
  getMetadata,
  deleteObject,
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn(() => ({ currentUser: { uid: "owner-1" } })) }));

import { resetStorageClientCacheForTests } from "./storage-client";
import { createFirebaseAssetStorageAdapter, sha256Hex } from "./asset-storage-adapter";

const app = {} as never;
const bytes = new Uint8Array([1, 2, 3, 4]);
const assetId = asUuid("11111111-1111-4111-8111-111111111111");
const base = { ownerUid: "owner-1", assetId, mediaType: "image/png", bytes, originalName: "portrait.png" } as const;
const missing = () => Promise.reject({ code: "storage/object-not-found" });
function errorCode(result: { readonly ok: boolean; readonly error?: { readonly code: string } }): string {
  return result.ok ? "success" : result.error?.code ?? "unknown";
}

describe("FirebaseAssetStorageAdapter", () => {
  beforeEach(() => {
    resetStorageClientCacheForTests();
    getStorage.mockClear(); ref.mockClear(); uploadBytes.mockReset(); getBytes.mockReset(); getMetadata.mockReset(); deleteObject.mockReset();
  });

  afterEach(() => resetStorageClientCacheForTests());

  it("não anuncia nuvem sem app/configuração ou autenticação", async () => {
    const unavailable = createFirebaseAssetStorageAdapter({ app: null, isAuthenticated: () => false });
    expect(unavailable.isAvailable()).toBe(false);
    expect(errorCode(await unavailable.upload(base))).toBe("storage-unavailable");
    expect(getStorage).not.toHaveBeenCalled();
  });

  it("rejeita MIME e tamanho antes de I/O", async () => {
    const adapter = createFirebaseAssetStorageAdapter({ app, isAuthenticated: () => true });
    expect(errorCode(await adapter.upload({ ...base, mediaType: "application/pdf" }))).toBe("validation-error");
    expect(errorCode(await adapter.upload({ ...base, bytes: new Uint8Array(10 * 1024 * 1024 + 1) }))).toBe("quota-exceeded");
    expect(getMetadata).not.toHaveBeenCalled();
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  it("faz upload por assetId e repete sem duplicar bytes", async () => {
    getMetadata.mockImplementationOnce(missing);
    const hash = await sha256Hex(bytes);
    uploadBytes.mockResolvedValue({ metadata: { size: bytes.byteLength, contentType: "image/png" } });
    const adapter = createFirebaseAssetStorageAdapter({ app, isAuthenticated: () => true });
    const first = await adapter.upload(base);
    expect(first).toMatchObject({ ok: true, value: { location: "cloud-storage", sha256: hash, storagePath: `users/owner-1/assets/${assetId}` } });
    expect(uploadBytes).toHaveBeenCalledTimes(1);

    getMetadata.mockResolvedValue({ size: bytes.byteLength, contentType: "image/png", customMetadata: { sha256: hash, ownerUid: "owner-1" } });
    const second = await adapter.upload(base);
    expect(second).toEqual(first);
    expect(uploadBytes).toHaveBeenCalledTimes(1);
  });

  it("usa o mesmo assetId no namespace de campanha", async () => {
    getMetadata.mockImplementationOnce(missing);
    const hash = await sha256Hex(bytes);
    uploadBytes.mockResolvedValue({ metadata: { size: bytes.byteLength, contentType: "image/png" } });
    const adapter = createFirebaseAssetStorageAdapter({ app, isAuthenticated: () => true });
    const result = await adapter.upload({ ...base, campaignId: asUuid("22222222-2222-4222-8222-222222222222") });
    expect(result).toMatchObject({ ok: true, value: { storagePath: `campaigns/22222222-2222-4222-8222-222222222222/assets/${assetId}`, sha256: hash } });
    expect(ref).toHaveBeenCalledWith(expect.anything(), `campaigns/22222222-2222-4222-8222-222222222222/assets/${assetId}`);
  });

  it("conserva erro de indisponibilidade e detecta integridade divergente", async () => {
    getMetadata.mockResolvedValue({ size: bytes.byteLength, contentType: "image/png", customMetadata: { sha256: "0".repeat(64) } });
    const adapter = createFirebaseAssetStorageAdapter({ app, isAuthenticated: () => true });
    const hash = await sha256Hex(bytes);
    const upload = await adapter.upload(base);
    expect(upload).toMatchObject({ ok: false, error: { code: "corrupt-record" } });

    getMetadata.mockResolvedValue({ size: bytes.byteLength, contentType: "image/png", customMetadata: { sha256: hash, ownerUid: "owner-1" } });
    getBytes.mockResolvedValue(new Uint8Array([9, 9, 9]).buffer);
    const download = await adapter.download({ ownerUid: "owner-1", assetId, sha256: hash });
    expect(download).toMatchObject({ ok: false, error: { code: "corrupt-record" } });
  });

  it("traduz falha de rede em erro de armazenamento recuperável", async () => {
    getMetadata.mockImplementationOnce(missing);
    uploadBytes.mockRejectedValue({ code: "storage/network-request-failed" });
    const adapter = createFirebaseAssetStorageAdapter({ app, isAuthenticated: () => true });
    expect(await adapter.upload(base)).toMatchObject({ ok: false, error: { code: "storage-unavailable", cause: "storage/network-request-failed" } });
  });

  it("torna delete idempotente para objeto ausente", async () => {
    deleteObject.mockRejectedValue({ code: "storage/object-not-found" });
    const adapter = createFirebaseAssetStorageAdapter({ app, isAuthenticated: () => true });
    expect((await adapter.delete({ ownerUid: "owner-1", assetId, sha256: "a".repeat(64) })).ok).toBe(true);
  });
});

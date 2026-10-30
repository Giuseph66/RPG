import { describe, expect, it, vi } from "vitest";

const documents = new Map<string, Record<string, unknown>>();
const doc = vi.fn((_firestore: never, ...segments: string[]) => ({ path: segments.join("/") }));
const getDoc = vi.fn(async (reference: { readonly path: string }) => ({
  exists: () => documents.has(reference.path),
  data: () => documents.get(reference.path),
}));
const setDoc = vi.fn(async (reference: { readonly path: string }, value: Record<string, unknown>) => {
  documents.set(reference.path, value);
});

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => doc(...args as [never, ...string[]]),
  getDoc: (...args: unknown[]) => getDoc(...args as [{ readonly path: string }]),
  setDoc: (...args: unknown[]) => setDoc(...args as [{ readonly path: string }, Record<string, unknown>]),
  serverTimestamp: () => "server-time",
}));

import { createFirestorePortraitStore } from "./portrait-store";

const owner = "player-1";
const otherOwner = "player-2";
const id = "portrait-1";
const record = { id, ownerUid: owner, mediaType: "image/webp", sha256: "a".repeat(64), data: "AQID" };

describe("createFirestorePortraitStore", () => {
  it("lê o retrato novo no namespace do dono", async () => {
    documents.clear();
    documents.set(`users/${owner}/portraits/${id}`, record);
    documents.set(`portraits/${id}`, { ...record, ownerUid: otherOwner });
    const store = createFirestorePortraitStore({} as never);

    await expect(store.get(id, undefined, owner)).resolves.toEqual(record);
    expect(getDoc).toHaveBeenCalledWith({ path: `users/${owner}/portraits/${id}` });
  });

  it("faz fallback somente para retrato raiz legado do mesmo dono", async () => {
    documents.clear();
    documents.set(`portraits/${id}`, record);
    const store = createFirestorePortraitStore({} as never);

    await expect(store.get(id, undefined, owner)).resolves.toEqual(record);
    expect(getDoc).toHaveBeenLastCalledWith({ path: `portraits/${id}` });

    documents.set(`portraits/${id}`, { ...record, ownerUid: otherOwner });
    await expect(store.get(id, undefined, owner)).resolves.toBeUndefined();
  });

  it("mantém fallback legado se a leitura scoped for recusada", async () => {
    documents.clear();
    documents.set(`portraits/${id}`, record);
    getDoc.mockClear();
    getDoc.mockImplementationOnce(async () => {
      throw new Error("permission-denied");
    });
    const store = createFirestorePortraitStore({} as never);

    await expect(store.get(id, undefined, owner)).resolves.toEqual(record);
    expect(getDoc).toHaveBeenCalledTimes(2);
  });

  it("grava cópia de campanha no caminho compartilhado, sem misturar namespace privado", async () => {
    documents.clear();
    const store = createFirestorePortraitStore({} as never);

    await store.putCampaignCopy?.({ ...record, campaignId: "campaign-1" });

    expect(setDoc).toHaveBeenLastCalledWith(
      { path: `campaigns/campaign-1/portraits/${id}` },
      expect.objectContaining({ ...record, campaignId: "campaign-1", revision: 1, schemaVersion: 1 }),
    );
  });
});

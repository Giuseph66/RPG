import { describe, expect, it, vi } from "vitest";

import { asAccountId, asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type SyncOperation } from "@domain/contracts/cloud-sync";

import { FirebaseFirestoreSyncAdapter, firestorePathForOperation } from "./firestore-sync-adapter";

const campaignId = asUuid("00000000-0000-4000-8000-000000000001");
const characterId = asUuid("00000000-0000-4000-8000-000000000002");
const sessionId = asUuid("00000000-0000-4000-8000-000000000003");
const timestamp = asIsoTimestamp("2026-09-12T10:00:00.000Z");

function operation(partial: Partial<SyncOperation> = {}): SyncOperation {
  const base = {
    operationId: asCommandId("operation-1"),
    aggregateType: "campaign" as const,
    aggregateId: campaignId,
    mutation: "upsert" as const,
    baseRevision: asRevision(0),
    payload: { id: campaignId, name: "Mesa" },
    status: "pending" as const,
    attempts: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    dedupeKey: "operation-1|campaign|00000000-0000-4000-8000-000000000001|upsert|0",
  } satisfies SyncOperation;
  return { ...base, ...partial };
}

function fakeFirestore(initial: Record<string, Record<string, unknown>> = {}) {
  const documents = new Map(Object.entries(initial));
  const setCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
  const deleteCalls: string[] = [];
  const deps = {
    doc: vi.fn((_firestore: never, path: string) => ({ path }) as never),
    runTransaction: vi.fn(async (_firestore: never, callback: (tx: never) => Promise<unknown>) => callback({
      get: async (reference: { path: string }) => {
        const data = documents.get(reference.path);
        return { exists: () => data !== undefined, data: () => data };
      },
      set: (reference: { path: string }, data: Record<string, unknown>) => {
        documents.set(reference.path, data);
        setCalls.push({ path: reference.path, data });
      },
      delete: (reference: { path: string }) => {
        documents.delete(reference.path);
        deleteCalls.push(reference.path);
      },
    } as never)),
  };
  return { documents, setCalls, deleteCalls, deps };
}

function pathOf(result: ReturnType<typeof firestorePathForOperation>): string {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("firestorePathForOperation", () => {
  it("mapeia os agregados para o modelo remoto do ADR-0007", () => {
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "account", aggregateId: "uid-1" as never })))).toBe("users/uid-1");
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "campaign" })))).toBe(`campaigns/${campaignId}`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "membership", payload: { campaignId, accountId: "uid-2" } })))).toBe(`campaigns/${campaignId}/members/uid-2`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "character", aggregateId: characterId, payload: { campaignId } })))).toBe(`campaigns/${campaignId}/characters/${characterId}`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "journal", payload: { campaignId } })))).toBe(`campaigns/${campaignId}/journals/${campaignId}`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "map", payload: { campaignId } })))).toBe(`campaigns/${campaignId}/maps/${campaignId}`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "session", aggregateId: sessionId, payload: { campaignId, id: sessionId } })))).toBe(`campaigns/${campaignId}/sessions/${sessionId}`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "session", aggregateId: `${campaignId}/${sessionId}` as never, mutation: "delete", scope: { campaignId }, payload: undefined })))).toBe(`campaigns/${campaignId}/sessions/${sessionId}`);
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "asset", aggregateId: characterId })))).toBe(`assets/${characterId}`);
  });

  it("recusa delete escopado sem campanha e não usa o owner autenticado como palpite", () => {
    const result = firestorePathForOperation(operation({ aggregateType: "journal", aggregateId: characterId, mutation: "delete", payload: undefined }), "other-user");
    expect(result).toMatchObject({ ok: false, error: { code: "remote-error" } });
    expect(firestorePathForOperation(operation({ aggregateType: "character", aggregateId: characterId, mutation: "delete", payload: undefined }), "other-user")).toMatchObject({ ok: false });
    expect(pathOf(firestorePathForOperation(operation({ aggregateType: "character", aggregateId: characterId, mutation: "delete", scope: { ownerUid: asAccountId("owner-user") }, payload: undefined }), "other-user"))).toBe(`users/owner-user/characters/${characterId}`);
  });
});

describe("FirebaseFirestoreSyncAdapter", () => {
  it("faz upsert com CAS, ownerUid e revisão seguinte", async () => {
    const fake = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({
      firestore: {} as never,
      ownerUid: "master-1",
      deps: fake.deps as never,
    });

    const result = await adapter.apply(operation());

    expect(result).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 1 as Revision } });
    expect(fake.setCalls).toHaveLength(1);
    expect(fake.setCalls[0]).toMatchObject({
      path: `campaigns/${campaignId}`,
      data: { ownerUid: "master-1", operationId: "operation-1", revision: 1 },
    });
  });

  it("persiste vínculo com campanha, conta, papel e ator preservados", async () => {
    const fake = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      operationId: asCommandId("membership-owner"),
      aggregateType: "membership",
      aggregateId: "campaign:master-1" as never,
      payload: { campaignId, accountId: "master-1", role: "master", status: "active", invitedBy: "master-1", revision: 0 },
    }));

    expect(result).toMatchObject({ ok: true, value: { kind: "acked", remoteRevision: 0 } });
    expect(fake.setCalls[0]).toMatchObject({
      path: `campaigns/${campaignId}/members/master-1`,
      data: { campaignId, accountId: "master-1", role: "master", status: "active", invitedBy: "master-1", ownerUid: "master-1", operationId: "membership-owner", revision: 0 },
    });
  });

  it("mantém o dono da campanha quando o jogador aceita o próprio convite", async () => {
    const path = `campaigns/${campaignId}/members/player-1`;
    const fake = fakeFirestore({ [path]: {
      campaignId, accountId: "player-1", role: "player", status: "invited", invitedBy: "master-1",
      ownerUid: "master-1", revision: 0,
    } });
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "player-1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      operationId: asCommandId("membership-accept"),
      aggregateType: "membership",
      aggregateId: "campaign:player-1" as never,
      baseRevision: asRevision(0),
      payload: { campaignId, accountId: "player-1", role: "player", status: "active", invitedBy: "master-1", revision: 1 },
    }));

    expect(result).toMatchObject({ ok: true, value: { kind: "acked", remoteRevision: 1 } });
    expect(fake.setCalls[0]).toMatchObject({ data: { ownerUid: "master-1", status: "active", revision: 1 } });
  });

  it("retorna snapshot e motivo no conflito sem escrever", async () => {
    const fake = fakeFirestore({ [`campaigns/${campaignId}`]: { revision: 2, name: "Remota" } });
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never });

    const result = await adapter.apply(operation());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("conflict");
      if (result.value.kind === "conflict") {
        expect(result.value.conflict.remoteRevision).toBe(2);
        expect(result.value.conflict.remoteSnapshot).toEqual({ revision: 2, name: "Remota" });
        expect(result.value.conflict.message).toContain("não corresponde");
      }
    }
    expect(fake.setCalls).toHaveLength(0);
  });

  it("persiste metadata privada de asset conforme Firestore e Storage rules", async () => {
    const fake = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "u1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      aggregateType: "asset",
      aggregateId: characterId,
      payload: {
        id: characterId, mediaType: "image/png", sha256: "a".repeat(64), size: 3,
        bytes: [1, 2, 3], encoded: "secret",
      },
    }));

    expect(result.ok).toBe(true);
    expect(fake.setCalls[0]?.data).not.toHaveProperty("bytes");
    expect(fake.setCalls[0]?.data).not.toHaveProperty("encoded");
    expect(fake.setCalls[0]?.data).toMatchObject({
      id: characterId,
      ownerUid: "u1",
      hash: "a".repeat(64),
      sha256: "a".repeat(64),
      contentType: "image/png",
      mediaType: "image/png",
      size: 3,
      storagePath: `users/u1/assets/${characterId}`,
      schemaVersion: 1,
    });
    expect(fake.setCalls[0]?.data).not.toHaveProperty("campaignId");
  });

  it("preserva campaignId e deriva caminho de asset compartilhado", async () => {
    const fake = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      aggregateType: "asset",
      aggregateId: characterId,
      scope: { campaignId },
      payload: { id: characterId, mediaType: "image/webp", hash: "b".repeat(64), size: 42 },
    }));

    expect(result.ok).toBe(true);
    expect(fake.setCalls[0]?.data).toMatchObject({
      id: characterId,
      campaignId,
      ownerUid: "master-1",
      hash: "b".repeat(64),
      sha256: "b".repeat(64),
      contentType: "image/webp",
      storagePath: `campaigns/${campaignId}/assets/${characterId}`,
      size: 42,
    });
  });

  it("exclui documento com CAS e reconhece reenvio de uma operação já aplicada", async () => {
    const path = `campaigns/${campaignId}`;
    const fake = fakeFirestore({ [path]: { revision: 1, operationId: "operation-1" } });
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "u1", deps: fake.deps as never });
    const resent = await adapter.apply(operation({ baseRevision: asRevision(0) }));
    expect(resent).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 1 } });
    expect(fake.setCalls).toHaveLength(0);

    const deleteResult = await adapter.apply(operation({ operationId: asCommandId("delete-1"), mutation: "delete", baseRevision: asRevision(1), scope: { campaignId }, payload: undefined }));
    expect(deleteResult).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 1 } });
    expect(fake.deleteCalls).toEqual([path]);
  });

  it("grava sessão no escopo da campanha e preserva attendance no replay", async () => {
    const fake = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      operationId: asCommandId("session-upsert"),
      aggregateType: "session",
      aggregateId: `${campaignId}/${sessionId}` as never,
      payload: { id: sessionId, campaignId, schemaVersion: 1, revision: 1, attendance: [{ characterId, playerId: "player-1", present: true }] },
    }));

    expect(result).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 1 as Revision } });
    expect(fake.setCalls[0]).toMatchObject({
      path: `campaigns/${campaignId}/sessions/${sessionId}`,
      data: { id: sessionId, campaignId, attendance: [{ characterId, playerId: "player-1", present: true }], ownerUid: "master-1", operationId: "session-upsert", revision: 1 },
    });
  });

  it("reconhece replay de delete depois que o documento remoto já sumiu", async () => {
    const fake = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      operationId: asCommandId("session-delete-replay"),
      aggregateType: "session",
      aggregateId: `${campaignId}/${sessionId}` as never,
      mutation: "delete",
      baseRevision: asRevision(2),
      scope: { campaignId },
      payload: undefined,
    }));

    expect(result).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 0 as Revision } });
    expect(fake.deleteCalls).toHaveLength(0);
  });

  it("executa limpeza por manifesto em ordem e deixa a raiz por último", async () => {
    const cleanupAssetId = asUuid("33333333-3333-4333-8333-333333333333");
    const assetPath = `assets/${cleanupAssetId}`;
    const rootPath = `campaigns/${campaignId}`;
    const fake = fakeFirestore({
      [rootPath]: { revision: 2, name: "Mesa" },
      [`campaigns/${campaignId}/members/player-1`]: { campaignId },
      [`campaigns/${campaignId}/journals/${characterId}`]: { campaignId },
      [assetPath]: { campaignId, storagePath: `campaigns/${campaignId}/assets/${cleanupAssetId}` },
    });
    const storageDeletes: string[] = [];
    const adapter = new FirebaseFirestoreSyncAdapter({
      firestore: {} as never,
      ownerUid: "master-1",
      deps: fake.deps as never,
      assetStorage: {
        isAvailable: () => true,
        upload: async () => ({ ok: false, error: {} } as never),
        download: async () => ({ ok: false, error: {} } as never),
        delete: async (reference) => { storageDeletes.push(reference.storagePath ?? ""); return { ok: true, value: undefined }; },
      },
    });
    const result = await adapter.apply(operation({
      operationId: asCommandId("cleanup-1"),
      aggregateType: "campaign-cleanup",
      mutation: "upsert",
      baseRevision: asRevision(2),
      payload: {
        schemaVersion: 1, campaignId, campaignRevision: 2,
        memberAccountIds: ["player-1"], characterIds: [], journalIds: [characterId], mapIds: [], sessionIds: [],
        assets: [{ assetId: cleanupAssetId, ownerUid: "master-1", campaignId, firestorePath: assetPath, storagePath: `campaigns/${campaignId}/assets/${cleanupAssetId}`, sha256: "a".repeat(64) }],
      },
    }));

    expect(result).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 2 } });
    expect(fake.deleteCalls).toEqual([
      `campaigns/${campaignId}/members/player-1`,
      `campaigns/${campaignId}/journals/${characterId}`,
      assetPath,
      rootPath,
    ]);
    expect(storageDeletes).toEqual([`campaigns/${campaignId}/assets/${cleanupAssetId}`]);
    expect(fake.documents.size).toBe(0);
  });

  it("retoma após falha de bytes sem apagar a raiz antes da conclusão", async () => {
    const cleanupAssetId = asUuid("44444444-4444-4444-8444-444444444444");
    const rootPath = `campaigns/${campaignId}`;
    const fake = fakeFirestore({
      [rootPath]: { revision: 1 },
      [`assets/${cleanupAssetId}`]: { campaignId, storagePath: `campaigns/${campaignId}/assets/${cleanupAssetId}` },
    });
    let attempts = 0;
    const storage = {
      isAvailable: () => true,
      upload: async () => ({ ok: false, error: {} } as never),
      download: async () => ({ ok: false, error: {} } as never),
      delete: async () => {
        attempts += 1;
        return attempts === 1
          ? { ok: false, error: { code: "storage-unavailable", message: "offline" } } as never
          : { ok: true, value: undefined } as const;
      },
    };
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never, assetStorage: storage });
    const payload = {
      schemaVersion: 1, campaignId, campaignRevision: 1,
      memberAccountIds: [], characterIds: [], journalIds: [], mapIds: [], sessionIds: [],
      assets: [{ assetId: cleanupAssetId, ownerUid: "master-1", campaignId, firestorePath: `assets/${cleanupAssetId}`, storagePath: `campaigns/${campaignId}/assets/${cleanupAssetId}`, sha256: "b".repeat(64) }],
    };
    const first = await adapter.apply(operation({ operationId: asCommandId("cleanup-retry"), aggregateType: "campaign-cleanup", baseRevision: asRevision(1), payload }));
    expect(first).toMatchObject({ ok: false, error: { retryable: true } });
    expect(fake.documents.has(rootPath)).toBe(true);
    const second = await adapter.apply(operation({ operationId: asCommandId("cleanup-retry"), aggregateType: "campaign-cleanup", baseRevision: asRevision(1), payload }));
    expect(second).toEqual({ ok: true, value: { kind: "acked", remoteRevision: 1 } });
    expect(fake.documents.has(rootPath)).toBe(false);
  });

  it("recusa manifesto que tente cruzar campanhas", async () => {
    const fake = fakeFirestore();
    const otherCampaign = asUuid("99999999-9999-4999-8999-999999999999");
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "master-1", deps: fake.deps as never });
    const result = await adapter.apply(operation({
      operationId: asCommandId("cleanup-cross-campaign"), aggregateType: "campaign-cleanup", baseRevision: asRevision(0),
      payload: {
        schemaVersion: 1, campaignId, campaignRevision: 0,
        memberAccountIds: [], characterIds: [], journalIds: [], mapIds: [], sessionIds: [],
        assets: [{ assetId: characterId, ownerUid: "master-1", campaignId: otherCampaign, firestorePath: `assets/${characterId}`, storagePath: `campaigns/${otherCampaign}/assets/${characterId}`, sha256: "c".repeat(64) }],
      },
    }));
    expect(result).toMatchObject({ ok: false, error: { retryable: false } });
    expect(fake.deps.runTransaction).not.toHaveBeenCalled();
  });

  it("não chama Firestore quando Firebase está indisponível e classifica rede como retryable", async () => {
    const unavailable = fakeFirestore();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: null, ownerUid: "u1", deps: unavailable.deps as never });
    expect(adapter.isAvailable()).toBe(false);
    expect((await adapter.apply(operation())).ok).toBe(false);
    expect(unavailable.deps.runTransaction).not.toHaveBeenCalled();

    const network = fakeFirestore();
    network.deps.runTransaction.mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "unavailable" }));
    const onlineAdapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "u1", deps: network.deps as never });
    const result = await onlineAdapter.apply(operation());
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: "remote-network", retryable: true }) });
  });
});

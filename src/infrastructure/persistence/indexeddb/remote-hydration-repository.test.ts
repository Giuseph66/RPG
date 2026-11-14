import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoTimestamp, asCommandId } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { openDatabase } from "./open-database";
import { IndexedDbRemoteHydrationRepository } from "./remote-hydration-repository";
import { STORE_NAMES } from "./schema";
import { type RemoteSyncPullResult } from "@application/ports/remote-sync-adapter";
import { type SyncOperation } from "@domain/contracts/cloud-sync";

const clock = { now: () => asIsoTimestamp("2026-09-12T12:00:00.000Z") };
let sequence = 0;

async function openTestDb(): Promise<IDBDatabase> {
  const result = await openDatabase({ name: `rpg-remote-pull-${sequence++}` });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function pull(revision = 1): RemoteSyncPullResult {
  return { records: [
    { aggregateType: "membership", aggregateId: "c1:player", scope: { campaignId: "c1" as never, accountId: "player" as never }, revision: asRevision(1), payload: { id: "player", campaignId: "c1", accountId: "player", role: "player", status: "active", revision: 1, createdAt: clock.now(), updatedAt: clock.now() } },
    { aggregateType: "campaign", aggregateId: "c1", revision: asRevision(revision), payload: { id: "c1", schemaVersion: 1, revision, name: revision === 1 ? "Remota" : "Remota nova", description: "", rulesetRef: { id: "phb", version: "1" }, characterIds: [], sessionCounter: 0, npcs: [], quests: [], objectives: [], settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" }, createdAt: clock.now(), updatedAt: clock.now() } },
  ] };
}

function operation(): SyncOperation {
  return {
    operationId: asCommandId("local-operation"), aggregateType: "campaign", aggregateId: "c1" as never,
    mutation: "upsert", baseRevision: asRevision(0), payload: { id: "c1" }, status: "pending", attempts: 0,
    createdAt: clock.now(), updatedAt: clock.now(), dedupeKey: "local-operation|campaign|c1|upsert|0",
  };
}

function accountOperation(): SyncOperation {
  return {
    ...operation(),
    operationId: asCommandId("local-account-operation"),
    aggregateType: "account",
    aggregateId: "player" as never,
    payload: { id: "player", uid: "player", email: "local@example.invalid", displayName: "Local", revision: 0, schemaVersion: 1, createdAt: clock.now(), updatedAt: clock.now() },
    dedupeKey: "local-account-operation|account|player|upsert|0",
  };
}

describe("IndexedDbRemoteHydrationRepository", () => {
  let db: IDBDatabase;
  beforeEach(async () => { db = await openTestDb(); });

  it("hidrata membro e campanha, e reprocessamento vira skip idempotente", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const first = await repository.hydrate({ ownerUid: "player", pull: pull(), pending: [], clock });
    expect(first).toEqual({ ok: true, value: { received: 2, applied: 2, skipped: 0, conflicts: [], touched: ["membership:c1:player", "campaign:c1"] } });
    const second = await repository.hydrate({ ownerUid: "player", pull: pull(), pending: [], clock });
    expect(second).toEqual({ ok: true, value: { received: 2, applied: 0, skipped: 2, conflicts: [] } });
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.campaigns], "readonly").objectStore(STORE_NAMES.campaigns).get("c1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(raw).toMatchObject({ name: "Remota", revision: 1 });
  });

  it("preserva operação local pendente e reporta conflito explícito", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const result = await repository.hydrate({ ownerUid: "player", pull: pull(), pending: [operation()], clock });
    expect(result).toMatchObject({ ok: true, value: { applied: 1, skipped: 1 } });
    if (result.ok) expect(result.value.conflicts).toEqual([expect.objectContaining({ aggregateType: "campaign", aggregateId: "c1", remoteRevision: 1 })]);
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.campaigns], "readonly").objectStore(STORE_NAMES.campaigns).get("c1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(raw).toBeUndefined();
  });

  it("hidrata perfil remoto existente durante bootstrap concorrente", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const account = {
      aggregateType: "account" as const,
      aggregateId: "player",
      revision: asRevision(2),
      payload: { id: "player", uid: "player", email: "remota@example.invalid", displayName: "Remota", revision: 2, schemaVersion: 1, createdAt: clock.now(), updatedAt: clock.now() },
    };
    const result = await repository.hydrate({ ownerUid: "player", pull: { ...pull(), records: [...pull().records, account] }, pending: [accountOperation()], clock });

    expect(result).toMatchObject({ ok: true, value: { received: 3, applied: 3, skipped: 0, conflicts: [] } });
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.accounts], "readonly").objectStore(STORE_NAMES.accounts).get("player");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(raw).toMatchObject({ email: "remota@example.invalid", displayName: "Remota", revision: 2 });
  });

  it("em campanha de jogador, remove o que o mestre deixou de mostrar e preserva o que é da própria conta", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const put = (store: string, value: unknown) => new Promise<void>((resolve, reject) => {
      const request = db.transaction([store], "readwrite").objectStore(store).put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const keys = (store: string) => new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction([store], "readonly").objectStore(store).getAllKeys();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error);
    });
    await put(STORE_NAMES.maps, { id: "hidden-map", campaignId: "c1", assetId: "a1", pins: [], revision: 1 });
    await put(STORE_NAMES.journalEntries, { id: "master-note", campaignId: "c1", title: "Plano", body: "", linkedEntityIds: [], tags: [], authorId: "master", createdAt: clock.now(), updatedAt: clock.now() });
    await put(STORE_NAMES.journalEntries, { id: "own-note", campaignId: "c1", title: "Minha", body: "", linkedEntityIds: [], tags: [], authorId: "player", createdAt: clock.now(), updatedAt: clock.now() });
    await put(STORE_NAMES.sightings, { id: "k1__player", campaignId: "c1", creatureId: "k1", accountId: "player", schemaVersion: 1, revision: 1, revealed: {}, createdAt: clock.now(), updatedAt: clock.now() });
    const sighting = { id: "k2__player", campaignId: "c1", creatureId: "k2", accountId: "player", schemaVersion: 1, revision: 1, kind: "animal", revealed: { appearance: "Penas" }, createdAt: clock.now(), updatedAt: clock.now() };
    const result = await repository.hydrate({ ownerUid: "player", pull: { ...pull(), records: [...pull().records, { aggregateType: "sighting", aggregateId: "k2__player", scope: { campaignId: "c1" as never }, revision: asRevision(1), payload: sighting }], visibleCampaigns: [{ campaignId: "c1", role: "player" }] }, pending: [], clock });
    expect(result.ok).toBe(true);
    expect(await keys(STORE_NAMES.maps)).toEqual([]);
    expect(await keys(STORE_NAMES.journalEntries)).toEqual(["own-note"]);
    expect(await keys(STORE_NAMES.sightings)).toEqual(["k2__player"]);
  });

  it("hidrata propostas próprias e reconcilia as que deixaram de estar visíveis sem perder envio pendente", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const proposal = (id: string, proposedBy: string) => ({
      id,
      campaignId: "c1",
      schemaVersion: 1,
      revision: 0,
      proposedBy,
      ownerUid: proposedBy,
      status: "pending",
      statBlock: {
        id: `creature-${id}`,
        name: "Corça",
        creatureType: "beast",
        size: "medium",
        armorClass: 10,
        hitPoints: { average: 1, hitDice: "1d4" },
        speeds: { walkCm: 300 },
        abilityScores: { str: 10, dex: 10, con: 10, int: 2, wis: 10, cha: 6 },
        challengeRating: null,
        sourceRefs: [],
      },
      suggestionReasons: ["Proposta de teste"],
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const pendingDraft = proposal("proposal__pending-local", "player");
    const obsoleteOtherAuthor = proposal("proposal__obsolete-other", "master");
    const remoteDraft = proposal("proposal__remote-own", "player");
    const put = (value: unknown) => new Promise<void>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.proposals], "readwrite").objectStore(STORE_NAMES.proposals).put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const readAll = () => new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.proposals], "readonly").objectStore(STORE_NAMES.proposals).getAll();
      request.onsuccess = () => resolve(request.result as Record<string, unknown>[]);
      request.onerror = () => reject(request.error);
    });
    await put(pendingDraft);
    await put(obsoleteOtherAuthor);
    const remoteRecord = {
      aggregateType: "proposal" as const,
      aggregateId: remoteDraft.id,
      scope: { campaignId: "c1" as never },
      revision: asRevision(0),
      payload: remoteDraft,
    };
    const pendingOperation: SyncOperation = {
      ...operation(),
      operationId: asCommandId("local-proposal-pending"),
      aggregateType: "proposal",
      aggregateId: pendingDraft.id as never,
      scope: { campaignId: "c1" as never },
      payload: pendingDraft,
      dedupeKey: "local-proposal-pending|proposal|proposal__pending-local|upsert|0|c1",
    };

    const result = await repository.hydrate({
      ownerUid: "player",
      pull: {
        ...pull(),
        records: [...pull().records, remoteRecord],
        visibleCampaigns: [{ campaignId: "c1", role: "player", types: ["proposal"] }],
      },
      pending: [pendingOperation],
      clock,
    });
    expect(result).toMatchObject({ ok: true, value: { applied: 4 } });
    expect((await readAll()).map((item) => item.id).sort()).toEqual(["proposal__pending-local", "proposal__remote-own"]);
    expect(await readAll()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: remoteDraft.id, proposedBy: "player", ownerUid: "player" }),
      expect.objectContaining({ id: pendingDraft.id, proposedBy: "player" }),
    ]));
  });

  it("reconcilia só os tipos confirmados e ignora snapshot malformado sem travar o resto", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const put = (store: string, value: unknown) => new Promise<void>((resolve, reject) => {
      const request = db.transaction([store], "readwrite").objectStore(store).put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const keys = (store: string) => new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction([store], "readonly").objectStore(store).getAllKeys();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error);
    });
    await put(STORE_NAMES.maps, { id: "kept-map", campaignId: "c1", assetId: "a1", pins: [], revision: 1 });
    await put(STORE_NAMES.sightings, { id: "k1__player", campaignId: "c1", creatureId: "k1", accountId: "player", schemaVersion: 1, revision: 1, revealed: {}, createdAt: clock.now(), updatedAt: clock.now() });
    const broken = { aggregateType: "journal" as const, aggregateId: "broken", scope: { campaignId: "c1" as never }, revision: asRevision(1), payload: { id: "broken", campaignId: "c1" } };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await repository.hydrate({ ownerUid: "player", pull: { records: [...pull().records, broken], visibleCampaigns: [{ campaignId: "c1", role: "player", types: ["sighting"] }] }, pending: [], clock });
    warn.mockRestore();
    expect(result.ok).toBe(true);
    expect(await keys(STORE_NAMES.sightings)).toEqual([]);
    expect(await keys(STORE_NAMES.maps)).toEqual(["kept-map"]);
  });

  it("uma exclusão local recente vence uma leitura remota atrasada (a ficha não ressuscita)", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const deleteOp = { ...operation(), operationId: asCommandId("local-delete"), aggregateType: "character" as const, aggregateId: "ficha-1" as never, mutation: "delete" as const, payload: undefined, scope: { ownerUid: "player" as never }, status: "acked" as const, dedupeKey: "local-delete|character|ficha-1|delete|1|::player" };
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.outbox], "readwrite").objectStore(STORE_NAMES.outbox).put(deleteOp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const stale = { aggregateType: "character" as const, aggregateId: "ficha-1", scope: { ownerUid: "player" as never }, revision: asRevision(2), payload: { id: "ficha-1", schemaVersion: 1, revision: 2, name: "Excluída", createdAt: clock.now(), updatedAt: clock.now() } };
    const result = await repository.hydrate({ ownerUid: "player", pull: { records: [stale] }, pending: [], clock });
    expect(result).toMatchObject({ ok: true, value: { applied: 0, skipped: 1 } });
    const stored = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.characters], "readonly").objectStore(STORE_NAMES.characters).get("ficha-1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(stored).toBeUndefined();
  });

  it("ficha que sumiu da campanha remota: a própria perde o vínculo, a de outra conta sai", async () => {
    const repository = new IndexedDbRemoteHydrationRepository(db);
    const put = (value: unknown) => new Promise<void>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.characters], "readwrite").objectStore(STORE_NAMES.characters).put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const all = () => new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = db.transaction([STORE_NAMES.characters], "readonly").objectStore(STORE_NAMES.characters).getAll();
      request.onsuccess = () => resolve(request.result as Record<string, unknown>[]);
      request.onerror = () => reject(request.error);
    });
    const sheet = (id: string, ownerUid: string, campaignId: string | undefined = "c1", revision = 3) => ({ id, ownerUid, ...(campaignId === undefined ? {} : { campaignId }), schemaVersion: 1, revision, createdAt: clock.now(), updatedAt: clock.now() });
    await put(sheet("own", "player"));
    await put(sheet("other", "someone"));
    await put(sheet("kept", "someone"));
    // A cópia privada antiga não segura o vínculo; só a coleção da campanha conta.
    const records = [...pull().records,
      { aggregateType: "character" as const, aggregateId: "own", scope: { ownerUid: "player" as never }, revision: asRevision(1), payload: sheet("own", "player", undefined, 1) },
      { aggregateType: "character" as const, aggregateId: "kept", scope: { campaignId: "c1" as never }, revision: asRevision(3), payload: sheet("kept", "someone") }];

    const partial = await repository.hydrate({ ownerUid: "player", pull: { records, visibleCampaigns: [{ campaignId: "c1", role: "player", types: ["map"] }] }, pending: [], clock });
    expect(partial.ok).toBe(true);
    expect((await all()).map((item) => item.id).sort()).toEqual(["kept", "other", "own"]);

    const result = await repository.hydrate({ ownerUid: "player", pull: { records, visibleCampaigns: [{ campaignId: "c1", role: "player" }] }, pending: [], clock });
    expect(result.ok).toBe(true);
    const stored = await all();
    expect(stored.map((item) => item.id).sort()).toEqual(["kept", "own"]);
    expect(stored.find((item) => item.id === "own")).not.toHaveProperty("campaignId");
    expect(stored.find((item) => item.id === "kept")).toMatchObject({ campaignId: "c1" });
  });
});

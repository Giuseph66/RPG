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
});

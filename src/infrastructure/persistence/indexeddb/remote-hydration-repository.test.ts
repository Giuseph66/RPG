import { beforeEach, describe, expect, it } from "vitest";

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
    expect(first).toEqual({ ok: true, value: { received: 2, applied: 2, skipped: 0, conflicts: [] } });
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
});

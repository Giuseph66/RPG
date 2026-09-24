import { beforeEach, describe, expect, it } from "vitest";

import { asAccountId, asCommandId, asIsoTimestamp, asUuid, type AccountId } from "@domain/contracts/ids";
import { appError, err, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";
import { createSyncOutboxService, type SyncOutboxService } from "@application/sync";
import { IndexedDbOutboxRepository } from "@infrastructure/persistence/indexeddb/outbox-repository";
import { IndexedDbSessionRepository } from "@infrastructure/persistence/indexeddb/session-repository";
import { IndexedDbUnitOfWork } from "@infrastructure/persistence/indexeddb/unit-of-work";
import { openDatabase } from "@infrastructure/persistence/indexeddb/open-database";

import { createSessionService } from "./service";

const now = asIsoTimestamp("2026-09-12T15:30:00.000Z");
const master = asAccountId("master-1");
const player = asAccountId("player-1");
const campaignId = asUuid("10000000-0000-4000-8000-000000000001");
const characterId = asUuid("20000000-0000-4000-8000-000000000001");
let sequence = 0;

const clock = { now: () => now };
const authorization = {
  getCampaignRole: async (_campaign: typeof campaignId, account: AccountId) => account === master ? { ok: true as const, value: "master" as const } : { ok: true as const, value: "player" as const },
};
const ids = {
  uuid: () => asUuid(`30000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`),
  commandId: () => asCommandId(`session-command-${++sequence}`),
};

async function db(): Promise<IDBDatabase> {
  const result = await openDatabase({ name: `rpg-session-${sequence++}` });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("SessionService", () => {
  let database: IDBDatabase;

  beforeEach(async () => { database = await db(); });

  it("cria, inicia, encerra e salva presença offline com snapshots pending", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const outbox = new IndexedDbOutboxRepository(database, clock);
    const service = createSessionService({
      repository, authorization, clock, idGenerator: ids,
      unitOfWork: new IndexedDbUnitOfWork(database), syncOutbox: createSyncOutboxService(outbox),
    });
    const created = await service.create({ campaignId, accountId: master, number: 1, title: "A entrada", attendance: [{ characterId, playerId: player, present: true }] });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.status).toBe("planned");
    const started = await service.start(created.value.id, master);
    expect(started.ok && started.value.status).toBe("active");
    const ended = await service.end(created.value.id, master, "Resumo final");
    expect(ended.ok && ended.value.status).toBe("ended");
    expect(unwrap(await service.list(campaignId))).toHaveLength(1);
    const pending = unwrap(await outbox.listPending());
    expect(pending.length).toBe(3);
    expect(pending.at(-1)).toMatchObject({ aggregateType: "session", mutation: "upsert", baseRevision: 2 });
    expect(pending.at(-1)?.aggregateId).toBe(`${campaignId}/${created.value.id}`);
    expect(pending.at(-1)?.payload).toMatchObject({ summary: "Resumo final", status: "ended" });
  });

  it("rejeita jogador antes de qualquer escrita local", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const service = createSessionService({ repository, authorization, clock, idGenerator: ids });
    const result = await service.create({ campaignId, accountId: player, number: 1 });
    expect(result).toMatchObject({ ok: false, error: { code: "membership-forbidden" } });
    expect(unwrap(await service.list(campaignId))).toHaveLength(0);
  });

  it("persiste a ordem da iniciativa apenas por ação do mestre", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const service = createSessionService({ repository, authorization, clock, idGenerator: ids });
    const created = unwrap(await service.create({ campaignId, accountId: master, number: 2 }));
    unwrap(await service.start(created.id, master));
    const npcId = asUuid("40000000-0000-4000-8000-000000000001");
    const encounter = {
      round: 2,
      activeCombatantKey: "character:" + characterId,
      combatants: [
        { entityType: "character" as const, entityId: characterId, initiative: 14 },
        { entityType: "npc" as const, entityId: npcId, initiative: 11 },
      ],
    };
    const updated = await service.setEncounter(created.id, master, encounter);
    expect(updated.ok && updated.value.encounter).toEqual(encounter);
    expect(await service.setEncounter(created.id, player, undefined)).toMatchObject({ ok: false, error: { code: "membership-forbidden" } });
    expect(unwrap(await service.get(created.id)).encounter).toEqual(encounter);
  });

  it("rejeita participantes repetidos na ordem do encontro", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const service = createSessionService({ repository, authorization, clock, idGenerator: ids });
    const created = unwrap(await service.create({ campaignId, accountId: master, number: 3 }));
    const duplicated = { round: 1, combatants: [
      { entityType: "character" as const, entityId: characterId, initiative: 12 },
      { entityType: "character" as const, entityId: characterId, initiative: 8 },
    ] };
    expect(await service.setEncounter(created.id, master, duplicated)).toMatchObject({ ok: false, error: { code: "validation-error", field: "encounter" } });
  });

  it("materializa o dono local ao criar sessão de campanha recém-criada", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const local = asAccountId("local-device-1");
    let ownerCalls = 0;
    const service = createSessionService({
      repository,
      authorization: { getCampaignRole: async () => ({ ok: true as const, value: "master" as const }) },
      clock,
      idGenerator: ids,
      localIdentity: { source: "local", accountId: local, email: null, displayName: "Jogador local" },
      ensureLocalOwner: async () => { ownerCalls += 1; return { ok: true as const, value: {} }; },
    });
    const result = await service.create({ campaignId, accountId: local, number: 1 });
    expect(result.ok).toBe(true);
    expect(ownerCalls).toBe(1);
  });

  it("aborta sessão e outbox quando o enqueue falha", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const failing: SyncOutboxService = { enqueue: async () => err(appError.storageUnavailable("outbox indisponível")) };
    const service = createSessionService({ repository, authorization, clock, idGenerator: ids, unitOfWork: new IndexedDbUnitOfWork(database), syncOutbox: failing });
    const result = await service.create({ campaignId, accountId: master, number: 1 });
    expect(result.ok).toBe(false);
    expect(unwrap(await service.list(campaignId))).toHaveLength(0);
  });

  it("protege replay por CAS e mantém fila local sem confirmação remota", async () => {
    const repository = new IndexedDbSessionRepository(database, clock);
    const outboxRepository = new IndexedDbOutboxRepository(database, clock);
    const service = createSessionService({ repository, authorization, clock, idGenerator: ids, syncOutbox: createSyncOutboxService(outboxRepository), unitOfWork: new IndexedDbUnitOfWork(database) });
    const created = unwrap(await service.create({ campaignId, accountId: master, number: 1 }));
    const stale = await repository.save({ ...created, title: "replay" }, asRevision(0));
    expect(stale).toMatchObject({ ok: false, error: { code: "conflict", expectedRevision: 0, actualRevision: 1 } });
    expect(unwrap(await outboxRepository.listPending())).toHaveLength(1);
  });
});

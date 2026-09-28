import { describe, expect, it } from "vitest";

import { setRevealField, setRevealPresence, type CreatureContent } from "@domain/campaign/creatures";
import { appError, err, ok } from "@domain/contracts/errors";
import { asAccountId, asCommandId, asIsoTimestamp, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type JourneyVisibilityKind, type JourneyVisibilityRepository } from "@application/ports/journey-visibility-repository";
import { type NewSyncOperation, type SyncOutboxService } from "@application/sync";

import { createCreatureService } from "./creature-service";

const campaignId = asUuid("00000000-0000-4000-8000-00000000ca01");
const tester = asAccountId("player-teste");
const ana = asAccountId("player-ana");
const content: CreatureContent = { kind: "enemy", name: "Lobo atroz", appearance: "Vulto entre as árvores", race: "Lobo", description: "", hitPoints: "37", armorClass: "14", abilities: "", notes: "Serve à bruxa" };

function memoryRepository(): JourneyVisibilityRepository & { readonly stores: Record<JourneyVisibilityKind, Map<string, { id: string; campaignId: string; revision: number }>> } {
  const stores = { creature: new Map(), sighting: new Map(), guess: new Map() } as Record<JourneyVisibilityKind, Map<string, { id: string; campaignId: string; revision: number }>>;
  return {
    stores,
    async list(kind, id) { return ok([...stores[kind].values()].filter((item) => item.campaignId === id) as never); },
    async get(kind, id) { return ok(stores[kind].get(id) as never); },
    async save(kind, record, expected) {
      const current = stores[kind].get(record.id)?.revision ?? 0;
      if (current !== expected) return err(appError.conflict(expected, asRevision(current)));
      const next = { ...record, revision: asRevision(expected + 1) };
      stores[kind].set(record.id, next);
      return ok(next as never);
    },
    async delete(kind, id, expected) {
      const current = stores[kind].get(id)?.revision ?? 0;
      if (current !== expected) return err(appError.conflict(expected, asRevision(current)));
      stores[kind].delete(id);
      return ok(undefined);
    },
  };
}

function setup() {
  const repository = memoryRepository();
  const queued: NewSyncOperation[] = [];
  const outbox: SyncOutboxService = { async enqueue(operation) { queued.push(operation); return ok(operation as never); } };
  let sequence = 0;
  const service = createCreatureService({
    repository,
    syncOutbox: outbox,
    clock: { now: () => asIsoTimestamp("2026-09-28T12:00:00.000Z") },
    idGenerator: { uuid: () => asUuid(`00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) as Uuid, commandId: () => asCommandId(`cmd-${++sequence}`) },
  });
  return { repository, queued, service };
}

describe("CreatureService", () => {
  it("cria a criatura oculta e só envia o registro privado", async () => {
    const { service, queued, repository } = setup();
    const created = await service.create(campaignId, content);
    expect(created.ok).toBe(true);
    expect(repository.stores.sighting.size).toBe(0);
    expect(queued.map((item) => item.aggregateType)).toEqual(["creature"]);
    expect(queued[0]!.scope).toEqual({ campaignId });
  });

  it("gera uma projeção por jogador com apenas os campos revelados", async () => {
    const { service, queued } = setup();
    const created = await service.create(campaignId, content);
    if (!created.ok) throw new Error(created.error.message);
    const revealed = setRevealField(setRevealPresence(created.value, [tester, ana], true), [tester], "appearance", true);
    const saved = await service.save(revealed);
    expect(saved.ok).toBe(true);
    const sightings = await service.listSightings(campaignId);
    if (!sightings.ok) throw new Error(sightings.error.message);
    expect(sightings.value.map((item) => [item.accountId, item.revealed])).toEqual(expect.arrayContaining([[tester, { appearance: "Vulto entre as árvores" }], [ana, {}]]));
    const payloads = queued.filter((item) => item.aggregateType === "sighting").map((item) => JSON.stringify(item.payload));
    expect(payloads).toHaveLength(2);
    expect(payloads.join("")).not.toContain("bruxa");
    expect(payloads.join("")).not.toContain("37");
  });

  it("remove a projeção de quem deixou de ver e não reenvia projeções sem mudança", async () => {
    const { service, queued } = setup();
    const created = await service.create(campaignId, content);
    if (!created.ok) throw new Error(created.error.message);
    const first = await service.save(setRevealPresence(created.value, [tester, ana], true));
    if (!first.ok) throw new Error(first.error.message);
    queued.length = 0;
    const second = await service.save(setRevealPresence(first.value, [ana], false));
    expect(second.ok).toBe(true);
    expect(queued.filter((item) => item.aggregateType === "sighting").map((item) => [item.mutation, item.aggregateId])).toEqual([["delete", `${created.value.id}__${ana}`]]);
    const remaining = await service.listSightings(campaignId);
    expect(remaining.ok && remaining.value.map((item) => item.accountId)).toEqual([tester]);
  });

  it("guarda o palpite do jogador com ID determinístico e CAS", async () => {
    const { service, queued } = setup();
    const created = await service.create(campaignId, content);
    if (!created.ok) throw new Error(created.error.message);
    const first = await service.saveGuess({ campaignId, creatureId: created.value.id, accountId: tester, kind: "animal", name: "Lobão", note: "Uivou três vezes" });
    const second = await service.saveGuess({ campaignId, creatureId: created.value.id, accountId: tester, kind: "enemy", name: "Lobão", note: "Atacou a carroça", fields: { hitPoints: " uns 30 ", race: "", armorClass: "15" } });
    expect(second.ok && second.value.fields).toEqual({ hitPoints: "uns 30", armorClass: "15" });
    expect(first.ok && second.ok).toBe(true);
    const guesses = queued.filter((item) => item.aggregateType === "guess");
    expect(guesses.map((item) => [item.aggregateId, item.baseRevision])).toEqual([[`${created.value.id}__${tester}`, 0], [`${created.value.id}__${tester}`, 1]]);
  });

  it("importa NPCs antigos uma única vez", async () => {
    const { service } = setup();
    const npc = { id: asUuid("00000000-0000-4000-8000-00000000c0de"), kind: "npc" as const, name: "Mira", description: "Cartógrafa", linkedEntityIds: [], createdAt: asIsoTimestamp("2026-01-01T00:00:00.000Z"), updatedAt: asIsoTimestamp("2026-01-01T00:00:00.000Z") };
    expect(await service.importLegacyNpcs(campaignId, [npc])).toEqual(ok(1));
    expect(await service.importLegacyNpcs(campaignId, [npc])).toEqual(ok(0));
  });
});

import { describe, expect, it } from "vitest";

import { isCreatureProposal, setRevealField, setRevealPresence, type CreatureContent } from "@domain/campaign/creatures";
import { appError, err, ok } from "@domain/contracts/errors";
import { asAccountId, asCommandId, asIsoTimestamp, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type JourneyVisibilityKind, type JourneyVisibilityRepository } from "@application/ports/journey-visibility-repository";
import { type UnitOfWork } from "@application/ports/unit-of-work";
import { type NewSyncOperation, type SyncOutboxService } from "@application/sync";
import { type CreatureStatBlock } from "@domain/creatures";

import { createCreatureService } from "./creature-service";

const campaignId = asUuid("00000000-0000-4000-8000-00000000ca01");
const tester = asAccountId("player-teste");
const ana = asAccountId("player-ana");
const content: CreatureContent = { kind: "enemy", name: "Lobo atroz", appearance: "Vulto entre as árvores", race: "Lobo", description: "", hitPoints: "37", armorClass: "14", abilities: "", notes: "Serve à bruxa" };
const proposalBlock: CreatureStatBlock = {
  id: "player-wolf" as never, name: "Lobo cinzento do jogador", creatureType: "beast", size: "medium", armorClass: 13,
  hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: 900 as never },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
  challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
};

function memoryRepository(): JourneyVisibilityRepository & { readonly stores: Record<JourneyVisibilityKind, Map<string, { id: string; campaignId: string; revision: number }>> } {
  const stores = { creature: new Map(), sighting: new Map(), guess: new Map(), proposal: new Map() } as Record<JourneyVisibilityKind, Map<string, { id: string; campaignId: string; revision: number }>>;
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
  let failProposalEnqueue = false;
  const outbox: SyncOutboxService = { async enqueue(operation) { if (failProposalEnqueue && operation.aggregateType === "proposal") return err(appError.storageUnavailable("outbox proposal indisponível")); queued.push(operation); return ok(operation as never); } };
  const unitOfWork: UnitOfWork = {
    async run(operation) {
      const before = Object.fromEntries(Object.entries(repository.stores).map(([kind, store]) => [kind, new Map(store)])) as typeof repository.stores;
      const queuedLength = queued.length;
      const result = await operation({ kind: "rpg-transaction" });
      if (!result.ok) {
        for (const kind of Object.keys(repository.stores) as JourneyVisibilityKind[]) {
          repository.stores[kind].clear();
          for (const [id, record] of before[kind]) repository.stores[kind].set(id, record);
        }
        queued.splice(queuedLength);
      }
      return result;
    },
  };
  let sequence = 0;
  const service = createCreatureService({
    repository,
    syncOutbox: outbox,
    unitOfWork,
    currentAccountId: () => tester,
    clock: { now: () => asIsoTimestamp("2026-09-28T12:00:00.000Z") },
    idGenerator: { uuid: () => asUuid(`00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) as Uuid, commandId: () => asCommandId(`cmd-${++sequence}`) },
  });
  return { repository, queued, service, failProposal: () => { failProposalEnqueue = true; } };
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

  it("mantém proposta pending separada e a aprovação revela bloco ao autor sem marcar visto", async () => {
    const { service, repository } = setup();
    const submitted = await service.submitProposal({ campaignId, proposedBy: tester, statBlock: proposalBlock, suggestionReasons: ["Usa o lobo publicado de ND 1/4 como base; atributos editáveis."] });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.value.status).toBe("pending");
    expect(repository.stores.creature.size).toBe(0);
    expect(repository.stores.sighting.size).toBe(0);

    const approved = await service.reviewProposal({ campaignId, proposalId: submitted.value.id, expectedRevision: submitted.value.revision, reviewedBy: ana, reviewerRole: "owner", decision: "approve" });
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.value.creature) return;
    expect(approved.value.proposal.status).toBe("approved");
    expect(approved.value.creature.reveals).toEqual([{ accountId: tester, fields: ["name", "kind", "statBlock"] }]);
    const sightings = await service.listSightings(campaignId, tester);
    expect(sightings.ok && sightings.value[0]?.revealed.statBlock).toEqual(proposalBlock);
    expect(isCreatureProposal({ ...approved.value.proposal, status: "approved", creatureId: undefined })).toBe(false);
    expect(repository.stores.proposal.size).toBe(1);
  });

  it("aceita rascunho sem ND, exige arbitragem do mestre para aprová-lo e preserva o original", async () => {
    const { service, repository } = setup();
    const draft = { ...proposalBlock, challengeRating: null };
    const submitted = await service.submitProposal({ campaignId, proposedBy: tester, statBlock: draft, suggestionReasons: ["Animal fora do manual; o mestre define o ND."] });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const missingReview = await service.reviewProposal({ campaignId, proposalId: submitted.value.id, expectedRevision: submitted.value.revision, reviewedBy: ana, reviewerRole: "owner", decision: "approve" });
    expect(missingReview).toMatchObject({ ok: false, error: { code: "validation-error" } });
    expect(repository.stores.proposal.get(submitted.value.id)).toMatchObject({ status: "pending", statBlock: draft });
    expect(repository.stores.creature.size).toBe(0);

    const approved = await service.reviewProposal({ campaignId, proposalId: submitted.value.id, expectedRevision: submitted.value.revision, reviewedBy: ana, reviewerRole: "owner", decision: "approve", reviewedStatBlock: proposalBlock });
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.value.creature) return;
    expect(approved.value.proposal).toMatchObject({ status: "approved", statBlock: draft, reviewedStatBlock: proposalBlock });
    expect(approved.value.creature.statBlock).toEqual(proposalBlock);
    expect(approved.value.creature.reveals).toEqual([{ accountId: tester, fields: ["name", "kind", "statBlock"] }]);
    expect(repository.stores.sighting.size).toBe(1);
    expect([...repository.stores.sighting.values()][0]).toMatchObject({ accountId: tester, revealed: { name: proposalBlock.name, statBlock: proposalBlock } });
  });

  it("reverte criatura, revelação e outbox se a aprovação não conseguir enfileirar a proposal", async () => {
    const { service, repository, queued, failProposal } = setup();
    const submitted = await service.submitProposal({ campaignId, proposedBy: tester, statBlock: proposalBlock, suggestionReasons: ["Sugestão para revisão do mestre."] });
    if (!submitted.ok) throw new Error(submitted.error.message);
    queued.length = 0;
    failProposal();
    const approved = await service.reviewProposal({ campaignId, proposalId: submitted.value.id, expectedRevision: submitted.value.revision, reviewedBy: ana, reviewerRole: "owner", decision: "approve" });
    expect(approved.ok).toBe(false);
    expect(repository.stores.creature.size).toBe(0);
    expect(repository.stores.sighting.size).toBe(0);
    expect(repository.stores.proposal.get(submitted.value.id)?.revision).toBe(submitted.value.revision);
    expect(queued).toHaveLength(0);
  });
});

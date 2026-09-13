import { describe, expect, it } from "vitest";

import { type CharacterRepository } from "@application/ports/character-repository";
import { type IdGenerator } from "@application/ports/id-generator";
import { type SyncOutboxService } from "@application/sync";
import { createPendingSyncOperation, type NewSyncOperation } from "@application/sync";
import { appError, err, ok, type Result } from "@domain/contracts/errors";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asAccountId, asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type Character } from "@domain/contracts/character";
import { type Command, type RuleResult } from "@domain/contracts/rules";
import { type SyncOperation } from "@domain/contracts/cloud-sync";

import { createCharacterApplicationService } from "./service";

const timestamp = asIsoTimestamp("2026-09-12T10:00:00.000Z");
const clock = { now: () => timestamp };
const idGenerator: IdGenerator = {
  uuid: () => asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
  commandId: (() => {
    let sequence = 0;
    return () => asCommandId(`sync-${++sequence}`);
  })(),
};

function makeHarness(initial: Character = minimalCharacter) {
  let stored = initial;
  const receipts = new Map<string, Revision>();
  const contexts: unknown[] = [];
  const operations: SyncOperation[] = [];
  let failOutbox = false;

  const repository: CharacterRepository = {
    get: async (id) => (id === stored.id ? ok(stored) : err(appError.notFound("character", id))),
    list: async () => ok([]),
    save: async (character, expectedRevision, receipt, context) => {
      contexts.push(context);
      const recorded = receipt ? receipts.get(String(receipt.commandId)) : undefined;
      if (recorded !== undefined) return ok(recorded);
      if (expectedRevision !== stored.revision) return err(appError.conflict(expectedRevision, stored.revision));
      const revision = asRevision(expectedRevision + 1);
      stored = { ...character, revision };
      if (receipt) receipts.set(String(receipt.commandId), revision);
      return ok(revision);
    },
    delete: async () => ok(undefined),
    getDraft: async () => err(appError.notFound("draft", "missing")),
    saveDraft: async (draft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };

  const outbox: SyncOutboxService = {
    enqueue: async (input: NewSyncOperation, context) => {
      contexts.push(context);
      if (failOutbox) return err(appError.storageUnavailable("outbox indisponível"));
      const created = createPendingSyncOperation(input);
      if (!created.ok) return created;
      const existing = operations.find((operation) => operation.dedupeKey === created.value.dedupeKey);
      if (existing) return ok(existing);
      operations.push(created.value);
      return ok(created.value);
    },
  };

  const unitOfWork = {
    run: async <T>(fn: (context: { readonly kind: "rpg-transaction" }) => Promise<Result<T>>) => {
      const before = stored;
      const beforeReceipts = new Map(receipts);
      const beforeOperations = operations.slice();
      const result = await fn({ kind: "rpg-transaction" });
      if (!result.ok) {
        stored = before;
        receipts.clear();
        for (const [key, value] of beforeReceipts) receipts.set(key, value);
        operations.splice(0, operations.length, ...beforeOperations);
      }
      return result;
    },
  };

  return {
    repository,
    outbox,
    unitOfWork,
    contexts,
    operations,
    getStored: () => stored,
    fail: () => { failOutbox = true; },
  };
}

function successfulCommand(character: Character): { readonly command: Command; readonly result: RuleResult } {
  const command: Command = {
    commandId: asCommandId("command-1"),
    characterId: character.id,
    expectedRevision: character.revision,
    kind: "apply-healing",
    payload: { amount: 1, diceResultIds: [] },
  };
  const result: RuleResult = {
    status: "success",
    nextState: { ...character, hp: { ...character.hp, current: character.hp.current + 1 } },
    effects: [],
    explanations: [],
    sourceRefs: [],
  };
  return { command, result };
}

describe("integração local + outbox", () => {
  it("emite delete de personagem com namespace imutável", async () => {
    const character = { ...minimalCharacter, campaignId: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb") };
    const harness = makeHarness(character);
    const service = createCharacterApplicationService({
      repository: harness.repository,
      debounceMs: 0,
      commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox },
    });

    const deleted = await service.deleteCharacter(character.id, character.revision);

    expect(deleted.ok).toBe(true);
    expect(harness.operations).toHaveLength(1);
    expect(harness.operations[0]).toMatchObject({ aggregateType: "character", mutation: "delete", scope: { campaignId: character.campaignId } });
  });

  it("vincula e desvincula personagem com CAS e publica o snapshot", async () => {
    const harness = makeHarness();
    const service = createCharacterApplicationService({
      repository: harness.repository,
      debounceMs: 0,
      commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox },
    });
    const campaignId = asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    const linked = await service.linkToCampaign(minimalCharacter.id, campaignId, minimalCharacter.revision);
    expect(linked).toMatchObject({ ok: true, value: 1 });
    expect(harness.getStored().campaignId).toBe(campaignId);
    expect(harness.operations[0]).toMatchObject({ aggregateType: "character", mutation: "upsert", payload: { campaignId } });

    const unlinked = await service.unlinkFromCampaign(minimalCharacter.id, campaignId, linked.ok ? linked.value : asRevision(1));
    expect(unlinked).toMatchObject({ ok: true, value: 2 });
    expect(harness.getStored().campaignId).toBeUndefined();
  });

  it("não move personagem já ligado a outra campanha e respeita revisão", async () => {
    const otherCampaign = asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    const harness = makeHarness({ ...minimalCharacter, campaignId: otherCampaign });
    const service = createCharacterApplicationService({ repository: harness.repository, debounceMs: 0, commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox } });

    const moved = await service.linkToCampaign(minimalCharacter.id, asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), minimalCharacter.revision);
    expect(moved).toMatchObject({ ok: false, error: { code: "validation-error" } });
    expect(harness.getStored().campaignId).toBe(otherCampaign);

    const stale = await service.unlinkFromCampaign(minimalCharacter.id, otherCampaign, asRevision(99));
    expect(stale).toMatchObject({ ok: false, error: { code: "conflict" } });
  });

  it("usa ownerUid para delete de personagem privado e aborta se a fila falhar", async () => {
    const harness = makeHarness();
    const service = createCharacterApplicationService({
      repository: harness.repository,
      debounceMs: 0,
      ownerUid: asAccountId("owner-1"),
      commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox },
    });
    harness.fail();

    const deleted = await service.deleteCharacter(minimalCharacter.id, minimalCharacter.revision);

    expect(deleted.ok).toBe(false);
    expect(harness.operations).toHaveLength(0);
    expect(harness.getStored()).toEqual(minimalCharacter);
  });

  it("grava mutação de store e outbox no mesmo contexto transacional", async () => {
    const harness = makeHarness();
    const service = createCharacterApplicationService({
      repository: harness.repository,
      debounceMs: 0,
      commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox },
    });
    await service.select(minimalCharacter.id);
    service.update((character) => ({ ...character, name: "Offline" }), true);
    const saved = await service.save();

    expect(saved.ok).toBe(true);
    expect(harness.getStored().name).toBe("Offline");
    expect(harness.operations).toHaveLength(1);
    expect(harness.operations[0]).toMatchObject({ aggregateType: "character", mutation: "upsert", baseRevision: 0, status: "pending" });
    expect(harness.contexts[0]).toBe(harness.contexts[1]);
  });

  it("aborta o commit local quando o outbox falha", async () => {
    const harness = makeHarness();
    harness.fail();
    const service = createCharacterApplicationService({
      repository: harness.repository,
      debounceMs: 0,
      commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox },
    });
    await service.select(minimalCharacter.id);
    service.update((character) => ({ ...character, name: "não confirmado" }), true);
    const saved = await service.save();

    expect(saved.ok).toBe(false);
    expect(harness.getStored().name).toBe(minimalCharacter.name);
    expect(harness.operations).toHaveLength(0);
  });

  it("mantém a operação pending e deduplica o reenvio do mesmo comando", async () => {
    const harness = makeHarness();
    const service = createCharacterApplicationService({
      repository: harness.repository,
      commandDependencies: { clock, idGenerator, unitOfWork: harness.unitOfWork, syncOutbox: harness.outbox },
    });
    await service.select(minimalCharacter.id);
    const first = successfulCommand(minimalCharacter);
    const second = await service.commands!.commit(first.command, first.result);
    const repeated = await service.commands!.commit(first.command, first.result);

    expect(second.ok).toBe(true);
    expect(repeated.ok).toBe(true);
    expect(harness.operations).toHaveLength(1);
    expect(harness.operations[0]?.status).toBe("pending");
    expect(harness.operations[0]?.operationId).toBe(first.command.commandId);
  });
});

type Revision = import("@domain/contracts/versioning").Revision;

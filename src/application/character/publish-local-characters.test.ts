import { describe, expect, it } from "vitest";

import { type CharacterRepository } from "@application/ports/character-repository";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { appError, err, ok } from "@domain/contracts/errors";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asAccountId, asIsoTimestamp } from "@domain/contracts/ids";
import { type SyncOperation } from "@domain/contracts/cloud-sync";

import { publishLocalCharacters } from "./publish-local-characters";

const clock = { now: () => asIsoTimestamp("2026-09-14T12:00:00.000Z") };

function repository(): CharacterRepository {
  return {
    get: async (id) => id === minimalCharacter.id ? ok(minimalCharacter) : err(appError.notFound("character", id)),
    list: async () => ok([{
      id: minimalCharacter.id,
      name: minimalCharacter.name,
      raceRef: minimalCharacter.raceRef,
      classSummary: minimalCharacter.classes.map(({ classId, level }) => ({ classId, level })),
      totalLevel: 1,
      updatedAt: minimalCharacter.updatedAt,
      revision: minimalCharacter.revision,
    }]),
    save: async () => ok(minimalCharacter.revision),
    delete: async () => ok(undefined),
    getDraft: async () => err(appError.notFound("draft", "missing")),
    listDrafts: async () => ok([]),
    saveDraft: async (draft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };
}

function outbox() {
  const values = new Map<string, SyncOperation>();
  const value: OutboxRepository = {
    enqueue: async (operation) => { values.set(String(operation.operationId), operation); return ok(operation); },
    get: async (id) => {
      const operation = values.get(String(id));
      return operation ? ok(operation) : err(appError.notFound("sync-operation", id));
    },
    listPending: async () => ok([]),
    markSyncing: async (id) => err(appError.notFound("sync-operation", id)),
    markAcked: async (id) => err(appError.notFound("sync-operation", id)),
    markConflict: async (id) => err(appError.notFound("sync-operation", id)),
    markFailed: async (id) => err(appError.notFound("sync-operation", id)),
  };
  return { value, values };
}

describe("publishLocalCharacters", () => {
  it("enfileira fichas locais privadas uma vez para a conta autenticada", async () => {
    const queue = outbox();
    const options = { characters: repository(), outbox: queue.value, ownerUid: asAccountId("firebase-user"), clock };

    expect(await publishLocalCharacters(options)).toMatchObject({ ok: true, value: 1 });
    expect(await publishLocalCharacters(options)).toMatchObject({ ok: true, value: 0 });
    expect([...queue.values.values()]).toEqual([expect.objectContaining({
      aggregateType: "character",
      aggregateId: minimalCharacter.id,
      baseRevision: 0,
      scope: { ownerUid: asAccountId("firebase-user") },
    })]);
  });
});

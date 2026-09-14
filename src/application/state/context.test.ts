import { describe, expect, it, vi } from "vitest";

import { type CharacterRepository } from "@application/ports/character-repository";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { ok } from "@domain/contracts/errors";
import { asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import { createApplicationServices } from "./context";

describe("createApplicationServices", () => {
  it("enqueues a newly created character when sync dependencies are available", async () => {
    const characterRepository = {
      save: vi.fn(async () => ok(asRevision(1))),
    } as unknown as CharacterRepository;
    const outboxRepository = {
      enqueue: vi.fn(async (operation) => ok(operation)),
    } as unknown as OutboxRepository;
    const services = createApplicationServices({
      characterRepository,
      campaignRepository: {} as never,
      settingsRepository: {} as never,
      diceHistoryRepository: {} as never,
      outboxRepository,
      clock: { now: () => asIsoTimestamp("2026-09-14T00:00:00.000Z") },
      idGenerator: {
        uuid: () => asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
        commandId: () => asCommandId("character-create-1"),
      },
    });

    const saved = await services.character.saveCharacter(minimalCharacter, minimalCharacter.revision);

    expect(saved.ok).toBe(true);
    expect(outboxRepository.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      aggregateType: "character",
      aggregateId: minimalCharacter.id,
      mutation: "upsert",
    }), undefined);
  });
});

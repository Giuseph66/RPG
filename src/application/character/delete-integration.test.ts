import { describe, expect, it } from "vitest";

import { createSyncOutboxService } from "@application/sync";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asAccountId, asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { IndexedDbCharacterRepository } from "@infrastructure/persistence/indexeddb/character-repository";
import { IndexedDbOutboxRepository } from "@infrastructure/persistence/indexeddb/outbox-repository";
import { openDatabase } from "@infrastructure/persistence/indexeddb/open-database";
import { IndexedDbUnitOfWork } from "@infrastructure/persistence/indexeddb/unit-of-work";

import { createCharacterApplicationService } from "./service";

const timestamp = asIsoTimestamp("2026-09-29T12:00:00.000Z");
const clock = { now: () => timestamp };
let sequence = 0;

/** IndexedDB e UnitOfWork reais: pega leituras feitas fora da transação, que a encerram sozinha. */
async function setup(ownerUid?: () => ReturnType<typeof asAccountId> | undefined) {
  const opened = await openDatabase({ name: `rpg-delete-${sequence++}` });
  if (!opened.ok) throw new Error(opened.error.message);
  const db = opened.value;
  const repository = new IndexedDbCharacterRepository(db, clock);
  const outbox = new IndexedDbOutboxRepository(db, clock);
  const service = createCharacterApplicationService({
    repository,
    debounceMs: 0,
    ...(ownerUid ? { ownerUid } : {}),
    commandDependencies: {
      clock,
      idGenerator: { uuid: () => asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), commandId: (() => { let n = 0; return () => asCommandId(`delete-${++n}`); })() },
      unitOfWork: new IndexedDbUnitOfWork(db),
      syncOutbox: createSyncOutboxService(outbox),
    } as never,
  });
  const saved = await repository.save({ ...minimalCharacter, campaignId: undefined }, minimalCharacter.revision);
  if (!saved.ok) throw new Error(saved.error.message);
  return { repository, outbox, service, revision: saved.value };
}

describe("exclusão de ficha com persistência real", () => {
  it("exclui uma ficha sem campanha e enfileira a exclusão no escopo da conta conectada", async () => {
    const { repository, outbox, service, revision } = await setup(() => asAccountId("mestre-1"));
    const deleted = await service.deleteCharacter(minimalCharacter.id, revision);
    expect(deleted).toEqual({ ok: true, value: undefined });
    expect((await repository.get(minimalCharacter.id)).ok).toBe(false);
    const pending = await outbox.listPending({ now: timestamp });
    expect(pending.ok && pending.value.filter((item) => item.mutation === "delete").map((item) => item.scope)).toEqual([{ ownerUid: "mestre-1" }]);
  });

  it("sem conta conectada a ficha local é excluída sem exigir escopo remoto", async () => {
    const { repository, outbox, service, revision } = await setup();
    const deleted = await service.deleteCharacter(minimalCharacter.id, revision);
    expect(deleted).toEqual({ ok: true, value: undefined });
    expect((await repository.get(minimalCharacter.id)).ok).toBe(false);
    const pending = await outbox.listPending({ now: timestamp });
    expect(pending.ok && pending.value.filter((item) => item.mutation === "delete")).toEqual([]);
  });
});

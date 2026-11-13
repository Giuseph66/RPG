import { afterEach, describe, expect, it } from "vitest";

import { createCreatureService } from "@application/campaign/creature-service";
import { createPendingSyncOperation, createSyncOutboxService } from "@application/sync";
import { asAccountId, asCommandId, asEntityId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { appError, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";
import { type CreatureStatBlock } from "@domain/creatures";

import { IndexedDbJourneyVisibilityRepository } from "./journey-visibility-repository";
import { openDatabase } from "./open-database";
import { IndexedDbOutboxRepository } from "./outbox-repository";
import { IndexedDbUnitOfWork } from "./unit-of-work";
import { DB_VERSION, STORE_NAMES } from "./schema";

const campaignId = asUuid("01010101-0101-4101-8101-010101010101");
const authorId = asAccountId("proposal-persistence-author");
const masterId = asAccountId("proposal-persistence-master");
const clock = { now: () => asIsoTimestamp("2026-11-12T12:00:00.000Z") };
const draftBlock: CreatureStatBlock = {
  id: asEntityId("custom-animal"), name: "Corça-do-véu", creatureType: "beast", size: "medium", armorClass: 12,
  hitPoints: { average: 9, hitDice: "2d8" }, speeds: { walkCm: 900 as never },
  abilityScores: { str: 11, dex: 14, con: 10, int: 2, wis: 12, cha: 6 }, challengeRating: null, sourceRefs: [],
};
const reviewedBlock: CreatureStatBlock = { ...draftBlock, challengeRating: { numerator: 1, denominator: 8 } };

let database: IDBDatabase | undefined;
let databaseName = "";
let sequence = 0;

async function openFreshDatabase(): Promise<IDBDatabase> {
  databaseName = `rpg-creature-proposal-persistence-${sequence++}`;
  const opened = await openDatabase({ name: databaseName });
  if (!opened.ok) throw new Error(opened.error.message);
  database = opened.value;
  return database;
}

afterEach(() => {
  database?.close();
  database = undefined;
});

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("IndexedDB de proposta de criatura", () => {
  it("usa CAS e desfaz criatura, revelação e outbox reais se o último enqueue colidir", async () => {
    const db = await openFreshDatabase();
    const journey = new IndexedDbJourneyVisibilityRepository(db, clock);
    const outboxRepository = new IndexedDbOutboxRepository(db, clock);
    const syncOutbox = createSyncOutboxService(outboxRepository);
    const unitOfWork = new IndexedDbUnitOfWork(db);
    let uuidSequence = 0;
    let commandSequence = 0;
    const service = createCreatureService({
      repository: journey,
      syncOutbox,
      unitOfWork,
      currentAccountId: () => authorId,
      clock,
      idGenerator: {
        uuid: () => asUuid(`02020202-0202-4202-8202-${String(++uuidSequence).padStart(12, "0")}`),
        commandId: () => asCommandId(`proposal-persist-${++commandSequence}`),
      },
    });

    const submitted = unwrap(await service.submitProposal({ campaignId, proposedBy: authorId, statBlock: draftBlock, suggestionReasons: ["Animal sem ND de referência; aguarda arbitragem."] }));
    expect(submitted.status).toBe("pending");

    const stale = await service.reviewProposal({ campaignId, proposalId: submitted.id, expectedRevision: asRevision(0), reviewedBy: masterId, reviewerRole: "owner", decision: "approve", reviewedStatBlock: reviewedBlock });
    expect(stale).toMatchObject({ ok: false, error: { code: "conflict" } });

    const conflictingOutboxWrite = unwrap(createPendingSyncOperation({
      operationId: asCommandId("proposal-persist-4"), aggregateType: "proposal", aggregateId: submitted.id as never,
      mutation: "upsert", baseRevision: submitted.revision, scope: { campaignId }, payload: { unrelated: "same dedupe key, different payload" }, createdAt: clock.now(),
    }));
    unwrap(await outboxRepository.enqueue(conflictingOutboxWrite));

    const failedApproval = await service.reviewProposal({ campaignId, proposalId: submitted.id, expectedRevision: submitted.revision, reviewedBy: masterId, reviewerRole: "owner", decision: "approve", reviewedStatBlock: reviewedBlock });
    expect(failedApproval).toMatchObject({ ok: false, error: { code: "validation-error" } });
    expect(unwrap(await journey.get("proposal", submitted.id))).toMatchObject({ status: "pending", revision: submitted.revision, statBlock: draftBlock });
    expect(unwrap(await journey.list("creature", campaignId))).toHaveLength(0);
    expect(unwrap(await journey.list("sighting", campaignId))).toHaveLength(0);
    expect(unwrap(await outboxRepository.listPending({ now: clock.now() }))).toHaveLength(2);
  });

  it("migra banco v5 preenchido para v6 criando proposals sem tocar nos registros existentes", async () => {
    databaseName = `rpg-schema-v5-to-v6-${sequence++}`;
    const previousStores = [
      { name: STORE_NAMES.characters, keyPath: "id", key: "character-v5", record: { id: "character-v5", marker: "character" } },
      { name: STORE_NAMES.campaigns, keyPath: "id", key: "campaign-v5", record: { id: "campaign-v5", marker: "campaign" } },
      { name: STORE_NAMES.outbox, keyPath: "operationId", key: "outbox-v5", record: { operationId: "outbox-v5", marker: "outbox" } },
      { name: STORE_NAMES.creatures, keyPath: "id", key: "creature-v5", record: { id: "creature-v5", campaignId: "campaign-v5", marker: "creature" }, campaignIndex: true },
      { name: STORE_NAMES.sightings, keyPath: "id", key: "sighting-v5", record: { id: "sighting-v5", campaignId: "campaign-v5", marker: "sighting" }, campaignIndex: true },
      { name: STORE_NAMES.guesses, keyPath: "id", key: "guess-v5", record: { id: "guess-v5", campaignId: "campaign-v5", marker: "guess" }, campaignIndex: true },
    ] as const;
    const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 5);
      request.onupgradeneeded = () => {
        for (const spec of previousStores) {
          const store = request.result.createObjectStore(spec.name, { keyPath: spec.keyPath });
          if (spec.campaignIndex) store.createIndex("campaignId", "campaignId");
          store.put(spec.record);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    legacyDb.close();

    const upgraded = await openDatabase({ name: databaseName });
    if (!upgraded.ok) throw new Error(upgraded.error.message);
    database = upgraded.value;
    expect(database.version).toBe(DB_VERSION);
    expect(database.objectStoreNames.contains(STORE_NAMES.proposals)).toBe(true);
    const proposalStore = database.transaction([STORE_NAMES.proposals], "readonly").objectStore(STORE_NAMES.proposals);
    expect(proposalStore.indexNames.contains("campaignId")).toBe(true);

    const preserved = await new Promise<readonly unknown[]>((resolve, reject) => {
      const storeNames = previousStores.map((spec) => spec.name);
      const tx = database!.transaction(storeNames, "readonly");
      const values: unknown[] = [];
      previousStores.forEach((spec, index) => {
        const request = tx.objectStore(spec.name).get(spec.key);
        request.onsuccess = () => { values[index] = request.result; };
      });
      tx.oncomplete = () => resolve(values);
      tx.onerror = () => reject(tx.error);
    });
    expect(preserved).toEqual(previousStores.map((spec) => spec.record));
  });
});

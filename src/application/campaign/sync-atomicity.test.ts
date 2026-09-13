import { beforeEach, describe, expect, it } from "vitest";

import { createSyncOutboxService, type SyncOutboxService } from "@application/sync";
import { IndexedDbCampaignRepository } from "@infrastructure/persistence/indexeddb/campaign-repository";
import { IndexedDbAssetRepository } from "@infrastructure/persistence/indexeddb/asset-repository";
import { IndexedDbOutboxRepository } from "@infrastructure/persistence/indexeddb/outbox-repository";
import { IndexedDbUnitOfWork } from "@infrastructure/persistence/indexeddb/unit-of-work";
import { openDatabase } from "@infrastructure/persistence/indexeddb/open-database";
import { appError, err, type AppError, type Result } from "@domain/contracts/errors";
import { asCommandId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type Asset, type Campaign, type JournalEntry, type MapRecord } from "@domain/contracts/campaign";
import { type IdGenerator } from "@application/ports/id-generator";
import { type CampaignCleanupManifest, type SyncOperation } from "@domain/contracts/cloud-sync";

import { createCampaignApplicationService } from "./service";

let databaseSequence = 0;
const now = asIsoTimestamp("2026-09-12T15:30:00.000Z");
const clock = { now: () => now };
const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };

function generator(): IdGenerator {
  let sequence = 0;
  return {
    uuid: () => asUuid(`00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`),
    commandId: () => asCommandId(`atomic-${++sequence}`),
  };
}

function campaign(id = asUuid("10000000-0000-4000-8000-000000000001")): Campaign {
  return {
    id,
    schemaVersion: 1,
    revision: asRevision(0),
    name: "Campanha atômica",
    description: "",
    rulesetRef,
    characterIds: [],
    sessionCounter: 0,
    npcs: [],
    quests: [],
    objectives: [],
    settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "milestone" },
    createdAt: now,
    updatedAt: now,
  };
}

function journal(campaignId: Campaign["id"]): JournalEntry {
  return {
    id: asUuid("20000000-0000-4000-8000-000000000001"),
    campaignId,
    title: "Sessão",
    body: "Resumo",
    linkedEntityIds: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

function asset(): Asset {
  return { id: asUuid("30000000-0000-4000-8000-000000000001"), mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]), hash: "hash", originalName: "map.png" };
}

function map(campaignId: Campaign["id"], assetId: Asset["id"]): MapRecord {
  return { id: asUuid("40000000-0000-4000-8000-000000000001"), campaignId, name: "Mapa", assetId, pins: [], revision: asRevision(0) };
}

function failingOutbox(): SyncOutboxService {
  return { enqueue: async () => err(appError.storageUnavailable("outbox indisponível")) };
}

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function createDb(): Promise<IDBDatabase> {
  const opened = await openDatabase({ name: `rpg-cloud-atomicity-${databaseSequence++}` });
  if (!opened.ok) throw new Error(opened.error.message);
  return opened.value;
}

describe("campanha + outbox atômicos", () => {
  let db: IDBDatabase;

  beforeEach(async () => {
    db = await createDb();
  });

  it("confirma campanha e operação pending no mesmo commit", async () => {
    const repository = new IndexedDbCampaignRepository(db, clock);
    const outbox = new IndexedDbOutboxRepository(db, clock);
    const service = createCampaignApplicationService({
      repository,
      syncOutbox: createSyncOutboxService(outbox),
      unitOfWork: new IndexedDbUnitOfWork(db),
      clock,
      idGenerator: generator(),
    });

    expect(await service.saveCampaign(campaign(), asRevision(0))).toEqual({ ok: true, value: 1 });
    expect(unwrap(await repository.get(campaign().id)).revision).toBe(1);
    expect(unwrap(await outbox.listPending())).toHaveLength(1);
    expect(unwrap(await outbox.listPending())[0]).toMatchObject({ aggregateType: "campaign", mutation: "upsert", baseRevision: 0 });
  });

  it("faz rollback da campanha quando o enqueue falha", async () => {
    const repository = new IndexedDbCampaignRepository(db, clock);
    const outbox = new IndexedDbOutboxRepository(db, clock);
    const value = campaign();
    const service = createCampaignApplicationService({ repository, syncOutbox: failingOutbox(), unitOfWork: new IndexedDbUnitOfWork(db), clock, idGenerator: generator() });

    const result = await service.saveCampaign(value, asRevision(0));
    expect(result.ok).toBe(false);
    expect((await repository.get(value.id)).ok).toBe(false);
    expect(unwrap(await outbox.listPending())).toHaveLength(0);
  });

  it("faz rollback do diário e do mapa quando o enqueue falha", async () => {
    const repository = new IndexedDbCampaignRepository(db, clock);
    const assets = new IndexedDbAssetRepository(db, clock);
    const value = campaign();
    expect((await repository.save(value, asRevision(0))).ok).toBe(true);
    const image = asset();
    expect((await assets.put(image)).ok).toBe(true);
    const service = createCampaignApplicationService({ repository, syncOutbox: failingOutbox(), unitOfWork: new IndexedDbUnitOfWork(db), clock, idGenerator: generator() });

    expect((await service.saveJournalEntry(journal(value.id))).ok).toBe(false);
    expect((await repository.getJournalEntry(journal(value.id).id)).ok).toBe(false);
    expect((await service.saveMap(map(value.id, image.id), asRevision(0))).ok).toBe(false);
    expect((await repository.getMap(map(value.id, image.id).id)).ok).toBe(false);
  });

  it("faz rollback do par mapa + metadados do asset e de ambos os outbox entries", async () => {
    const repository = new IndexedDbCampaignRepository(db, clock);
    const outbox = new IndexedDbOutboxRepository(db, clock);
    const value = campaign();
    expect((await repository.save(value, asRevision(0))).ok).toBe(true);
    const image = asset();
    const mapValue = map(value.id, image.id);
    const service = createCampaignApplicationService({ repository, syncOutbox: createSyncOutboxService(outbox), unitOfWork: new IndexedDbUnitOfWork(db), clock, idGenerator: generator() });

    expect(await service.importMapWithAsset({ map: mapValue, asset: image })).toEqual({ ok: true, value: { map: mapValue, asset: image } });
    expect(unwrap(await outbox.listPending()).map((operation: SyncOperation) => operation.aggregateType)).toEqual(["map", "asset"]);

    const failingService = createCampaignApplicationService({ repository, syncOutbox: failingOutbox(), unitOfWork: new IndexedDbUnitOfWork(db), clock, idGenerator: generator() });
    const secondAsset = { ...image, id: asUuid("30000000-0000-4000-8000-000000000002") };
    const secondMap = { ...mapValue, id: asUuid("40000000-0000-4000-8000-000000000002"), assetId: secondAsset.id };
    expect((await failingService.importMapWithAsset({ map: secondMap, asset: secondAsset })).ok).toBe(false);
    expect((await repository.getMap(secondMap.id)).ok).toBe(false);
    expect((await assetsFor(db, secondAsset.id)).ok).toBe(false);
  });

  it("mantém adapter sem contexto explicitamente local-only", async () => {
    const operations: SyncOperation[] = [];
    const fakeRepository = {
      ...new IndexedDbCampaignRepository(db, clock),
      save: async (value: Campaign, _revision: 0 | 1) => ({ ok: true as const, value: asRevision(1) }),
    } as unknown as import("@application/ports/campaign-repository").CampaignRepository;
    const outbox: SyncOutboxService = {
      enqueue: async (input) => {
        operations.push({ ...input, status: "pending", attempts: 0, updatedAt: input.createdAt, dedupeKey: `${input.operationId}|${input.aggregateType}|${input.aggregateId}|${input.mutation}|${input.baseRevision}` });
        return { ok: true, value: operations.at(-1)! };
      },
    };
    const service = createCampaignApplicationService({ repository: fakeRepository, syncOutbox: outbox, unitOfWork: new IndexedDbUnitOfWork(db), clock, idGenerator: generator() });

    expect((await service.saveCampaign(campaign(), asRevision(0))).ok).toBe(true);
    expect(operations).toHaveLength(0);
  });

  it("faz rollback da exclusão local quando o manifesto de limpeza não entra no outbox", async () => {
    const repository = new IndexedDbCampaignRepository(db, clock);
    const value = campaign();
    expect((await repository.save(value, asRevision(0))).ok).toBe(true);
    const manifest: CampaignCleanupManifest = {
      schemaVersion: 1,
      campaignId: value.id,
      campaignRevision: asRevision(1),
      memberAccountIds: [], characterIds: [], journalIds: [], mapIds: [], sessionIds: [], assets: [],
    };
    const service = createCampaignApplicationService({
      repository,
      syncOutbox: failingOutbox(),
      unitOfWork: new IndexedDbUnitOfWork(db),
      clock,
      idGenerator: generator(),
      cleanupManifestReader: { read: async () => ({ ok: true, value: manifest }) },
    });

    const result = await service.deleteCampaignAndContent(value.id, asRevision(1));
    expect(result.ok).toBe(false);
    const restored = await repository.get(value.id);
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value).toMatchObject({ id: value.id, revision: 1 });
  });
});

async function assetsFor(db: IDBDatabase, id: Asset["id"]): Promise<Result<Asset, AppError>> {
  return new IndexedDbAssetRepository(db, clock).get(id);
}

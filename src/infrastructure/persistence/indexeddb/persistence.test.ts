import { beforeEach, describe, expect, it, vi } from "vitest";

import { fixtureRulesetRef, minimalCharacter, diceRollAdvantageSample } from "@domain/contracts/fixtures";
import { asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { type Campaign, type Quest } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";

import { IndexedDbAssetRepository } from "./asset-repository";
import { IndexedDbCampaignRepository } from "./campaign-repository";
import { IndexedDbCharacterRepository } from "./character-repository";
import { IndexedDbDiceHistoryRepository } from "./dice-history-repository";
import { IndexedDbRecoveryRepository } from "./recovery-repository";
import { openDatabase } from "./open-database";
import { STORE_NAMES } from "./schema";
import { IndexedDbUnitOfWork } from "./unit-of-work";

const clock = { now: () => asIsoTimestamp("2026-01-01T00:00:00.000Z") };
let sequence = 0;
let currentDatabaseName = "";

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function createDb(): Promise<IDBDatabase> {
  currentDatabaseName = `rpg-data-003-${sequence++}`;
  const result = await openDatabase({ name: currentDatabaseName });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("DATA-003 IndexedDB", () => {
  let db: IDBDatabase;

  beforeEach(async () => {
    db = await createDb();
  });

  it("faz roundtrip de personagem, rolagem e recibo no mesmo commit", async () => {
    const characters = new IndexedDbCharacterRepository(db, clock);
    const history = new IndexedDbDiceHistoryRepository(db, clock);
    const uow = new IndexedDbUnitOfWork(db);
    const receipt = {
      commandId: asCommandId("44444444-4444-4444-8444-444444444444"),
      characterId: minimalCharacter.id,
      resultStatus: "success" as const,
      recordedAt: clock.now(),
      diceRollIds: [diceRollAdvantageSample.id],
    };

    const committed = await uow.run(async (context) => {
      const saved = await characters.save(minimalCharacter, asRevision(0), receipt, context);
      if (!saved.ok) return saved;
      const logged = await history.append({ roll: diceRollAdvantageSample, characterId: minimalCharacter.id }, context);
      if (!logged.ok) return logged;
      return ok(saved.value);
    });

    expect(committed).toEqual({ ok: true, value: 1 });
    expect((await characters.get(minimalCharacter.id)).ok).toBe(true);
    expect(unwrap(await history.list({ characterId: minimalCharacter.id }))).toHaveProperty("entries");
    expect(unwrap(await history.list({ characterId: minimalCharacter.id })).entries).toHaveLength(1);
    const rawReceipt = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction([STORE_NAMES.commandReceipts], "readonly");
      const request = tx.objectStore(STORE_NAMES.commandReceipts).get(receipt.commandId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(rawReceipt).toMatchObject({ resultingRevision: 1 });
  });

  it("aborta personagem, histórico e recibo quando a composição retorna erro", async () => {
    const characters = new IndexedDbCharacterRepository(db, clock);
    const history = new IndexedDbDiceHistoryRepository(db, clock);
    const uow = new IndexedDbUnitOfWork(db);
    const receipt = {
      commandId: asCommandId("55555555-5555-4555-8555-555555555555"),
      characterId: minimalCharacter.id,
      resultStatus: "success" as const,
      recordedAt: clock.now(),
      diceRollIds: [],
    };

    const aborted = await uow.run(async (context) => {
      const saved = await characters.save(minimalCharacter, asRevision(0), receipt, context);
      if (!saved.ok) return saved;
      const logged = await history.append({ roll: diceRollAdvantageSample, characterId: minimalCharacter.id }, context);
      if (!logged.ok) return logged;
      return err(appError.validation("test", "falha forçada"));
    });

    expect(aborted.ok).toBe(false);
    const missingCharacter = await characters.get(minimalCharacter.id);
    if (missingCharacter.ok) throw new Error("personagem não deveria existir");
    expect(missingCharacter.error.code).toBe("not-found");
    expect(unwrap(await history.list({ characterId: minimalCharacter.id })).entries).toHaveLength(0);
  });

  it("aplica CAS entre duas conexões", async () => {
    const second = await openDatabase({ name: currentDatabaseName });
    if (!second.ok) throw new Error(second.error.message);
    const firstRepo = new IndexedDbCharacterRepository(db, clock);
    const secondRepo = new IndexedDbCharacterRepository(second.value, clock);
    expect((await firstRepo.save(minimalCharacter, asRevision(0))).ok).toBe(true);
    const [left, right] = await Promise.all([
      firstRepo.save({ ...minimalCharacter, name: "A" }, asRevision(1)),
      secondRepo.save({ ...minimalCharacter, name: "B" }, asRevision(1)),
    ]);
    expect([left.ok, right.ok].sort()).toEqual([false, true]);
    second.value.close();
  });

  it("aplica CAS da campanha nas mutações de Quest", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const campaign: Campaign = {
      id: asUuid("77777777-7777-4777-8777-777777777777"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    const quest: Quest = {
      id: asUuid("88888888-8888-4888-8888-888888888888"),
      title: "Quest",
      description: "",
      status: "active",
      linkedEntityIds: [],
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await campaigns.saveQuest(campaign.id, quest, asRevision(1))).ok).toBe(true);
    const stale = await campaigns.saveQuest(campaign.id, { ...quest, title: "stale" }, asRevision(1));
    if (stale.ok) throw new Error("CAS de Quest foi ignorado");
    expect(stale.error.code).toBe("conflict");
  });

  it("remove campanha, diário, mapa e asset vinculado em um commit único", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const assets = new IndexedDbAssetRepository(db, clock);
    const characters = new IndexedDbCharacterRepository(db, clock);
    const campaign: Campaign = {
      id: asUuid("11111111-1111-4111-8111-111111111111"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha atômica",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [minimalCharacter.id],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    const journalId = asUuid("22222222-2222-4222-8222-222222222222");
    const mapId = asUuid("33333333-3333-4333-8333-333333333333");
    const assetId = asUuid("44444444-4444-4444-8444-444444444444");
    const portraitAssetId = asUuid("99999999-9999-4999-8999-999999999999");
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await campaigns.saveJournalEntry({
      id: journalId,
      campaignId: campaign.id,
      title: "Sessão",
      body: "Resumo",
      linkedEntityIds: [],
      tags: [],
      createdAt: clock.now(),
      updatedAt: clock.now(),
    })).ok).toBe(true);
    expect((await assets.put({ id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "hash", originalName: "map.png" })).ok).toBe(true);
    expect((await assets.put({ id: portraitAssetId, mediaType: "image/png", bytes: new Uint8Array([2]), hash: "hash", originalName: "portrait.png" })).ok).toBe(true);
    expect((await characters.save({ ...minimalCharacter, campaignId: campaign.id, portraitAssetId }, asRevision(0))).ok).toBe(true);
    expect((await campaigns.saveMap({ id: mapId, campaignId: campaign.id, name: "Mapa", assetId, pins: [], revision: asRevision(0) }, asRevision(0))).ok).toBe(true);

    const deleted = await campaigns.deleteCampaignAndContent(campaign.id, asRevision(1));
    expect(deleted).toEqual({ ok: true, value: undefined });
    expect((await campaigns.get(campaign.id)).ok).toBe(false);
    expect((await campaigns.getJournalEntry(journalId)).ok).toBe(false);
    expect((await campaigns.getMap(mapId)).ok).toBe(false);
    expect((await assets.get(assetId)).ok).toBe(false);
    expect((await assets.get(portraitAssetId)).ok).toBe(true);
    const retainedCharacter = unwrap(await characters.get(minimalCharacter.id));
    expect(retainedCharacter.campaignId).toBeUndefined();
  });

  it("faz rollback de todo o conteúdo quando um delete intermediário falha", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const assets = new IndexedDbAssetRepository(db, clock);
    const campaign: Campaign = {
      id: asUuid("55555555-5555-4555-8555-555555555555"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha rollback",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    const journalId = asUuid("66666666-6666-4666-8666-666666666666");
    const mapId = asUuid("77777777-7777-4777-8777-777777777777");
    const assetId = asUuid("88888888-8888-4888-8888-888888888888");
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await campaigns.saveJournalEntry({ id: journalId, campaignId: campaign.id, title: "Sessão", body: "Resumo", linkedEntityIds: [], tags: [], createdAt: clock.now(), updatedAt: clock.now() })).ok).toBe(true);
    expect((await assets.put({ id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "hash", originalName: "map.png" })).ok).toBe(true);
    expect((await campaigns.saveMap({ id: mapId, campaignId: campaign.id, name: "Mapa", assetId, pins: [], revision: asRevision(0) }, asRevision(0))).ok).toBe(true);

    const originalDelete = IDBObjectStore.prototype.delete;
    let deleteCalls = 0;
    const deleteSpy = vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      deleteCalls += 1;
      if (deleteCalls === 2) throw new Error("falha injetada no segundo delete");
      return originalDelete.call(this, key);
    });
    try {
      const result = await campaigns.deleteCampaignAndContent(campaign.id, asRevision(1));
      expect(result.ok).toBe(false);
    } finally {
      deleteSpy.mockRestore();
    }

    expect((await campaigns.get(campaign.id)).ok).toBe(true);
    expect((await campaigns.getJournalEntry(journalId)).ok).toBe(true);
    expect((await campaigns.getMap(mapId)).ok).toBe(true);
    expect((await assets.get(assetId)).ok).toBe(true);
  });

  it("reabre o banco e conserva o registro confirmado", async () => {
    const repository = new IndexedDbCharacterRepository(db, clock);
    expect((await repository.save(minimalCharacter, asRevision(0))).ok).toBe(true);
    db.close();
    const reopened = await openDatabase({ name: currentDatabaseName });
    if (!reopened.ok) throw new Error(reopened.error.message);
    const loaded = await new IndexedDbCharacterRepository(reopened.value, clock).get(minimalCharacter.id);
    expect(loaded.ok).toBe(true);
    reopened.value.close();
  });

  it("preserva e reporta schema futuro/corrupção ao listar", async () => {
    const repository = new IndexedDbCharacterRepository(db, clock);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAMES.characters], "readwrite");
      tx.objectStore(STORE_NAMES.characters).put({ ...minimalCharacter, id: "future", schemaVersion: 99 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const result = await repository.list();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("schema futuro foi aceito");
    expect(result.error.code).toBe("unsupported-schema");
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction([STORE_NAMES.characters], "readonly");
      const request = tx.objectStore(STORE_NAMES.characters).get("future");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect((raw as { schemaVersion: number }).schemaVersion).toBe(99);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAMES.characters], "readwrite");
      tx.objectStore(STORE_NAMES.characters).put({ id: "broken" });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const corrupt = await repository.list();
    if (corrupt.ok) throw new Error("registro corrompido foi omitido");
    expect(corrupt.error.code).toBe("corrupt-record");
  });

  it("DATA-007: deleteCampaignAndContent desvincula campaignId dos personagens da campanha", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const characters = new IndexedDbCharacterRepository(db, clock);
    const campaign: Campaign = {
      id: asUuid("99999999-9999-4999-8999-999999999999"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha órfã",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [minimalCharacter.id],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await characters.save({ ...minimalCharacter, campaignId: campaign.id }, asRevision(0))).ok).toBe(true);

    expect((await campaigns.deleteCampaignAndContent(campaign.id, asRevision(1))).ok).toBe(true);

    const character = unwrap(await characters.get(minimalCharacter.id));
    expect(character.campaignId).toBeUndefined();
  });

  it("DATA-007: deletar personagem remove seu id de campaign.characterIds", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const characters = new IndexedDbCharacterRepository(db, clock);
    const history = new IndexedDbDiceHistoryRepository(db, clock);
    const campaign: Campaign = {
      id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha com elenco",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [minimalCharacter.id],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    const receipt = {
      commandId: asCommandId("aaaaaaaa-aaaa-4aaa-8aaa-000000000001"),
      characterId: minimalCharacter.id,
      resultStatus: "success" as const,
      recordedAt: clock.now(),
      diceRollIds: [],
    };
    expect((await characters.save(minimalCharacter, asRevision(0), receipt)).ok).toBe(true);
    expect((await history.append({ roll: diceRollAdvantageSample, characterId: minimalCharacter.id })).ok).toBe(true);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAMES.drafts], "readwrite");
      tx.objectStore(STORE_NAMES.drafts).put({
        id: minimalCharacter.id,
        schemaVersion: 1,
        rulesetRef: fixtureRulesetRef,
        completedSteps: [],
        currentStep: "race",
        partial: {},
        pendingValidations: [],
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    expect((await characters.delete(minimalCharacter.id, asRevision(1))).ok).toBe(true);

    const stored = unwrap(await campaigns.get(campaign.id));
    expect(stored.characterIds).not.toContain(minimalCharacter.id);
    expect(unwrap(await history.list({ characterId: minimalCharacter.id })).entries).toHaveLength(0);
    expect((await characters.getDraft(minimalCharacter.id)).ok).toBe(false);
  });

  it("DATA-007: listMaps filtra por campaignId em vez de vazar todos os mapas", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const assets = new IndexedDbAssetRepository(db, clock);
    const campaignA: Campaign = {
      id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "A",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    const campaignB: Campaign = { ...campaignA, id: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), name: "B" };
    const assetId = asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    expect((await campaigns.save(campaignA, asRevision(0))).ok).toBe(true);
    expect((await campaigns.save(campaignB, asRevision(0))).ok).toBe(true);
    expect((await assets.put({ id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "hash", originalName: "map.png" })).ok).toBe(true);
    const mapA = { id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), campaignId: campaignA.id, name: "Mapa A", assetId, pins: [], revision: asRevision(0) };
    const mapB = { id: asUuid("ffffffff-ffff-4fff-8fff-ffffffffffff"), campaignId: campaignB.id, name: "Mapa B", assetId, pins: [], revision: asRevision(0) };
    expect((await campaigns.saveMap(mapA, asRevision(0))).ok).toBe(true);
    expect((await campaigns.saveMap(mapB, asRevision(0))).ok).toBe(true);

    const onlyA = unwrap(await campaigns.listMaps(campaignA.id));
    expect(onlyA.map((m) => m.id)).toEqual([mapA.id]);
  });

  it("DATA-007: saveMap rejeita campanha ou asset inexistente", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const assets = new IndexedDbAssetRepository(db, clock);
    const campaign: Campaign = {
      id: asUuid("12121212-1212-4121-8121-121212121212"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    const assetId = asUuid("13131313-1313-4131-8131-131313131313");
    expect((await assets.put({ id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "hash", originalName: "map.png" })).ok).toBe(true);

    const missingCampaign = await campaigns.saveMap(
      { id: asUuid("14141414-1414-4141-8141-141414141414"), campaignId: asUuid("00000000-0000-4000-8000-000000000000"), name: "M", assetId, pins: [], revision: asRevision(0) },
      asRevision(0),
    );
    expect(missingCampaign.ok).toBe(false);

    const missingAsset = await campaigns.saveMap(
      { id: asUuid("15151515-1515-4151-8151-151515151515"), campaignId: campaign.id, name: "M", assetId: asUuid("00000000-0000-4000-8000-000000000001"), pins: [], revision: asRevision(0) },
      asRevision(0),
    );
    expect(missingAsset.ok).toBe(false);
  });

  it("DATA-007: importAtomic rejeita campanha inexistente e par mapa/asset inconsistente", async () => {
    const campaigns = new IndexedDbCampaignRepository(db, clock);
    const assetId = asUuid("16161616-1616-4161-8161-161616161616");
    const asset = { id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "hash", originalName: "map.png" };
    const map = { id: asUuid("17171717-1717-4171-8171-171717171717"), campaignId: asUuid("00000000-0000-4000-8000-000000000002"), name: "M", assetId, pins: [], revision: asRevision(0) };

    const missingCampaign = await campaigns.importAtomic({ map, asset });
    expect(missingCampaign.ok).toBe(false);

    const campaign: Campaign = {
      id: asUuid("18181818-1818-4181-8181-181818181818"),
      schemaVersion: 1,
      revision: asRevision(0),
      name: "Campanha",
      description: "",
      rulesetRef: fixtureRulesetRef,
      characterIds: [],
      sessionCounter: 0,
      npcs: [],
      quests: [],
      objectives: [],
      settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
      createdAt: clock.now(),
      updatedAt: clock.now(),
    };
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    const mismatchedAsset = await campaigns.importAtomic({
      map: { ...map, campaignId: campaign.id, assetId: asUuid("00000000-0000-4000-8000-000000000003") },
      asset,
    });
    expect(mismatchedAsset.ok).toBe(false);
  });

  it("DATA-007: recovery restaura snapshot substituído e remove o registro após o commit", async () => {
    const characters = new IndexedDbCharacterRepository(db, clock);
    const recovery = new IndexedDbRecoveryRepository(db);
    expect((await characters.save(minimalCharacter, asRevision(0))).ok).toBe(true);
    const snapshot = { ...minimalCharacter, name: "Snapshot anterior" };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAMES.recovery], "readwrite");
      tx.objectStore(STORE_NAMES.recovery).put({ id: minimalCharacter.id, sourceStore: STORE_NAMES.characters, raw: snapshot, recordedAt: clock.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    expect(await recovery.restore(minimalCharacter.id)).toMatchObject({ ok: true });
    expect(unwrap(await characters.get(minimalCharacter.id)).name).toBe("Snapshot anterior");
    expect(unwrap(await recovery.list())).toHaveLength(0);
  });

  it("persiste assets e preferências sem usar IndexedDB para settings", async () => {
    const assets = new IndexedDbAssetRepository(db, clock);
    const asset = {
      id: asUuid("66666666-6666-4666-8666-666666666666"),
      mediaType: "image/png",
      bytes: new Uint8Array([1, 2, 3]),
      hash: "hash",
      originalName: "portrait.png",
    };
    expect((await assets.put(asset)).ok).toBe(true);
    const loaded = unwrap(await assets.get(asset.id));
    expect(loaded).toMatchObject({ id: asset.id, mediaType: asset.mediaType, hash: asset.hash, originalName: asset.originalName });
    expect(Array.from(loaded.bytes)).toEqual(Array.from(asset.bytes));

    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
      clear: () => void values.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
    const { LocalStorageSettingsRepository } = await import("../../preferences/settings-repository");
    const settings = new LocalStorageSettingsRepository(storage);
    expect(unwrap(await settings.get()).diceHistoryRetention).toBe(1000);
    expect(unwrap(await settings.update({ theme: "dark" })).theme).toBe("dark");
    expect(unwrap(await settings.reset()).theme).toBe("system");
  });
});

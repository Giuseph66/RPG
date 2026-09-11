import { beforeEach, describe, expect, it } from "vitest";

import { fixtureRulesetRef, minimalCharacter, diceRollAdvantageSample } from "@domain/contracts/fixtures";
import { asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { type Campaign, type Quest } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";

import { IndexedDbAssetRepository } from "./asset-repository";
import { IndexedDbCampaignRepository } from "./campaign-repository";
import { IndexedDbCharacterRepository } from "./character-repository";
import { IndexedDbDiceHistoryRepository } from "./dice-history-repository";
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

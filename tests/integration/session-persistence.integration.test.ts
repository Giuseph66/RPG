import { afterEach, describe, expect, it } from "vitest";
import { fixtureRulesetRef, minimalCharacter, diceRollAdvantageSample } from "@domain/contracts/fixtures";
import { asRevision } from "@domain/contracts/versioning";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import type { BackupEnvelope } from "@domain/contracts/backup";
import type { Character } from "@domain/contracts/character";
import { DataManagementService } from "@application/transfer";
import { DefaultBackupService, hashBytes, parseBackupJson } from "@application/transfer/backup";
import type { AtomicImportWriter, BackupServiceOptions } from "@application/transfer/types";
import { migratePayload } from "@infrastructure/persistence/migrations";
import { IndexedDbAssetRepository } from "@infrastructure/persistence/indexeddb/asset-repository";
import { IndexedDbCampaignRepository } from "@infrastructure/persistence/indexeddb/campaign-repository";
import { IndexedDbCharacterRepository } from "@infrastructure/persistence/indexeddb/character-repository";
import { IndexedDbDiceHistoryRepository } from "@infrastructure/persistence/indexeddb/dice-history-repository";
import { openDatabase } from "@infrastructure/persistence/indexeddb/open-database";
import { STORE_NAMES } from "@infrastructure/persistence/indexeddb/schema";
import { createCampaignApplicationService } from "@application/campaign";
import { canonicalAsset, canonicalCampaign, canonicalJournal, canonicalMap, integrationAssetId, integrationCampaignId } from "../fixtures/backups/canonical";

const clock = { now: () => asIsoTimestamp("2026-01-01T00:00:00.000Z") };
let sequence = 0;
const opened: IDBDatabase[] = [];

function unwrap<T>(result: Result<T, AppError>): T { if (!result.ok) throw new Error(result.error.message); return result.value; }
async function db(): Promise<IDBDatabase> { const result = await openDatabase({ name: `qa-002-${sequence++}` }); if (!result.ok) throw new Error(result.error.message); opened.push(result.value); return result.value; }
function repos(database: IDBDatabase) { return { characters: new IndexedDbCharacterRepository(database, clock), campaigns: new IndexedDbCampaignRepository(database, clock), assets: new IndexedDbAssetRepository(database, clock), dice: new IndexedDbDiceHistoryRepository(database, clock) }; }
function testIdGenerator() { let counter = 0; return { uuid: () => asUuid(`eeeeeeee-eeee-4eee-8eee-${String(++counter).padStart(12, "0")}`), commandId: () => `command-${++counter}` as never }; }
function service(database: IDBDatabase, writer: AtomicImportWriter["commitImport"]): DefaultBackupService {
  const current = repos(database);
  return new DefaultBackupService({ characters: current.characters, campaigns: current.campaigns, assets: current.assets, diceHistory: current.dice, commitImport: writer, idGenerator: testIdGenerator(), appVersion: "qa", now: clock.now } as BackupServiceOptions);
}
function decode(value: string): Uint8Array { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
function writeEnvelope(database: IDBDatabase, envelope: BackupEnvelope, abort = false): Promise<Result<{ readonly rootId: typeof envelope.rootId }, AppError>> {
  return new Promise((resolve) => {
    const tx = database.transaction(Object.values(STORE_NAMES), "readwrite");
    for (const character of envelope.records.characters) tx.objectStore(STORE_NAMES.characters).put(character);
    for (const campaign of envelope.records.campaigns) tx.objectStore(STORE_NAMES.campaigns).put(campaign);
    for (const entry of envelope.records.journalEntries) tx.objectStore(STORE_NAMES.journalEntries).put(entry);
    for (const map of envelope.records.maps) tx.objectStore(STORE_NAMES.maps).put(map);
    for (const roll of envelope.records.rolls) tx.objectStore(STORE_NAMES.rolls).put({ id: roll.id, roll, characterId: roll.characterId });
    for (const asset of envelope.assets) tx.objectStore(STORE_NAMES.assets).put({ id: asset.id, mediaType: asset.mediaType, bytes: decode(asset.bytes), hash: asset.hash, originalName: asset.id, width: asset.width, height: asset.height });
    tx.oncomplete = () => resolve(ok({ rootId: envelope.rootId }));
    tx.onerror = () => { /* onabort is the authoritative result */ };
    tx.onabort = () => resolve(err(appError.storageUnavailable("Transação de integração abortada.")));
    if (abort) queueMicrotask(() => tx.abort());
  });
}

afterEach(() => { while (opened.length) opened.pop()?.close(); });

describe("QA-002 sessão e persistência", () => {
  it("cria, hidrata e recarrega personagem com estado de dano/cura e rolagem", async () => {
    const database = await db(); const current = repos(database);
    const created = { ...minimalCharacter, hp: { current: 7, temp: 1 } };
    expect((await current.characters.save(created, asRevision(0))).ok).toBe(true);
    expect((await current.dice.append({ roll: diceRollAdvantageSample, characterId: created.id })).ok).toBe(true);
    const healed = { ...created, hp: { current: 10, temp: 0 } };
    expect((await current.characters.save(healed, asRevision(1))).ok).toBe(true);
    database.close();
    const reopened = unwrap(await openDatabase({ name: "qa-002-0" })); opened.push(reopened);
    const loaded = repos(reopened);
    expect(unwrap(await loaded.characters.get(created.id)).hp).toEqual({ current: 10, temp: 0 });
    expect(unwrap(await loaded.dice.list({ characterId: created.id })).entries).toHaveLength(1);
  });

  it("persiste campanha, nota, mapa e anexo em banco real", async () => {
    const database = await db(); const current = repos(database);
    expect((await current.campaigns.save(canonicalCampaign, asRevision(0))).ok).toBe(true);
    expect((await current.campaigns.saveJournalEntry(canonicalJournal)).ok).toBe(true);
    expect((await current.assets.put(canonicalAsset)).ok).toBe(true);
    expect((await current.campaigns.saveMap(canonicalMap, asRevision(0))).ok).toBe(true);
    expect(unwrap(await current.campaigns.get(canonicalCampaign.id)).name).toBe(canonicalCampaign.name);
    expect(unwrap(await current.campaigns.listJournalEntries(canonicalCampaign.id))).toHaveLength(1);
    expect(unwrap(await current.campaigns.listMaps(canonicalCampaign.id))[0]?.assetId).toBe(integrationAssetId);
    expect(Array.from(unwrap(await current.assets.get(integrationAssetId)).bytes)).toEqual(Array.from(canonicalAsset.bytes));
  });

  it("reabre campanha salva e hidrata a seleção do serviço em conexão nova", async () => {
    const name = `qa-r3-02-campaign-${sequence++}`;
    const database = unwrap(await openDatabase({ name }));
    opened.push(database);
    const current = repos(database);
    expect((await current.campaigns.save(canonicalCampaign, asRevision(0))).ok).toBe(true);
    database.close();

    const reopened = unwrap(await openDatabase({ name }));
    opened.push(reopened);
    const service = createCampaignApplicationService({ repository: repos(reopened).campaigns });
    const restored = await service.hydrate(canonicalCampaign.id);

    expect(restored).toMatchObject({ ok: true });
    expect(service.store.selectedId).toBe(canonicalCampaign.id);
    expect(service.store.getSnapshot().value?.name).toBe(canonicalCampaign.name);
    service.dispose();
  });

  it("demonstra CAS real entre duas conexões", async () => {
    const database = await db(); const second = unwrap(await openDatabase({ name: "qa-002-2" })); opened.push(second);
    const left = repos(database).characters; const right = repos(second).characters;
    expect((await left.save(minimalCharacter, asRevision(0))).ok).toBe(true);
    const [one, two] = await Promise.all([left.save({ ...minimalCharacter, name: "A" }, asRevision(1)), right.save({ ...minimalCharacter, name: "B" }, asRevision(1))]);
    expect([one.ok, two.ok].sort()).toEqual([false, true]);
  });

  it("exporta/importa personagem e anexo com API real de transferência", async () => {
    const source = await db(); const sourceRepos = repos(source);
    const character = { ...minimalCharacter, portraitAssetId: integrationAssetId };
    expect((await sourceRepos.characters.save(character, asRevision(0))).ok).toBe(true);
    const asset = { ...canonicalAsset, hash: hashBytes(canonicalAsset.bytes) };
    expect((await sourceRepos.assets.put(asset)).ok).toBe(true);
    const exported = await new DefaultBackupService({ characters: sourceRepos.characters, campaigns: sourceRepos.campaigns, assets: sourceRepos.assets, appVersion: "qa", now: clock.now, commitImport: async () => err(appError.storageUnavailable("não usado")) } as BackupServiceOptions).exportCharacter(character.id);
    const envelope = unwrap(exported); const parsed = unwrap(parseBackupJson(JSON.stringify(envelope)));
    const quotaService = new DefaultBackupService({ characters: sourceRepos.characters, campaigns: sourceRepos.campaigns, assets: sourceRepos.assets, appVersion: "qa", now: clock.now, maxImportBytes: 1, commitImport: async () => writeEnvelope(source, envelope) } as BackupServiceOptions);
    expect(await quotaService.commitImport(parsed, "replace")).toMatchObject({ ok: false, error: { code: "quota-exceeded" } });
    const target = await db(); const targetService = service(target, ({ envelope: input }) => writeEnvelope(target, input));
    expect((await targetService.commitImport(parsed, "copy")).ok).toBe(true);
    const targetRepos = repos(target); expect((await targetRepos.characters.get(character.id)).ok).toBe(false);
    const copied = unwrap(await targetRepos.characters.list()); expect(copied).toHaveLength(1);
    expect(Array.from(unwrap(await targetRepos.assets.get(asUuid("eeeeeeee-eeee-4eee-8eee-000000000002"))).bytes)).toEqual(Array.from(asset.bytes));
  });

  it("não grava quando migração falha e reset seletivo preserva campanhas", async () => {
    const database = await db(); const current = repos(database);
    expect((await current.campaigns.save(canonicalCampaign, asRevision(0))).ok).toBe(true);
    expect((await current.characters.save(minimalCharacter, asRevision(0))).ok).toBe(true);
    const migration = migratePayload({ value: 1 }, 1, [{ fromVersion: 1, toVersion: 2, migrate: () => err(appError.validation("migration", "falha")) }], 2);
    expect(migration).toMatchObject({ ok: false }); expect(unwrap(await current.campaigns.get(canonicalCampaign.id)).name).toBe(canonicalCampaign.name);
    const management = new DataManagementService({ backup: { exportCharacter: () => Promise.reject(), exportCampaign: () => Promise.reject(), previewImport: () => Promise.reject(), commitImport: () => Promise.reject() } as never, reset: async ({ scope }) => new Promise((resolve) => { const tx = database.transaction([scope === "characters" ? STORE_NAMES.characters : STORE_NAMES.campaigns], "readwrite"); tx.objectStore(scope === "characters" ? STORE_NAMES.characters : STORE_NAMES.campaigns).clear(); tx.oncomplete = () => resolve(ok(undefined)); tx.onerror = () => resolve(err(appError.storageUnavailable("reset"))); }) });
    expect((await management.reset({ scope: "characters", confirmation: "explicit" })).ok).toBe(true);
    expect((await current.characters.get(minimalCharacter.id)).ok).toBe(false); expect((await current.campaigns.get(canonicalCampaign.id)).ok).toBe(true);
  });

  it("preserva original quando commit real é abortado", async () => {
    const source = await db(); const sourceRepos = repos(source); expect((await sourceRepos.characters.save(minimalCharacter, asRevision(0))).ok).toBe(true);
    const envelope = unwrap(await new DefaultBackupService({ characters: sourceRepos.characters, campaigns: sourceRepos.campaigns, assets: sourceRepos.assets, appVersion: "qa", now: clock.now, commitImport: async () => err(appError.storageUnavailable("não usado")) } as BackupServiceOptions).exportCharacter(minimalCharacter.id));
    const target = await db(); const targetRepos = repos(target); const original = { ...minimalCharacter, name: "Original" }; expect((await targetRepos.characters.save(original, asRevision(0))).ok).toBe(true);
    const failed = await service(target, ({ envelope: input }) => writeEnvelope(target, input, true)).commitImport(envelope, "replace");
    expect(failed.ok).toBe(false); expect(unwrap(await targetRepos.characters.get(minimalCharacter.id)).name).toBe("Original");
  });
});

import { describe, expect, it, vi } from "vitest";
import { asAccountId, asEntityId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { appError, ok, type AppError, type Result } from "@domain/contracts/errors";
import { fixtureRulesetRef, minimalCharacter } from "@domain/contracts/fixtures";
import type { Character } from "@domain/contracts/character";
import type { BackupEnvelope } from "@domain/contracts/backup";
import { migratePayload } from "@infrastructure/persistence/migrations";
import { DefaultBackupService, hashBytes, parseBackupJson } from "./backup";
import type { BackupServiceOptions } from "./types";
import { CREATURE_SCHEMA_VERSION, sightingId, type CreatureGuess, type CreatureProposal, type CreatureRecord, type CreatureSighting } from "@domain/campaign/creatures";
import type { CreatureStatBlock } from "@domain/creatures";
import type { Campaign } from "@domain/contracts/campaign";
import type { JourneyVisibilityKind } from "@application/ports/journey-visibility-repository";

const id = asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const now = () => asIsoTimestamp("2024-01-01T00:00:00.000Z");

function makeService(character: Character = minimalCharacter, commit: ReturnType<typeof vi.fn> = vi.fn(async (): Promise<Result<{ readonly rootId: typeof character.id }, AppError>> => ok({ rootId: character.id })), journeyRecords: Partial<Record<JourneyVisibilityKind, readonly unknown[]>> = {}): { service: DefaultBackupService; commit: ReturnType<typeof vi.fn>; character: Character } {
  const characters = { get: vi.fn(async () => ok(character)), list: vi.fn(async () => ok([{ id: character.id, name: character.name, raceRef: character.raceRef, classSummary: [], totalLevel: 1, updatedAt: character.updatedAt, revision: character.revision }])), save: vi.fn(), delete: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn() };
  const campaigns = { get: vi.fn(), list: vi.fn(async () => ok([])), save: vi.fn(), delete: vi.fn(), getJournalEntry: vi.fn(), listJournalEntries: vi.fn(), saveJournalEntry: vi.fn(), deleteJournalEntry: vi.fn(), getMap: vi.fn(), listMaps: vi.fn(), saveMap: vi.fn(), deleteMap: vi.fn(), addMapPin: vi.fn(), updateMapPin: vi.fn(), removeMapPin: vi.fn(), saveQuest: vi.fn(), deleteQuest: vi.fn(), saveNpc: vi.fn(), deleteNpc: vi.fn(), importAtomic: vi.fn() };
  const assets = { get: vi.fn(), put: vi.fn(), delete: vi.fn() };
  const journey = { list: vi.fn(async (kind: JourneyVisibilityKind) => ok((journeyRecords[kind] ?? []) as never)) };
  const options = { characters, campaigns, assets, journey, commitImport: commit, appVersion: "test", now } as unknown as BackupServiceOptions;
  return { service: new DefaultBackupService(options), commit, character };
}

const campaignId = asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
const accountId = asAccountId("player-backup");
const statBlock: CreatureStatBlock = {
  id: asEntityId("backup-wolf"), name: "Lobo do backup", creatureType: "beast", size: "medium", armorClass: 13,
  hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: 900 as never },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
};
const creature: CreatureRecord = {
  id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), campaignId, schemaVersion: CREATURE_SCHEMA_VERSION, revision: 2 as never,
  kind: "animal", name: statBlock.name, appearance: "", race: "beast", description: "", hitPoints: "11", armorClass: "13", abilities: "", notes: "",
  statBlock, reveals: [{ accountId, fields: ["name", "kind", "statBlock"] }], createdAt: now(), updatedAt: now(),
};
const sightingIdForTest = sightingId(creature.id, accountId);
const sighting: CreatureSighting = {
  id: sightingIdForTest, campaignId, creatureId: creature.id, accountId, schemaVersion: CREATURE_SCHEMA_VERSION, revision: 1 as never,
  kind: "animal", revealed: { name: creature.name, statBlock }, createdAt: now(), updatedAt: now(),
};
const guess: CreatureGuess = {
  id: sightingIdForTest, campaignId, creatureId: creature.id, accountId, schemaVersion: CREATURE_SCHEMA_VERSION, revision: 1 as never,
  kind: "animal", name: "Lobo cinzento", note: "Rastros frescos", fields: { appearance: "pelagem cinza" }, createdAt: now(), updatedAt: now(),
};
const proposal: CreatureProposal = {
  id: "proposal__eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", campaignId, schemaVersion: CREATURE_SCHEMA_VERSION, revision: 0 as never,
  proposedBy: accountId, status: "pending", statBlock, suggestionReasons: ["Teste de backup"], createdAt: now(), updatedAt: now(),
};
const campaign: Campaign = {
  id: campaignId, schemaVersion: 1, revision: 0 as never, name: "Backup de campanha", description: "", rulesetRef: fixtureRulesetRef,
  characterIds: [minimalCharacter.id], sessionCounter: 0, npcs: [], quests: [], objectives: [],
  settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" }, createdAt: now(), updatedAt: now(),
};
const activeCharacter: Character = {
  ...minimalCharacter,
  campaignId,
  transformation: {
    id: asUuid("ffffffff-ffff-4fff-8fff-ffffffffffff"), formRef: { ...minimalCharacter.raceRef, entityId: statBlock.id },
    originalSnapshotRef: minimalCharacter.id, originalSnapshot: minimalCharacter, originalMaximumHitPoints: 10,
    formSnapshot: statBlock, formMaximumHitPoints: 11, formHp: { current: 7, temp: 2 }, duration: { kind: "minutes", value: 60 },
    equipmentDisposition: "worn", retainedFeatureIds: [],
  },
  beastSightings: [{ beastRef: { ...minimalCharacter.raceRef, entityId: statBlock.id } }],
};

describe("DATA-006 backup transfer", () => {
  it("faz round trip JSON e preserva asset validado por hash", async () => {
    const asset = { id, mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]), hash: hashBytes(new Uint8Array([1, 2, 3])), originalName: "portrait.png" };
    const character = { ...minimalCharacter, portraitAssetId: id };
    const { service } = makeService(character);
    const repositories = (service as unknown as { options: BackupServiceOptions }).options;
    vi.mocked(repositories.assets.get).mockResolvedValue(ok(asset));
    const exported = await service.exportCharacter(character.id);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const parsed = parseBackupJson(JSON.stringify(exported.value));
    expect(parsed).toMatchObject({ ok: true, value: { rootId: character.id, assets: [{ id, hash: asset.hash }] } });
  });

  it("rejeita JSON malicioso, IDs duplicados e backup acima da cota", () => {
    expect(parseBackupJson("{\"__proto__\":{\"polluted\":true}}" as string)).toMatchObject({ ok: false, error: { code: "validation-error" } });
    expect(parseBackupJson("x".repeat(100), { maxBytes: 10 })).toMatchObject({ ok: false, error: { code: "quota-exceeded" } });
  });

  it("executa migrações em cadeia sem alterar o payload original", () => {
    const source = { name: "antigo" };
    const result = migratePayload(source, 1, [{ fromVersion: 1, toVersion: 2, migrate: (value) => ok({ ...(value as object), one: true }) }, { fromVersion: 2, toVersion: 3, migrate: (value) => ok({ ...(value as object), two: true }) }], 3);
    expect(result).toMatchObject({ ok: true, value: { name: "antigo", one: true, two: true } });
    expect(source).toEqual({ name: "antigo" });
  });

  it("expõe colisão no preview e mantém commit atômico delegado", async () => {
    const commit = vi.fn(async () => ({ ok: false as const, error: appError.storageUnavailable("quota") }));
    const { service, character } = makeService(minimalCharacter, commit);
    const exported = await service.exportCharacter(character.id);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const preview = await service.previewImport(exported.value);
    expect(preview).toMatchObject({ ok: true, value: { conflicts: [{ kind: "duplicate-id", id: character.id }] } });
    const imported = await service.commitImport(exported.value, "replace");
    expect(imported).toMatchObject({ ok: false, error: { code: "storage-unavailable" } });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("permite cópia de uma colisão com IDs remapeados", async () => {
    const copiedId = asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    const commit = vi.fn(async ({ envelope }: { readonly envelope: BackupEnvelope }) => ok({ rootId: envelope.rootId }));
    const { service, character } = makeService(minimalCharacter, commit);
    const options = (service as unknown as { options: BackupServiceOptions }).options;
    Object.assign(options, { idGenerator: { uuid: () => copiedId } });
    const exported = await service.exportCharacter(character.id);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const imported = await service.commitImport(exported.value, "copy");
    expect(imported).toMatchObject({ ok: true, value: { rootId: copiedId } });
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ mode: "copy", envelope: expect.objectContaining({ rootId: copiedId }) }));
  });

  it("copia os agregados de criaturas remapeando referências sem trocar as contas", async () => {
    const expectedIds = {
      character: asUuid("11111111-1111-4111-8111-111111111111"),
      campaign: asUuid("22222222-2222-4222-8222-222222222222"),
      creature: asUuid("33333333-3333-4333-8333-333333333333"),
      proposal: asUuid("66666666-6666-4666-8666-666666666666"),
    };
    const remappedIds = [
      expectedIds.character, // personagem
      expectedIds.campaign, // campanha
      expectedIds.creature, // criatura
      asUuid("44444444-4444-4444-8444-444444444444"), // ID intermediário da projeção
      asUuid("55555555-5555-4555-8555-555555555555"), // ID intermediário da proposta
      expectedIds.proposal, // proposta
    ];
    const reviewedBy = asAccountId("master-backup");
    const approvedProposal: CreatureProposal = {
      ...proposal,
      revision: 1 as never,
      status: "approved",
      reviewedStatBlock: statBlock,
      reviewedBy,
      reviewedAt: now(),
      creatureId: creature.id,
    };
    let copiedEnvelope: BackupEnvelope | undefined;
    const commit = vi.fn(async ({ envelope }: { readonly envelope: BackupEnvelope }) => {
      copiedEnvelope = envelope;
      return ok({ rootId: envelope.rootId });
    });
    const { service } = makeService(activeCharacter, commit, { creature: [creature], sighting: [sighting], guess: [guess], proposal: [approvedProposal] });
    const options = (service as unknown as { options: BackupServiceOptions }).options;
    Object.assign(options, { idGenerator: { uuid: () => {
      const next = remappedIds.shift();
      if (!next) throw new Error("ID inesperado durante remapeamento");
      return next;
    } } });
    vi.mocked(options.campaigns.get).mockResolvedValue(ok(campaign));
    vi.mocked(options.campaigns.listJournalEntries).mockResolvedValue(ok([]));
    vi.mocked(options.campaigns.listMaps).mockResolvedValue(ok([]));
    vi.mocked(options.characters.list).mockResolvedValue(ok([{ id: activeCharacter.id, name: activeCharacter.name, raceRef: activeCharacter.raceRef, classSummary: [], totalLevel: 1, updatedAt: activeCharacter.updatedAt, revision: activeCharacter.revision }]));

    const exported = await service.exportCampaign(campaignId);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(await service.commitImport(exported.value, "copy")).toMatchObject({ ok: true, value: { rootId: expectedIds.campaign } });
    expect(copiedEnvelope).toBeDefined();
    if (!copiedEnvelope) return;

    const [copiedCharacter] = copiedEnvelope.records.characters;
    const [copiedCampaign] = copiedEnvelope.records.campaigns;
    const [copiedCreature] = copiedEnvelope.records.creatures ?? [];
    const [copiedSighting] = copiedEnvelope.records.sightings ?? [];
    const [copiedGuess] = copiedEnvelope.records.guesses ?? [];
    const [copiedProposal] = copiedEnvelope.records.proposals ?? [];
    expect(copiedEnvelope.rootId).toBe(expectedIds.campaign);
    expect(copiedCharacter?.id).toBe(expectedIds.character);
    expect(copiedCampaign).toMatchObject({ id: expectedIds.campaign, characterIds: [expectedIds.character] });
    expect(copiedCreature).toMatchObject({ id: expectedIds.creature, campaignId: expectedIds.campaign });
    expect(copiedSighting).toMatchObject({ id: sightingId(expectedIds.creature, accountId), campaignId: expectedIds.campaign, creatureId: expectedIds.creature, accountId });
    expect(copiedGuess).toMatchObject({ id: sightingId(expectedIds.creature, accountId), campaignId: expectedIds.campaign, creatureId: expectedIds.creature, accountId });
    expect(copiedProposal).toMatchObject({
      id: `proposal__${expectedIds.proposal}`,
      campaignId: expectedIds.campaign,
      creatureId: expectedIds.creature,
      proposedBy: accountId,
      reviewedBy,
    });
    expect(remappedIds).toHaveLength(0);
  });

  it("exporta e restaura campanha com forma ativa, avistamento, criatura, proposta, projeção e palpite", async () => {
    const commit = vi.fn(async ({ envelope }: { readonly envelope: BackupEnvelope }) => ok({ rootId: envelope.rootId }));
    const { service } = makeService(activeCharacter, commit, { creature: [creature], sighting: [sighting], guess: [guess], proposal: [proposal] });
    const options = (service as unknown as { options: BackupServiceOptions }).options;
    vi.mocked(options.campaigns.get).mockResolvedValue(ok(campaign));
    vi.mocked(options.campaigns.listJournalEntries).mockResolvedValue(ok([]));
    vi.mocked(options.campaigns.listMaps).mockResolvedValue(ok([]));
    vi.mocked(options.characters.list).mockResolvedValue(ok([{ id: activeCharacter.id, name: activeCharacter.name, raceRef: activeCharacter.raceRef, classSummary: [], totalLevel: 1, updatedAt: activeCharacter.updatedAt, revision: activeCharacter.revision }]));

    const exported = await service.exportCampaign(campaignId);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const roundTrip = parseBackupJson(JSON.stringify(exported.value));
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    const restoredCharacter = roundTrip.value.records.characters[0];
    expect(restoredCharacter?.hp).toEqual(activeCharacter.hp);
    expect(restoredCharacter?.transformation).toMatchObject({
      formHp: { current: 7, temp: 2 },
      formMaximumHitPoints: 11,
      originalMaximumHitPoints: 10,
      originalSnapshot: activeCharacter.transformation?.originalSnapshot,
      formSnapshot: statBlock,
    });
    expect(restoredCharacter?.beastSightings).toEqual(activeCharacter.beastSightings);
    expect(roundTrip.value.records.creatures).toEqual([creature]);
    expect(roundTrip.value.records.creatures[0]?.reveals).toEqual([{ accountId, fields: ["name", "kind", "statBlock"] }]);
    expect(roundTrip.value.records.sightings).toEqual([sighting]);
    expect(roundTrip.value.records.guesses).toEqual([guess]);
    expect(roundTrip.value.records.proposals).toEqual([proposal]);

    const imported = await service.commitImport(roundTrip.value, "replace");
    expect(imported).toEqual({ ok: true, value: { rootId: campaignId } });
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ envelope: expect.objectContaining({ records: expect.objectContaining({ creatures: [creature], proposals: [proposal] }) }) }));

    const invalid = { ...roundTrip.value, records: { ...roundTrip.value.records, proposals: [{ ...proposal, statBlock: null }] } } as unknown as BackupEnvelope;
    expect((await service.commitImport(invalid, "replace")).ok).toBe(false);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("normaliza backups legados sem coleções de criatura para arrays vazios", async () => {
    const { service, character } = makeService();
    const exported = await service.exportCharacter(character.id);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const legacy = JSON.parse(JSON.stringify(exported.value)) as Record<string, unknown>;
    const records = legacy.records as Record<string, unknown>;
    delete records.creatures; delete records.sightings; delete records.guesses; delete records.proposals;
    const parsed = parseBackupJson(JSON.stringify(legacy));
    expect(parsed).toMatchObject({ ok: true, value: { records: { creatures: [], sightings: [], guesses: [], proposals: [] } } });
  });
});

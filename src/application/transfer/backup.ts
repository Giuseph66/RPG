import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { BACKUP_FORMAT_VERSION, type BackupEnvelope, type BackupKind, type ExportedAsset, type ImportConflict, type ImportMode, type ImportPreview } from "@domain/contracts/backup";
import { CHARACTER_SCHEMA_VERSION, type Character } from "@domain/contracts/character";
import { CAMPAIGN_SCHEMA_VERSION, type Asset, type Campaign, type JournalEntry, type MapRecord } from "@domain/contracts/campaign";
import { asIsoTimestamp, isUuid, type RulesetRef, type Uuid } from "@domain/contracts/ids";
import type { DiceRoll } from "@domain/contracts/dice";
import { isCreatureGuess, isCreatureProposal, isCreatureRecord, isCreatureSighting, sightingId, type CreatureGuess, type CreatureProposal, type CreatureRecord, type CreatureSighting } from "@domain/campaign/creatures";
import type { BackupMigration } from "@infrastructure/persistence/migrations";
import { CURRENT_BACKUP_SCHEMA_VERSION, migratePayload } from "@infrastructure/persistence/migrations";
import type { BackupService } from "@application/ports/backup-service";
import type { BackupRepositories, BackupServiceOptions } from "./types";

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_COLLECTION_ITEMS = 10_000;
const FORMAT = "rpg-companion-backup" as const;

function fail(field: string, message: string): Result<never, AppError> { return err(appError.validation(field, message)); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function byteLength(value: string): number { return new TextEncoder().encode(value).byteLength; }

/** Hash estável e local, suficiente para detectar alteração/corrupção no envelope. */
export function hashBytes(bytes: Uint8Array): string {
  let hash = 2166136261;
  for (const byte of bytes) { hash ^= byte; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}

function decodeBase64(value: string): Uint8Array | undefined {
  try {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) return undefined;
    if (typeof atob === "function") {
      const binary = atob(value); const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    return new Uint8Array(Buffer.from(value, "base64"));
  } catch { return undefined; }
}

function hasForbiddenKey(value: unknown, depth = 0, seen = new Set<object>()): boolean {
  if (depth > 40) return true;
  if (Array.isArray(value)) {
    if (seen.has(value)) return true;
    seen.add(value);
    const invalid = value.some((entry) => hasForbiddenKey(entry, depth + 1, seen));
    seen.delete(value);
    return invalid;
  }
  if (!isRecord(value)) return typeof value === "number" && !Number.isFinite(value);
  if (seen.has(value)) return true;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype" || hasForbiddenKey(child, depth + 1, seen)) return true;
  }
  seen.delete(value);
  return false;
}

function validateAsset(value: unknown, maxAssetBytes: number): value is ExportedAsset {
  if (!isRecord(value) || typeof value.id !== "string" || !isUuid(value.id) || value.encoding !== "base64" || typeof value.bytes !== "string" || typeof value.hash !== "string" || typeof value.mediaType !== "string") return false;
  const bytes = decodeBase64(value.bytes); return bytes !== undefined && bytes.byteLength <= maxAssetBytes && hashBytes(bytes) === value.hash;
}

function validateEnvelope(value: unknown, maxAssetBytes: number): Result<BackupEnvelope, AppError> {
  if (!isRecord(value) || value.format !== FORMAT || value.formatVersion !== BACKUP_FORMAT_VERSION) return fail("format", "Envelope de backup desconhecido ou incompatível.");
  const schemaVersion = value.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) return fail("schemaVersion", "schemaVersion inválido.");
  if (schemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) return err(appError.unsupportedSchema(schemaVersion, { min: 1, max: CURRENT_BACKUP_SCHEMA_VERSION }));
  if (value.kind !== "character" && value.kind !== "campaign") return fail("kind", "Tipo de backup inválido.");
  if (typeof value.rootId !== "string" || !isUuid(value.rootId)) return fail("rootId", "rootId inválido.");
  const rawRecords = value.records;
  if (!isRecord(rawRecords) || !Array.isArray(rawRecords.characters) || !Array.isArray(rawRecords.campaigns) || !Array.isArray(rawRecords.journalEntries) || !Array.isArray(rawRecords.maps) || !Array.isArray(rawRecords.rolls) || !Array.isArray(rawRecords.favorites) || !Array.isArray(value.assets)) return fail("records", "Coleções do backup estão inválidas.");
  const optionalCollections = ["creatures", "sightings", "guesses", "proposals"] as const;
  if (optionalCollections.some((key) => rawRecords[key] !== undefined && !Array.isArray(rawRecords[key]))) return fail("records", "Coleções de criaturas estão inválidas.");
  const records = {
    characters: rawRecords.characters,
    campaigns: rawRecords.campaigns,
    journalEntries: rawRecords.journalEntries,
    maps: rawRecords.maps,
    rolls: rawRecords.rolls,
    favorites: rawRecords.favorites,
    creatures: Array.isArray(rawRecords.creatures) ? rawRecords.creatures : [],
    sightings: Array.isArray(rawRecords.sightings) ? rawRecords.sightings : [],
    guesses: Array.isArray(rawRecords.guesses) ? rawRecords.guesses : [],
    proposals: Array.isArray(rawRecords.proposals) ? rawRecords.proposals : [],
  };
  const collections = [records.characters, records.campaigns, records.journalEntries, records.maps, records.rolls, records.favorites, records.creatures, records.sightings, records.guesses, records.proposals, value.assets] as readonly unknown[][];
  if (collections.some((collection) => collection.length > MAX_COLLECTION_ITEMS)) return fail("records", "Backup contém coleções excessivamente grandes.");
  if (!records.characters.every(isObjectWithId) || !records.campaigns.every(isObjectWithId) || !records.journalEntries.every(isObjectWithId) || !records.maps.every(isObjectWithId) || !records.rolls.every(isObjectWithId) || !records.favorites.every((id) => typeof id === "string" && isUuid(id)) || !records.creatures.every(isCreatureRecord) || !records.sightings.every(isCreatureSighting) || !records.guesses.every(isCreatureGuess) || !records.proposals.every(isCreatureProposal) || !value.assets.every((asset) => validateAsset(asset, maxAssetBytes))) return fail("records", "Registro ou asset inválido.");
  const idCollections = [records.characters, records.campaigns, records.journalEntries, records.maps, records.rolls, records.creatures, records.sightings, records.guesses, records.proposals, value.assets] as readonly unknown[][];
  if (idCollections.some((collection) => {
    const ids = collection.map((record) => (record as { readonly id: string }).id);
    return new Set(ids).size !== ids.length;
  })) return fail("records", "IDs duplicados dentro de uma coleção do backup.");
  const rootRecords = value.kind === "character" ? records.characters : records.campaigns;
  if (!rootRecords.some((record) => (record as { readonly id: string }).id === value.rootId)) return fail("rootId", "O agregado raiz não existe no backup.");
  if (value.kind === "character" && (records.campaigns.length || records.journalEntries.length || records.maps.length || records.creatures.length || records.sightings.length || records.guesses.length || records.proposals.length)) return fail("kind", "Backup de personagem não pode conter dados da campanha.");
  if (!isRecord(value.manifest) || !isRecord(value.manifest.counts) || !isRecord(value.manifest.hashes)) return fail("manifest", "Manifesto inválido.");
  if (!Array.isArray(value.rulesetRefs) || !value.rulesetRefs.every((ref) => isRecord(ref) && typeof ref.id === "string" && typeof ref.version === "string")) return fail("rulesetRefs", "Referência de ruleset inválida.");
  if (typeof value.exportedAt !== "string" || typeof value.appVersion !== "string") return fail("envelope", "Metadados do backup inválidos.");
  return ok({ ...value, records } as unknown as BackupEnvelope);
}

function isObjectWithId(value: unknown): value is Record<string, unknown> { return isRecord(value) && typeof value.id === "string" && isUuid(value.id); }

/** Parser único para uploads: valida antes de o payload chegar ao serviço de persistência. */
export function parseBackupJson(input: string, options: { readonly maxBytes?: number; readonly maxAssetBytes?: number } = {}): Result<BackupEnvelope, AppError> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (typeof input !== "string" || byteLength(input) > maxBytes) return err(appError.quotaExceeded("Backup excede o limite de tamanho.", byteLength(input), maxBytes));
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { return fail("json", "JSON inválido."); }
  if (hasForbiddenKey(parsed)) return fail("json", "Payload rejeitado por profundidade, número inválido ou chave proibida.");
  return validateEnvelope(parsed, options.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES);
}

function toAsset(asset: Asset): ExportedAsset { return { id: asset.id, mediaType: asset.mediaType, encoding: "base64", bytes: encodeBase64(asset.bytes), hash: hashBytes(asset.bytes), width: asset.width, height: asset.height }; }
function emptyRecords() { return { characters: [] as readonly Character[], campaigns: [] as readonly Campaign[], journalEntries: [] as readonly JournalEntry[], maps: [] as readonly MapRecord[], rolls: [] as readonly DiceRoll[], favorites: [] as readonly Uuid[], creatures: [] as readonly CreatureRecord[], sightings: [] as readonly CreatureSighting[], guesses: [] as readonly CreatureGuess[], proposals: [] as readonly CreatureProposal[] }; }
function counts(records: ReturnType<typeof emptyRecords>, assets: readonly ExportedAsset[]): Readonly<Record<string, number>> { return { characters: records.characters.length, campaigns: records.campaigns.length, journalEntries: records.journalEntries.length, maps: records.maps.length, rolls: records.rolls.length, favorites: records.favorites.length, creatures: records.creatures.length, sightings: records.sightings.length, guesses: records.guesses.length, proposals: records.proposals.length, assets: assets.length }; }

function refsFor(records: ReturnType<typeof emptyRecords>, assets: readonly ExportedAsset[]): Set<string> {
  const refs = new Set<string>();
  for (const character of records.characters) if (character.portraitAssetId) refs.add(character.portraitAssetId);
  for (const map of records.maps) refs.add(map.assetId);
  return new Set([...refs, ...assets.map((asset) => asset.id)]);
}

async function assetFor(id: Uuid, assets: BackupRepositories["assets"]): Promise<Result<Asset, AppError>> { return assets.get(id); }

export class DefaultBackupService implements BackupService {
  private readonly options: BackupServiceOptions;
  constructor(options: BackupServiceOptions) { this.options = options; }

  async exportCharacter(characterId: Uuid): Promise<Result<BackupEnvelope, AppError>> {
    const character = await this.options.characters.get(characterId); if (!character.ok) return character;
    // O backup de personagem é autocontido; o vínculo com campanha só é exportado junto
    // com o agregado de campanha (a identidade narrativa do personagem permanece intacta).
    const detached = character.value.campaignId === undefined ? character.value : { ...character.value, campaignId: undefined };
    const records = { ...emptyRecords(), characters: [detached] };
    const assets: ExportedAsset[] = [];
    if (character.value.portraitAssetId) { const asset = await assetFor(character.value.portraitAssetId, this.options.assets); if (!asset.ok) return asset; assets.push(toAsset(asset.value)); }
    return this.envelope("character", character.value.id, records, assets, character.value.rulesetRef);
  }

  async exportCampaign(campaignId: Uuid): Promise<Result<BackupEnvelope, AppError>> {
    const campaign = await this.options.campaigns.get(campaignId); if (!campaign.ok) return campaign;
    const characters = await this.options.characters.list({ campaignId }); if (!characters.ok) return characters;
    const fullCharacters: Character[] = [];
    const assets: ExportedAsset[] = [];
    for (const summary of characters.value) { const character = await this.options.characters.get(summary.id); if (!character.ok) return character; fullCharacters.push(character.value); if (character.value.portraitAssetId) { const asset = await assetFor(character.value.portraitAssetId, this.options.assets); if (!asset.ok) return asset; assets.push(toAsset(asset.value)); } }
    const journalResult = await this.options.campaigns.listJournalEntries(campaignId); if (!journalResult.ok) return journalResult;
    const mapsResult = await this.options.campaigns.listMaps(campaignId); if (!mapsResult.ok) return mapsResult;
    const creaturesResult = await this.options.journey.list("creature", campaignId); if (!creaturesResult.ok) return creaturesResult;
    const sightingsResult = await this.options.journey.list("sighting", campaignId); if (!sightingsResult.ok) return sightingsResult;
    const guessesResult = await this.options.journey.list("guess", campaignId); if (!guessesResult.ok) return guessesResult;
    const proposalsResult = await this.options.journey.list("proposal", campaignId); if (!proposalsResult.ok) return proposalsResult;
    for (const map of mapsResult.value) { const asset = await assetFor(map.assetId, this.options.assets); if (!asset.ok) return asset; if (!assets.some((entry) => entry.id === asset.value.id)) assets.push(toAsset(asset.value)); }
    const records = { ...emptyRecords(), campaigns: [campaign.value], characters: fullCharacters, journalEntries: journalResult.value, maps: mapsResult.value, creatures: creaturesResult.value, sightings: sightingsResult.value, guesses: guessesResult.value, proposals: proposalsResult.value };
    return this.envelope("campaign", campaign.value.id, records, assets, campaign.value.rulesetRef);
  }

  async previewImport(input: BackupEnvelope): Promise<Result<ImportPreview, AppError>> {
    const checked = this.prepare(input); if (!checked.ok) return checked;
    const conflicts: ImportConflict[] = [];
    const existing = await this.existingIds(checked.value.kind); if (!existing.ok) return existing;
    for (const id of idsIn(checked.value)) if (existing.value.has(id)) conflicts.push({ kind: "duplicate-id", id: id as Uuid, entity: "state" });
    for (const ref of checked.value.rulesetRefs) if (this.options.availableRulesets && !this.options.availableRulesets.some((candidate) => candidate.id === ref.id && candidate.version === ref.version)) conflicts.push({ kind: "missing-ruleset", rulesetRef: ref });
    conflicts.push(...brokenReferences(checked.value));
    const root = checked.value.kind === "character" ? checked.value.records.characters.find((record) => record.id === checked.value.rootId)?.name : checked.value.records.campaigns.find((record) => record.id === checked.value.rootId)?.name;
    return ok({ kind: checked.value.kind, rootName: root ?? "Backup sem nome", schemaVersion: checked.value.schemaVersion, rulesetRefs: checked.value.rulesetRefs, counts: checked.value.manifest.counts, conflicts, warnings: checked.value.schemaVersion < CURRENT_BACKUP_SCHEMA_VERSION ? ["Backup migrado em memória; o arquivo original permanece intacto."] : [], estimatedBytes: byteLength(JSON.stringify(checked.value)) });
  }

  async commitImport(input: BackupEnvelope, mode: ImportMode): Promise<Result<{ readonly rootId: Uuid }, AppError>> {
    const prepared = this.prepare(input); if (!prepared.ok) return prepared;
    const preview = await this.previewImport(prepared.value); if (!preview.ok) return preview;
    if (preview.value.conflicts.some((conflict) => conflict.kind === "missing-ruleset" || conflict.kind === "broken-reference")) return fail("conflicts", "Resolva os conflitos de ruleset ou referências antes de importar.");
    const envelope = mode === "copy" ? this.remap(prepared.value) : prepared.value;
    try { return await this.options.commitImport({ envelope, mode }); } catch (cause) { return err(appError.storageUnavailable("Importação atômica falhou; nenhum dado foi confirmado.", String(cause))); }
  }

  private prepare(input: BackupEnvelope): Result<BackupEnvelope, AppError> {
    const raw = input as unknown;
    if (hasForbiddenKey(raw)) return fail("json", "Payload rejeitado por profundidade, número inválido ou chave proibida.");
    const checked = validateEnvelope(raw, this.options.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES); if (!checked.ok) return checked;
    const allIds = envelopeIds(checked.value);
    const sightings = new Set((checked.value.records.sightings ?? []).map((record) => record.id));
    const guesses = new Set((checked.value.records.guesses ?? []).map((record) => record.id));
    const allowedProjectionIds = new Set([...sightings].filter((id) => guesses.has(id)));
    const countsById = new Map<string, number>();
    for (const id of allIds) countsById.set(id, (countsById.get(id) ?? 0) + 1);
    if ([...countsById].some(([id, count]) => count > 1 && !(count === 2 && allowedProjectionIds.has(id)))) return fail("records", "IDs duplicados dentro do backup.");
    if (byteLength(JSON.stringify(checked.value)) > (this.options.maxImportBytes ?? DEFAULT_MAX_BYTES)) return err(appError.quotaExceeded("Backup excede o limite de tamanho."));
    const migrated = migratePayload(checked.value, checked.value.schemaVersion, this.options.migrations, CURRENT_BACKUP_SCHEMA_VERSION); if (!migrated.ok) return migrated;
    return ok(migrated.value as BackupEnvelope);
  }

  private async existingIds(kind: BackupKind): Promise<Result<Set<string>, AppError>> {
    const ids = new Set<string>();
    if (kind === "character") { const result = await this.options.characters.list(); if (!result.ok) return result; result.value.forEach((entry) => ids.add(entry.id)); }
    else { const result = await this.options.campaigns.list(); if (!result.ok) return result; result.value.forEach((entry) => ids.add(entry.id)); }
    if (this.options.listExistingIds) { const result = await this.options.listExistingIds(); if (!result.ok) return result; result.value.forEach((id) => ids.add(id)); }
    return ok(ids);
  }

  private envelope(kind: BackupKind, rootId: Uuid, records: ReturnType<typeof emptyRecords>, assets: readonly ExportedAsset[], rulesetRef: RulesetRef): Result<BackupEnvelope, AppError> {
    let exportedAt;
    try { exportedAt = asIsoTimestamp(this.options.now()); } catch { return fail("exportedAt", "Clock deve retornar timestamp ISO UTC válido."); }
    const envelope = { format: FORMAT, formatVersion: BACKUP_FORMAT_VERSION, exportedAt, appVersion: this.options.appVersion, kind, schemaVersion: kind === "character" ? CHARACTER_SCHEMA_VERSION : CAMPAIGN_SCHEMA_VERSION, rulesetRefs: [rulesetRef], rootId, records, assets, manifest: { counts: counts(records, assets), hashes: { records: hashBytes(new TextEncoder().encode(JSON.stringify(records))), assets: hashBytes(new TextEncoder().encode(JSON.stringify(assets))) } } } as unknown as BackupEnvelope;
    return ok(envelope);
  }

  private remap(envelope: BackupEnvelope): BackupEnvelope {
    if (!this.options.idGenerator) throw new Error("copy exige IdGenerator injetado.");
    const map = new Map<string, string>();
    for (const id of idsIn(envelope)) map.set(id, this.options.idGenerator.uuid());
    for (const proposal of envelope.records.proposals ?? []) map.set(proposal.id, `proposal__${this.options.idGenerator.uuid()}`);
    for (const sighting of envelope.records.sightings ?? []) map.set(sighting.id, sightingId(map.get(sighting.creatureId) ?? sighting.creatureId, sighting.accountId));
    for (const guess of envelope.records.guesses ?? []) map.set(guess.id, sightingId(map.get(guess.creatureId) ?? guess.creatureId, guess.accountId));
    const identityFields = new Set(["accountId", "proposedBy", "reviewedBy"]);
    const rewrite = (value: unknown, field?: string): unknown => {
      if (typeof value === "string") return field && identityFields.has(field) ? value : map.get(value) ?? value;
      if (Array.isArray(value)) return value.map((item) => rewrite(item, field));
      if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewrite(child, key)]));
      return value;
    };
    const mapped = rewrite(envelope) as BackupEnvelope;
    return { ...mapped, rootId: map.get(envelope.rootId) as Uuid };
  }
}

function idsIn(envelope: BackupEnvelope): string[] {
  return [...new Set(envelopeIds(envelope))];
}
function envelopeIds(envelope: BackupEnvelope): string[] {
  const ids = [...envelope.records.characters, ...envelope.records.campaigns, ...envelope.records.journalEntries, ...envelope.records.maps, ...envelope.records.rolls, ...(envelope.records.creatures ?? []), ...(envelope.records.sightings ?? []), ...(envelope.records.guesses ?? []), ...(envelope.records.proposals ?? []), ...envelope.assets].map((record) => record.id);
  for (const campaign of envelope.records.campaigns) {
    for (const quest of campaign.quests) ids.push(quest.id);
    for (const npc of campaign.npcs) ids.push(npc.id);
  }
  return ids;
}
function brokenReferences(envelope: BackupEnvelope): ImportConflict[] {
  const ids = new Set(idsIn(envelope)); const conflicts: ImportConflict[] = [];
  const campaignIds = new Set(envelope.records.campaigns.map((record) => record.id));
  const creatureIds = new Set((envelope.records.creatures ?? []).map((record) => record.id));
  for (const character of envelope.records.characters) {
    if (character.campaignId && !ids.has(character.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: character.id, targetId: character.campaignId });
    if (character.portraitAssetId && !ids.has(character.portraitAssetId)) conflicts.push({ kind: "broken-reference", referrerId: character.id, targetId: character.portraitAssetId });
  }
  for (const campaign of envelope.records.campaigns) {
    for (const id of campaign.characterIds) if (!ids.has(id)) conflicts.push({ kind: "broken-reference", referrerId: campaign.id, targetId: id });
    for (const npc of campaign.npcs) if (npc.characterRef && !ids.has(npc.characterRef)) conflicts.push({ kind: "broken-reference", referrerId: npc.id, targetId: npc.characterRef });
  }
  for (const journalEntry of envelope.records.journalEntries) if (!ids.has(journalEntry.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: journalEntry.id, targetId: journalEntry.campaignId });
  for (const map of envelope.records.maps) {
    if (!ids.has(map.assetId)) conflicts.push({ kind: "broken-reference", referrerId: map.id, targetId: map.assetId });
    if (!ids.has(map.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: map.id, targetId: map.campaignId });
    for (const pin of map.pins) if (pin.locationId && !ids.has(pin.locationId)) conflicts.push({ kind: "broken-reference", referrerId: map.id, targetId: pin.locationId });
  }
  for (const creature of envelope.records.creatures ?? []) {
    if (!campaignIds.has(creature.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: creature.id, targetId: creature.campaignId });
    if (creature.characterRef && !ids.has(creature.characterRef)) conflicts.push({ kind: "broken-reference", referrerId: creature.id, targetId: creature.characterRef });
  }
  for (const sighting of envelope.records.sightings ?? []) {
    if (!campaignIds.has(sighting.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: sighting.id as Uuid, targetId: sighting.campaignId });
    if (!creatureIds.has(sighting.creatureId)) conflicts.push({ kind: "broken-reference", referrerId: sighting.id as Uuid, targetId: sighting.creatureId });
  }
  for (const guess of envelope.records.guesses ?? []) {
    if (!campaignIds.has(guess.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: guess.id as Uuid, targetId: guess.campaignId });
    if (!creatureIds.has(guess.creatureId)) conflicts.push({ kind: "broken-reference", referrerId: guess.id as Uuid, targetId: guess.creatureId });
  }
  for (const proposal of envelope.records.proposals ?? []) {
    if (!campaignIds.has(proposal.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: proposal.id as Uuid, targetId: proposal.campaignId });
    if (proposal.creatureId && !creatureIds.has(proposal.creatureId)) conflicts.push({ kind: "broken-reference", referrerId: proposal.id as Uuid, targetId: proposal.creatureId });
  }
  return conflicts;
}

export function createBackupService(options: BackupServiceOptions): BackupService { return new DefaultBackupService(options); }
export const parseBackup = parseBackupJson;
export function serializeBackup(envelope: BackupEnvelope): Result<string, AppError> {
  const checked = validateEnvelope(envelope, DEFAULT_MAX_ASSET_BYTES);
  if (!checked.ok) return checked;
  try { return ok(JSON.stringify(checked.value)); } catch { return fail("json", "Backup não é serializável."); }
}

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { BACKUP_FORMAT_VERSION, type BackupEnvelope, type BackupKind, type ExportedAsset, type ImportConflict, type ImportMode, type ImportPreview } from "@domain/contracts/backup";
import { CHARACTER_SCHEMA_VERSION, type Character } from "@domain/contracts/character";
import { CAMPAIGN_SCHEMA_VERSION, type Asset, type Campaign, type JournalEntry, type MapRecord } from "@domain/contracts/campaign";
import { asIsoTimestamp, isUuid, type RulesetRef, type Uuid } from "@domain/contracts/ids";
import type { DiceRoll } from "@domain/contracts/dice";
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
  if (!isRecord(value.records) || !Array.isArray(value.records.characters) || !Array.isArray(value.records.campaigns) || !Array.isArray(value.records.journalEntries) || !Array.isArray(value.records.maps) || !Array.isArray(value.records.rolls) || !Array.isArray(value.records.favorites) || !Array.isArray(value.assets)) return fail("records", "Coleções do backup estão inválidas.");
  if ([value.records.characters, value.records.campaigns, value.records.journalEntries, value.records.maps, value.records.rolls, value.records.favorites, value.assets].some((collection) => collection.length > MAX_COLLECTION_ITEMS)) return fail("records", "Backup contém coleções excessivamente grandes.");
  if (!value.records.characters.every(isObjectWithId) || !value.records.campaigns.every(isObjectWithId) || !value.records.journalEntries.every(isObjectWithId) || !value.records.maps.every(isObjectWithId) || !value.records.rolls.every(isObjectWithId) || !value.records.favorites.every((id) => typeof id === "string" && isUuid(id)) || !value.assets.every((asset) => validateAsset(asset, maxAssetBytes))) return fail("records", "Registro ou asset inválido.");
  const recordIds = [...(value.records.characters as unknown as readonly { id: string }[]), ...(value.records.campaigns as unknown as readonly { id: string }[]), ...(value.records.journalEntries as unknown as readonly { id: string }[]), ...(value.records.maps as unknown as readonly { id: string }[]), ...(value.records.rolls as unknown as readonly { id: string }[]), ...(value.assets as unknown as readonly { id: string }[])].map((record) => record.id);
  if (new Set(recordIds).size !== recordIds.length) return fail("records", "IDs duplicados dentro do backup.");
  if (!isRecord(value.manifest) || !isRecord(value.manifest.counts) || !isRecord(value.manifest.hashes)) return fail("manifest", "Manifesto inválido.");
  if (!Array.isArray(value.rulesetRefs) || !value.rulesetRefs.every((ref) => isRecord(ref) && typeof ref.id === "string" && typeof ref.version === "string")) return fail("rulesetRefs", "Referência de ruleset inválida.");
  if (typeof value.exportedAt !== "string" || typeof value.appVersion !== "string") return fail("envelope", "Metadados do backup inválidos.");
  return ok(value as unknown as BackupEnvelope);
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
function emptyRecords() { return { characters: [] as readonly Character[], campaigns: [] as readonly Campaign[], journalEntries: [] as readonly JournalEntry[], maps: [] as readonly MapRecord[], rolls: [] as readonly DiceRoll[], favorites: [] as readonly Uuid[] }; }
function counts(records: ReturnType<typeof emptyRecords>, assets: readonly ExportedAsset[]): Readonly<Record<string, number>> { return { characters: records.characters.length, campaigns: records.campaigns.length, journalEntries: records.journalEntries.length, maps: records.maps.length, rolls: records.rolls.length, favorites: records.favorites.length, assets: assets.length }; }

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
    for (const map of mapsResult.value) { const asset = await assetFor(map.assetId, this.options.assets); if (!asset.ok) return asset; if (!assets.some((entry) => entry.id === asset.value.id)) assets.push(toAsset(asset.value)); }
    const records = { ...emptyRecords(), campaigns: [campaign.value], characters: fullCharacters, journalEntries: journalResult.value, maps: mapsResult.value };
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
    const allIds = [...envelopeIds(checked.value)];
    if (new Set(allIds).size !== allIds.length) return fail("records", "IDs duplicados dentro do backup.");
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
    const ids = idsIn(envelope); const map = new Map<string, string>(); for (const id of ids) map.set(id, this.options.idGenerator.uuid());
    const rewrite = (value: unknown): unknown => { if (typeof value === "string") return map.get(value) ?? value; if (Array.isArray(value)) return value.map(rewrite); if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewrite(child)])); return value; };
    const mapped = rewrite(envelope) as BackupEnvelope;
    return { ...mapped, rootId: map.get(envelope.rootId) as Uuid };
  }
}

function idsIn(envelope: BackupEnvelope): string[] {
  return [...new Set(envelopeIds(envelope))];
}
function envelopeIds(envelope: BackupEnvelope): string[] {
  const ids = [...envelope.records.characters, ...envelope.records.campaigns, ...envelope.records.journalEntries, ...envelope.records.maps, ...envelope.records.rolls, ...envelope.assets].map((record) => record.id);
  return ids;
}
function brokenReferences(envelope: BackupEnvelope): ImportConflict[] {
  const ids = new Set(idsIn(envelope)); const conflicts: ImportConflict[] = [];
  for (const character of envelope.records.characters) if (character.campaignId && !ids.has(character.campaignId)) conflicts.push({ kind: "broken-reference", referrerId: character.id, targetId: character.campaignId });
  for (const campaign of envelope.records.campaigns) for (const id of campaign.characterIds) if (!ids.has(id)) conflicts.push({ kind: "broken-reference", referrerId: campaign.id, targetId: id });
  for (const map of envelope.records.maps) if (!ids.has(map.assetId)) conflicts.push({ kind: "broken-reference", referrerId: map.id, targetId: map.assetId });
  return conflicts;
}

export function createBackupService(options: BackupServiceOptions): BackupService { return new DefaultBackupService(options); }
export const parseBackup = parseBackupJson;
export function serializeBackup(envelope: BackupEnvelope): Result<string, AppError> {
  const checked = validateEnvelope(envelope, DEFAULT_MAX_ASSET_BYTES);
  if (!checked.ok) return checked;
  try { return ok(JSON.stringify(checked.value)); } catch { return fail("json", "Backup não é serializável."); }
}

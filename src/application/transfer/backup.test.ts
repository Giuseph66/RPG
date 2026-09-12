import { describe, expect, it, vi } from "vitest";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { appError, ok, type AppError, type Result } from "@domain/contracts/errors";
import { minimalCharacter } from "@domain/contracts/fixtures";
import type { Character } from "@domain/contracts/character";
import type { BackupEnvelope } from "@domain/contracts/backup";
import { migratePayload } from "@infrastructure/persistence/migrations";
import { DefaultBackupService, hashBytes, parseBackupJson } from "./backup";
import type { BackupServiceOptions } from "./types";

const id = asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const now = () => asIsoTimestamp("2024-01-01T00:00:00.000Z");

function makeService(character: Character = minimalCharacter, commit: ReturnType<typeof vi.fn> = vi.fn(async (): Promise<Result<{ readonly rootId: typeof character.id }, AppError>> => ok({ rootId: character.id }))): { service: DefaultBackupService; commit: ReturnType<typeof vi.fn>; character: Character } {
  const characters = { get: vi.fn(async () => ok(character)), list: vi.fn(async () => ok([{ id: character.id, name: character.name, raceRef: character.raceRef, classSummary: [], totalLevel: 1, updatedAt: character.updatedAt, revision: character.revision }])), save: vi.fn(), delete: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn() };
  const campaigns = { get: vi.fn(), list: vi.fn(async () => ok([])), save: vi.fn(), delete: vi.fn(), getJournalEntry: vi.fn(), listJournalEntries: vi.fn(), saveJournalEntry: vi.fn(), deleteJournalEntry: vi.fn(), getMap: vi.fn(), listMaps: vi.fn(), saveMap: vi.fn(), deleteMap: vi.fn(), addMapPin: vi.fn(), updateMapPin: vi.fn(), removeMapPin: vi.fn(), saveQuest: vi.fn(), deleteQuest: vi.fn(), saveNpc: vi.fn(), deleteNpc: vi.fn(), importAtomic: vi.fn() };
  const assets = { get: vi.fn(), put: vi.fn(), delete: vi.fn() };
  const options = { characters, campaigns, assets, commitImport: commit, appVersion: "test", now } as unknown as BackupServiceOptions;
  return { service: new DefaultBackupService(options), commit, character };
}

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
});

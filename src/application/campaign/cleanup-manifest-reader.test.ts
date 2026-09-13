import { describe, expect, it } from "vitest";

import { createLocalCampaignCleanupManifestReader } from "./cleanup-manifest-reader";
import { asAccountId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type Asset, type Campaign, type JournalEntry, type MapRecord } from "@domain/contracts/campaign";
import { type CharacterSummary } from "@domain/contracts/character";
import { type Membership } from "@domain/contracts/cloud-sync";
import { type CampaignSession } from "@domain/session";

const campaignId = asUuid("00000000-0000-4000-8000-000000000101");
const characterId = asUuid("00000000-0000-4000-8000-000000000102");
const mapId = asUuid("00000000-0000-4000-8000-000000000103");
const assetId = asUuid("00000000-0000-4000-8000-000000000104");
const timestamp = asIsoTimestamp("2026-09-12T16:00:00.000Z");
const context = { kind: "rpg-transaction" as const };

const campaign: Campaign = {
  id: campaignId,
  schemaVersion: 1,
  revision: asRevision(3),
  name: "Campanha local",
  description: "",
  rulesetRef: { id: asRulesetId("phb"), version: asPackVersion("1.0.0") },
  characterIds: [characterId],
  sessionCounter: 1,
  npcs: [],
  quests: [],
  objectives: [],
  settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "milestone" },
  createdAt: timestamp,
  updatedAt: timestamp,
};

const character = { id: characterId, portraitAssetId: assetId } as CharacterSummary;
const map = { id: mapId, campaignId, assetId, pins: [], name: "Mapa", revision: asRevision(1) } as MapRecord;
const journal = { id: asUuid("00000000-0000-4000-8000-000000000105"), campaignId } as JournalEntry;
const session = { id: asUuid("00000000-0000-4000-8000-000000000106"), campaignId } as CampaignSession;
const membership = { campaignId, accountId: asAccountId("player-1") } as Membership;
const asset: Asset = { id: assetId, mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]), hash: "a".repeat(64), originalName: "map.png" };

describe("leitor local do manifesto de limpeza", () => {
  it("captura somente referências da campanha, deduplica assets e preserva contexto", async () => {
    const contexts: unknown[] = [];
    const reader = createLocalCampaignCleanupManifestReader({
      campaigns: {
        get: async (_id, received) => { contexts.push(received); return { ok: true, value: campaign }; },
        listJournalEntries: async (_id, received) => { contexts.push(received); return { ok: true, value: [journal] }; },
        listMaps: async (_id, received) => { contexts.push(received); return { ok: true, value: [map] }; },
      },
      characters: { list: async (_filter, received) => { contexts.push(received); return { ok: true, value: [character] }; } },
      memberships: { listMemberships: async (_id, received) => { contexts.push(received); return { ok: true, value: [membership] }; } },
      sessions: { list: async (_id, received) => { contexts.push(received); return { ok: true, value: [session] }; } },
      assets: { get: async (_id, received) => { contexts.push(received); return { ok: true, value: asset }; } },
      ownerUid: "owner-1",
    });

    const result = await reader.read(campaignId, 3, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      campaignId,
      campaignRevision: 3,
      memberAccountIds: ["player-1"],
      characterIds: [characterId],
      journalIds: [journal.id],
      mapIds: [mapId],
      sessionIds: [session.id],
    });
    expect(result.value.assets).toHaveLength(1);
    expect(result.value.assets[0]).toMatchObject({
      assetId,
      ownerUid: "owner-1",
      firestorePath: `assets/${assetId}`,
      storagePath: `campaigns/${campaignId}/assets/${assetId}`,
    });
    expect(result.value.assets[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(contexts).toHaveLength(7);
    expect(contexts.every((received) => received === context)).toBe(true);
  });

  it("não varre campanhas vizinhas", async () => {
    const requestedCampaigns: string[] = [];
    const reader = createLocalCampaignCleanupManifestReader({
      campaigns: {
        get: async (id) => { requestedCampaigns.push(String(id)); return { ok: true, value: campaign }; },
        listJournalEntries: async (id) => { requestedCampaigns.push(String(id)); return { ok: true, value: [] }; },
        listMaps: async (id) => { requestedCampaigns.push(String(id)); return { ok: true, value: [] }; },
      },
      characters: { list: async () => ({ ok: true, value: [] }) },
      memberships: { listMemberships: async () => ({ ok: true, value: [] }) },
      sessions: { list: async () => ({ ok: true, value: [] }) },
      assets: { get: async () => ({ ok: false, error: { code: "not-found", entity: "asset", id: "missing", message: "não encontrado" } }) },
      ownerUid: "owner-1",
    });

    await reader.read(campaignId, 3);
    expect(requestedCampaigns).toEqual([String(campaignId), String(campaignId), String(campaignId)]);
  });
});

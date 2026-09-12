import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { fixtureRulesetRef } from "@domain/contracts/fixtures";
import type { Asset, Campaign, JournalEntry, MapRecord } from "@domain/contracts/campaign";

export const integrationTimestamp = asIsoTimestamp("2026-01-01T00:00:00.000Z");
export const integrationCampaignId = asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
export const integrationAssetId = asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
export const integrationMapId = asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
export const integrationJournalId = asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd");

export const canonicalCampaign: Campaign = {
  id: integrationCampaignId, schemaVersion: 1, revision: asRevision(0), name: "Campanha de integração", description: "Sessão local", rulesetRef: fixtureRulesetRef,
  characterIds: [], sessionCounter: 1, npcs: [], quests: [], objectives: ["Chegar à torre"],
  settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" }, createdAt: integrationTimestamp, updatedAt: integrationTimestamp,
};

export const canonicalAsset: Asset = { id: integrationAssetId, mediaType: "image/png", bytes: new Uint8Array([1, 2, 3, 4]), hash: "integration-asset", originalName: "mapa.png", width: 2, height: 2 };
export const canonicalMap: MapRecord = { id: integrationMapId, campaignId: integrationCampaignId, name: "Torre", assetId: integrationAssetId, pins: [], revision: asRevision(0) };
export const canonicalJournal: JournalEntry = { id: integrationJournalId, campaignId: integrationCampaignId, title: "Entrada", body: "A porta está fechada.", linkedEntityIds: [], tags: ["sessão"], createdAt: integrationTimestamp, updatedAt: integrationTimestamp };


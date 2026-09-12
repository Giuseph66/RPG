import { describe, expect, it } from "vitest";

import { type Campaign, type NpcRecord, type Quest } from "@domain/contracts/campaign";
import { type AppError } from "@domain/contracts/errors";
import { asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type CampaignRecordIntent } from "@features/journey/campaign/types";

import { createCampaignApplicationService } from "./service";
import { createCampaignRecordDispatcher } from "./campaign-record-dispatcher";
import { createFakeCampaignRepository } from "./campaign-repository.fake";

const campaignId = asUuid("00000000-0000-4000-8000-000000000010");
const questId = asUuid("00000000-0000-4000-8000-000000000011");
const npcId = asUuid("00000000-0000-4000-8000-000000000012");
const timestamp = "2026-01-01T00:00:00.000Z" as never;
const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: questId,
    title: "Encontrar a ponte",
    description: "Localizar a ponte ao norte",
    status: "active",
    linkedEntityIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function npc(overrides: Partial<NpcRecord> = {}): NpcRecord {
  return {
    id: npcId,
    name: "Guarda",
    description: "Vigia o portão",
    linkedEntityIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: campaignId,
    schemaVersion: 1,
    revision: asRevision(0),
    name: "Costa Esquecida",
    description: "",
    rulesetRef,
    characterIds: [],
    sessionCounter: 0,
    npcs: [npc()],
    quests: [quest()],
    objectives: [],
    settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "milestone" },
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

async function setUp(initial: Campaign = campaign()) {
  const fake = createFakeCampaignRepository([initial]);
  const campaignService = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0 });
  const selected = await campaignService.select(initial.id);
  expect(selected.ok).toBe(true);
  const errors: Array<{ readonly error: AppError; readonly intent: CampaignRecordIntent }> = [];
  const dispatch = createCampaignRecordDispatcher({
    campaignService,
    onError: (error, intent) => errors.push({ error, intent }),
  });
  return { campaignService, fake, dispatch, errors };
}

describe("createCampaignRecordDispatcher", () => {
  it("aplica complete-quest e persiste o status 'completed'", async () => {
    const { campaignService, fake, dispatch, errors } = await setUp();

    dispatch({ kind: "complete-quest", questId: String(questId) });
    await campaignService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getCampaign(campaignId)?.quests[0]?.status).toBe("completed");
    expect(fake.getCampaign(campaignId)?.quests[0]).not.toHaveProperty("xp");
    expect(fake.getSaveCount()).toBe(1);
  });

  it("aplica update-quest e persiste o patch mantendo os demais campos", async () => {
    const { campaignService, fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-quest", questId: String(questId), patch: { title: "Reconstruir a ponte" } });
    await campaignService.save();

    expect(errors).toHaveLength(0);
    const stored = fake.getCampaign(campaignId)?.quests[0];
    expect(stored?.title).toBe("Reconstruir a ponte");
    expect(stored?.description).toBe("Localizar a ponte ao norte");
  });

  it("aplica update-npc e persiste o patch", async () => {
    const { campaignService, fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-npc", npcId: String(npcId), patch: { description: "Vigia o portão sul" } });
    await campaignService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getCampaign(campaignId)?.npcs[0]?.description).toBe("Vigia o portão sul");
  });

  it("erro de domínio (missão inexistente) é reportado e não corrompe o estado", async () => {
    const { campaignService, fake, dispatch, errors } = await setUp();
    const before = fake.getCampaign(campaignId);

    dispatch({ kind: "complete-quest", questId: String(asUuid("99999999-9999-4999-8999-999999999999")) });
    await campaignService.save();

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("validation-error");
    expect(fake.getSaveCount()).toBe(0);
    expect(fake.getCampaign(campaignId)).toBe(before);
    expect(campaignService.store.getSnapshot().value?.quests).toEqual([quest()]);
    expect(campaignService.store.getSnapshot().hasPendingChanges).toBe(false);
  });

  it("sem campanha ativa reporta erro e não dispara update/save", async () => {
    const fake = createFakeCampaignRepository([]);
    const campaignService = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0 });
    const errors: Array<{ readonly error: AppError; readonly intent: CampaignRecordIntent }> = [];
    const dispatch = createCampaignRecordDispatcher({ campaignService, onError: (error, intent) => errors.push({ error, intent }) });

    dispatch({ kind: "complete-quest", questId: String(questId) });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("validation-error");
    expect(fake.getSaveCount()).toBe(0);
  });
});

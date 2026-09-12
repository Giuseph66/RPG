import { describe, expect, it } from "vitest";

import { type Campaign, type JournalEntry, type MapRecord } from "@domain/contracts/campaign";
import { type AppError } from "@domain/contracts/errors";
import { asCommandId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type CampaignIntent } from "@features/journey/campaign/types";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";

import { createCampaignApplicationService } from "./service";
import { createCampaignDispatcher } from "./campaign-dispatcher";
import { createFakeCampaignRepository } from "./campaign-repository.fake";

const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };
const clock: Clock = { now: () => asIsoTimestamp("2026-01-01T00:00:00.000Z") };

function fakeIdGenerator(seed: string): IdGenerator {
  let n = 0;
  return { uuid: () => asUuid(`${seed}-4000-8000-${String(++n).padStart(12, "0")}`), commandId: () => asCommandId(`cmd-${++n}`) };
}

function campaign(id: Uuid, overrides: Partial<Campaign> = {}): Campaign {
  const timestamp = asIsoTimestamp("2026-01-01T00:00:00.000Z");
  return {
    id,
    schemaVersion: 1,
    revision: asRevision(0),
    name: "Costa Esquecida",
    description: "",
    rulesetRef,
    characterIds: [],
    sessionCounter: 0,
    npcs: [],
    quests: [],
    objectives: [],
    settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "milestone" },
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function setUp(seed: readonly Campaign[] = [], idSeed = "10000000-0000") {
  const fake = createFakeCampaignRepository(seed);
  const campaignService = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0 });
  const errors: Array<{ readonly error: AppError; readonly intent: CampaignIntent }> = [];
  const dispatch = createCampaignDispatcher({
    campaignService,
    repository: fake.repository,
    idGenerator: fakeIdGenerator(idSeed),
    clock,
    rulesetRef,
    onError: (error, intent) => errors.push({ error, intent }),
  });
  return { campaignService, fake, dispatch, errors };
}

describe("createCampaignDispatcher", () => {
  it("aplica create-campaign, persiste e seleciona a campanha nova", async () => {
    const { campaignService, fake, dispatch, errors } = setUp();

    dispatch({ kind: "create-campaign", name: "Costa Esquecida", description: "Uma nova jornada" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    const created = campaignService.store.getSnapshot().value;
    expect(created?.name).toBe("Costa Esquecida");
    expect(created?.description).toBe("Uma nova jornada");
    expect(fake.getSaveCount()).toBe(1);
    expect(campaignService.store.selectedId).toBe(created?.id);
  });

  it("rejeita create-campaign com nome vazio e não persiste nada", async () => {
    const { fake, dispatch, errors } = setUp();

    dispatch({ kind: "create-campaign", name: "", description: "" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("validation-error");
    expect(fake.getSaveCount()).toBe(0);
  });

  it("aplica select-campaign e hidrata a campanha escolhida", async () => {
    const existing = campaign(asUuid("00000000-0000-4000-8000-000000000021"));
    const { campaignService, dispatch, errors } = setUp([existing]);

    dispatch({ kind: "select-campaign", campaignId: String(existing.id) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    expect(campaignService.store.getSnapshot().value?.id).toBe(existing.id);
  });

  it("aplica switch-campaign e troca a campanha ativa", async () => {
    const first = campaign(asUuid("00000000-0000-4000-8000-000000000031"));
    const second = campaign(asUuid("00000000-0000-4000-8000-000000000032"), { name: "Segunda campanha" });
    const { campaignService, dispatch, errors } = setUp([first, second]);

    dispatch({ kind: "select-campaign", campaignId: String(first.id) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dispatch({ kind: "switch-campaign", campaignId: String(second.id) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    expect(campaignService.store.getSnapshot().value?.id).toBe(second.id);
  });

  it("select-campaign com ID malformado reporta erro sem lançar exceção", async () => {
    const { dispatch, errors } = setUp();

    dispatch({ kind: "select-campaign", campaignId: "não-é-um-uuid" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("validation-error");
  });

  it("aplica delete-campaign com escopo campaign-only e remove só a campanha", async () => {
    const target = campaign(asUuid("00000000-0000-4000-8000-000000000041"));
    const { campaignService, fake, dispatch, errors } = setUp([target]);
    await campaignService.select(target.id);

    dispatch({ kind: "delete-campaign", campaignId: String(target.id), scope: "campaign-only", backupConfirmed: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    expect(fake.getCampaign(target.id)).toBeUndefined();
    expect(campaignService.store.getSnapshot().value).toBeUndefined();
  });

  it("aplica delete-campaign com escopo campaign-and-content e remove diário/mapas associados", async () => {
    const target = campaign(asUuid("00000000-0000-4000-8000-000000000051"));
    const { fake, dispatch, errors } = setUp([target]);
    const entry: JournalEntry = {
      id: asUuid("00000000-0000-4000-8000-000000000052"),
      campaignId: target.id,
      title: "Sessão um",
      body: "Resumo",
      linkedEntityIds: [],
      tags: [],
      createdAt: asIsoTimestamp("2026-01-01T00:00:00.000Z"),
      updatedAt: asIsoTimestamp("2026-01-01T00:00:00.000Z"),
    };
    await fake.repository.saveJournalEntry(entry);
    const map: MapRecord = {
      id: asUuid("00000000-0000-4000-8000-000000000053"),
      campaignId: target.id,
      name: "Mapa da costa",
      assetId: asUuid("00000000-0000-4000-8000-000000000054"),
      pins: [],
      revision: asRevision(0),
    };
    await fake.repository.saveMap(map, asRevision(0));

    dispatch({ kind: "delete-campaign", campaignId: String(target.id), scope: "campaign-and-content", backupConfirmed: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    expect(fake.getCampaign(target.id)).toBeUndefined();
    expect(fake.getJournalEntries()).toHaveLength(0);
    expect(fake.getMaps()).toHaveLength(0);
  });

  it("delete-campaign de campanha inexistente reporta erro e não corrompe nada", async () => {
    const { fake, dispatch, errors } = setUp();

    dispatch({
      kind: "delete-campaign",
      campaignId: String(asUuid("00000000-0000-4000-8000-000000000099")),
      scope: "campaign-only",
      backupConfirmed: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("not-found");
    expect(fake.getSaveCount()).toBe(0);
  });
});

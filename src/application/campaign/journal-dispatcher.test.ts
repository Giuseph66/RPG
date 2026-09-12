import { describe, expect, it } from "vitest";

import { type Campaign } from "@domain/contracts/campaign";
import { type AppError } from "@domain/contracts/errors";
import { asCommandId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type JournalIntent } from "@features/journey/journal/types";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";

import { createCampaignApplicationService } from "./service";
import { createJournalDispatcher } from "./journal-dispatcher";
import { createFakeCampaignRepository } from "./campaign-repository.fake";

const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };
const timestamp = asIsoTimestamp("2026-01-01T00:00:00.000Z");
const clock: Clock = { now: () => timestamp };

function fakeIdGenerator(seed: string): IdGenerator {
  let n = 0;
  return { uuid: () => asUuid(`${seed}-4000-8000-${String(++n).padStart(12, "0")}`), commandId: () => asCommandId(`cmd-${++n}`) };
}

function campaign(id: Uuid): Campaign {
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
  };
}

const campaignId = asUuid("00000000-0000-4000-8000-000000000060");

async function setUp() {
  const initial = campaign(campaignId);
  const fake = createFakeCampaignRepository([initial]);
  const campaignService = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0 });
  const selected = await campaignService.select(campaignId);
  expect(selected.ok).toBe(true);
  const errors: Array<{ readonly error: AppError; readonly intent: JournalIntent }> = [];
  const dispatch = createJournalDispatcher({
    campaignService,
    repository: fake.repository,
    idGenerator: fakeIdGenerator("20000000-0000"),
    clock,
    onError: (error, intent) => errors.push({ error, intent }),
  });
  return { campaignService, fake, dispatch, errors };
}

describe("createJournalDispatcher", () => {
  it("aplica update-draft mantendo o rascunho só em memória (sem persistir)", async () => {
    const { fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-draft", patch: { title: "Sessão um", body: "Rascunho" } });

    expect(errors).toHaveLength(0);
    expect(fake.getJournalEntries()).toHaveLength(0);
    expect(dispatch.getDraftState()?.draft.title).toBe("Sessão um");
    expect(dispatch.getDraftState()?.status).toBe("dirty");
  });

  it("aplica save-draft e persiste uma entrada nova de diário", async () => {
    const { fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-draft", patch: { title: "Sessão um", body: "Os aventureiros chegaram à vila." } });
    dispatch({ kind: "save-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    const saved = fake.getJournalEntries();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.title).toBe("Sessão um");
    expect(saved[0]?.campaignId).toBe(campaignId);
    expect(dispatch.getDraftState()?.status).toBe("saved");
    expect(dispatch.getDraftState()?.draft.entryId).toBe(saved[0]?.id);
  });

  it("save-draft de uma entrada já existente atualiza a mesma entrada (não duplica)", async () => {
    const { fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-draft", patch: { title: "Sessão um", body: "Rascunho inicial" } });
    dispatch({ kind: "save-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dispatch({ kind: "update-draft", patch: { body: "Rascunho revisado" } });
    dispatch({ kind: "save-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    expect(fake.getJournalEntries()).toHaveLength(1);
    expect(fake.getJournalEntries()[0]?.body).toBe("Rascunho revisado");
  });

  it("reload-draft descarta edições não salvas e relê a entrada persistida", async () => {
    const { fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-draft", patch: { title: "Sessão um", body: "Original" } });
    dispatch({ kind: "save-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dispatch({ kind: "update-draft", patch: { body: "Edição não salva" } });
    expect(dispatch.getDraftState()?.draft.body).toBe("Edição não salva");

    dispatch({ kind: "reload-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(0);
    expect(dispatch.getDraftState()?.draft.body).toBe("Original");
    expect(fake.getJournalEntries()).toHaveLength(1);
  });

  it("discard-draft limpa o rascunho em memória sem tocar a campanha persistida", async () => {
    const { fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-draft", patch: { title: "Rascunho perdido", body: "..." } });
    dispatch({ kind: "discard-draft" });

    expect(errors).toHaveLength(0);
    expect(dispatch.getDraftState()?.draft.title).toBe("");
    expect(dispatch.getDraftState()?.status).toBe("clean");
    expect(fake.getJournalEntries()).toHaveLength(0);
  });

  it("erro de domínio (título vazio ao salvar) é reportado e o draft não é apagado", async () => {
    const { fake, dispatch, errors } = await setUp();

    dispatch({ kind: "update-draft", patch: { title: "", body: "Sem título" } });
    dispatch({ kind: "save-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("validation-error");
    expect(fake.getJournalEntries()).toHaveLength(0);
    expect(dispatch.getDraftState()?.draft.body).toBe("Sem título");
    expect(dispatch.getDraftState()?.status).toBe("error");
  });

  it("sem campanha ativa, update-draft reporta erro e não altera estado", async () => {
    const fake = createFakeCampaignRepository([]);
    const campaignService = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0 });
    const errors: Array<{ readonly error: AppError; readonly intent: JournalIntent }> = [];
    const dispatch = createJournalDispatcher({
      campaignService,
      repository: fake.repository,
      idGenerator: fakeIdGenerator("30000000-0000"),
      clock,
      onError: (error, intent) => errors.push({ error, intent }),
    });

    dispatch({ kind: "update-draft", patch: { title: "x" } });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("validation-error");
    expect(dispatch.getDraftState()).toBeUndefined();
  });
});

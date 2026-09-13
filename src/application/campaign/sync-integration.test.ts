import { describe, expect, it } from "vitest";

import { createPendingSyncOperation, type NewSyncOperation, type SyncOutboxService } from "@application/sync";
import { asCommandId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type Campaign } from "@domain/contracts/campaign";
import { type SyncOperation } from "@domain/contracts/cloud-sync";
import { type IdGenerator } from "@application/ports/id-generator";
import { type UnitOfWork } from "@application/ports/unit-of-work";

import { createFakeCampaignRepository } from "./campaign-repository.fake";
import { createCampaignApplicationService } from "./service";
import { createJournalDispatcher } from "./journal-dispatcher";

const timestamp = asIsoTimestamp("2026-09-12T10:00:00.000Z");
const campaignId = asUuid("00000000-0000-4000-8000-000000000201");
const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };
const clock = { now: () => timestamp };
const idGenerator: IdGenerator = {
  uuid: (() => {
    let n = 0;
    return () => asUuid(`00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`);
  })(),
  commandId: (() => {
    let n = 0;
    return () => asCommandId(`campaign-sync-${++n}`);
  })(),
};

const unitOfWork: UnitOfWork = {
  run: (fn) => fn({ kind: "rpg-transaction" }),
};

function campaign(): Campaign {
  return {
    id: campaignId, schemaVersion: 1, revision: asRevision(0), name: "Campanha", description: "", rulesetRef,
    characterIds: [], sessionCounter: 0, npcs: [], quests: [], objectives: [],
    settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "milestone" },
    createdAt: timestamp, updatedAt: timestamp,
  };
}

function outboxFor(operations: SyncOperation[]): SyncOutboxService {
  return {
    enqueue: async (input: NewSyncOperation) => {
      const operation = createPendingSyncOperation(input);
      if (!operation.ok) return operation;
      const existing = operations.find((entry) => entry.dedupeKey === operation.value.dedupeKey);
      if (existing) return { ok: true as const, value: existing };
      operations.push(operation.value);
      return { ok: true as const, value: operation.value };
    },
  };
}

describe("integração campanha + outbox", () => {
  it("publica campanha local como pending sem exigir rede", async () => {
    const fake = createFakeCampaignRepository([campaign()]);
    const operations: SyncOperation[] = [];
    const service = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0, syncOutbox: outboxFor(operations), unitOfWork, clock, idGenerator });
    await service.select(campaignId);
    service.update((value) => ({ ...value, name: "Sessão offline" }), true);
    const saved = await service.save();

    expect(saved.ok).toBe(true);
    expect(fake.getCampaign(campaignId)?.name).toBe("Sessão offline");
    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({ aggregateType: "campaign", mutation: "upsert", baseRevision: 0, status: "pending" });
  });

  it("publica entrada de diário confirmada e remove propriedades opcionais indefinidas", async () => {
    const fake = createFakeCampaignRepository([campaign()]);
    const operations: SyncOperation[] = [];
    const service = createCampaignApplicationService({ repository: fake.repository, syncOutbox: outboxFor(operations), unitOfWork, clock, idGenerator });
    await service.select(campaignId);
    const dispatch = createJournalDispatcher({ campaignService: service, repository: fake.repository, idGenerator, clock });
    dispatch({ kind: "update-draft", patch: { title: "Sessão 1", body: "Rascunho" } });
    dispatch({ kind: "save-draft" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fake.getJournalEntries()).toHaveLength(1);
    expect(operations).toHaveLength(1);
    expect(operations[0]?.aggregateType).toBe("journal");
    expect(operations[0]?.payload).toMatchObject({ title: "Sessão 1", body: "Rascunho" });
  });

  it("mantém compatibilidade quando o outbox não é configurado", async () => {
    const fake = createFakeCampaignRepository([campaign()]);
    const service = createCampaignApplicationService({ repository: fake.repository, debounceMs: 0 });
    await service.select(campaignId);
    service.update((value) => ({ ...value, name: "Local-only" }), true);
    expect((await service.save()).ok).toBe(true);
    expect(fake.getCampaign(campaignId)?.name).toBe("Local-only");
  });
});

import { describe, expect, it } from "vitest";

import { asCommandId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import { createFakeCampaignRepository } from "./campaign-repository.fake";
import { chooseCampaignForRestore, createCampaignApplicationService } from "./service";
import type { Campaign } from "@domain/contracts/campaign";

const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };

function campaign(id: Uuid, updatedAt: string, createdAt = updatedAt): Campaign {
  return {
    id,
    schemaVersion: 1,
    revision: asRevision(0),
    name: String(id),
    description: "",
    rulesetRef,
    characterIds: [],
    sessionCounter: 0,
    npcs: [],
    quests: [],
    objectives: [],
    settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "milestone" },
    createdAt: asIsoTimestamp(createdAt),
    updatedAt: asIsoTimestamp(updatedAt),
  };
}

describe("CampaignApplicationService", () => {
  it("seleciona antes de hidratar uma campanha persistida", async () => {
    const persisted = campaign(asUuid("00000000-0000-4000-8000-000000000101"), "2026-09-12T10:00:00.000Z");
    const fake = createFakeCampaignRepository([persisted]);
    const service = createCampaignApplicationService({ repository: fake.repository });

    const result = await service.hydrate(persisted.id);

    expect(result).toMatchObject({ ok: true });
    expect(service.store.selectedId).toBe(persisted.id);
    expect(service.store.getSnapshot().value).toMatchObject({ id: persisted.id, name: persisted.name });
  });

  it("restaura por atualização, criação e ID ascendente sem alterar a entrada", () => {
    const older = campaign(asUuid("00000000-0000-4000-8000-000000000103"), "2026-09-12T09:00:00.000Z");
    const newer = campaign(asUuid("00000000-0000-4000-8000-000000000102"), "2026-09-12T10:00:00.000Z");
    const tieHigh = campaign(asUuid("00000000-0000-4000-8000-000000000105"), "2026-09-12T11:00:00.000Z");
    const tieLow = campaign(asUuid("00000000-0000-4000-8000-000000000104"), "2026-09-12T11:00:00.000Z");
    const input = [tieHigh, older, tieLow, newer] as const;

    expect(chooseCampaignForRestore(input)?.id).toBe(tieLow.id);
    expect(input).toEqual([tieHigh, older, tieLow, newer]);
  });

  it("cria locais com ID de domínio e coordenadas normalizadas", async () => {
    const fake = createFakeCampaignRepository();
    const campaignId = asUuid("00000000-0000-4000-8000-000000000201");
    const mapId = asUuid("00000000-0000-4000-8000-000000000202");
    const assetId = asUuid("00000000-0000-4000-8000-000000000203");
    const pinId = asUuid("00000000-0000-4000-8000-000000000204");
    await fake.repository.importAtomic({
      map: { id: mapId, campaignId, name: "Costa", assetId, pins: [], revision: asRevision(0) },
      asset: { id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "fixture", width: 1, height: 1, originalName: "map.png" },
    });
    const service = createCampaignApplicationService({
      repository: fake.repository,
      idGenerator: { uuid: () => pinId, commandId: () => asCommandId("pin-command") },
    });

    const result = await service.createMapPin({ mapId, x: 0.25, y: 0.75, label: "  Entrada  ", expectedRevision: asRevision(0) });

    expect(result).toMatchObject({ ok: true, value: { pin: { id: pinId, normalizedX: 0.25, normalizedY: 0.75, label: "Entrada", noteIds: [] }, revision: 0 } });
    const invalid = await service.createMapPin({ mapId, x: 1.1, y: 0.5, label: "Limite", expectedRevision: asRevision(0) });
    expect(invalid).toMatchObject({ ok: false, error: { code: "validation-error" } });
    service.dispose();
  });
});

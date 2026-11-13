import { describe, expect, it } from "vitest";

import { type CreatureService } from "@application/campaign/creature-service";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type IdGenerator } from "@application/ports/id-generator";
import { createCharacterApplicationService } from "@application/character/service";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { type Character } from "@domain/contracts/character";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { appError, err, ok } from "@domain/contracts/errors";
import { asAccountId, asCommandId, asEntityId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type CreatureRecord } from "@domain/campaign/creatures";
import { type CreatureStatBlock } from "@domain/creatures";

import { createWildShapeApplicationService } from "./wild-shape-service";

const accountId = asAccountId("player-wolf-owner");
const customBeast: CreatureStatBlock = {
  id: asEntityId("beast.custom-wolf"), name: "Lobo Cinzento de Nara", creatureType: "beast", size: "medium",
  armorClass: 13, hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: 900 as never },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
  challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
};

function characterWithCampaign(packRulesetId: typeof minimalCharacter.rulesetRef.id): Character {
  return {
    ...minimalCharacter,
    rulesetRef: { ...minimalCharacter.rulesetRef, id: packRulesetId },
    campaignId: asUuid("00000000-0000-4000-8000-00000000ca01"),
    ownerUid: accountId,
    classes: [{ classId: asEntityId("druid"), level: 2, choices: [] }],
    progressionHistory: [
      { id: asUuid("22222222-2222-4222-8222-222222222211"), classId: asEntityId("druid"), level: 1, hitPointGain: { kind: "first-level-max", amount: 8 }, choices: [], recordedAt: minimalCharacter.updatedAt },
      { id: asUuid("22222222-2222-4222-8222-222222222212"), classId: asEntityId("druid"), level: 2, hitPointGain: { kind: "fixed-average", amount: 5 }, choices: [], recordedAt: minimalCharacter.updatedAt },
    ],
    hitDiceSpent: [{ classId: asEntityId("druid"), hitDie: 8, spent: 0 }],
    resources: [{
      id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      definitionRef: { rulesetId: packRulesetId, entityId: asEntityId("druid.wild-shape") },
      ownerInstanceId: minimalCharacter.id,
      spent: 0,
    }],
    beastSightings: [],
  };
}

function characterRepository(initial: Character): CharacterRepository {
  let current = initial;
  return {
    get: async (id) => id === current.id ? ok(current) : err(appError.notFound("character", id)),
    list: async () => ok([]),
    save: async (character, expectedRevision) => {
      if (current.revision !== expectedRevision) return err(appError.conflict(expectedRevision, current.revision));
      current = { ...character, revision: asRevision(expectedRevision + 1) };
      return ok(current.revision);
    },
    delete: async () => ok(undefined),
    getDraft: async () => err(appError.notFound("character-draft", "missing")),
    listDrafts: async () => ok([]),
    saveDraft: async (draft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };
}

function recordFor(character: Character): CreatureRecord {
  return {
    id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    campaignId: character.campaignId!,
    schemaVersion: 1,
    revision: asRevision(1),
    kind: "animal",
    name: customBeast.name,
    appearance: "",
    race: "beast",
    description: "Proposta aprovada pelo mestre.",
    hitPoints: "11 (2d8+2)",
    armorClass: "13",
    abilities: "",
    notes: "",
    statBlock: customBeast,
    reveals: [{ accountId, fields: ["statBlock"] }],
    createdAt: asIsoTimestamp("2026-11-11T10:00:00.000Z"),
    updatedAt: asIsoTimestamp("2026-11-11T10:00:00.000Z"),
  };
}

describe("WildShapeApplicationService campaign forms", () => {
  it("lista bloco aprovado revelado, registra avistamento, transforma e recarrega o snapshot", async () => {
    const loaded = loadPhbPtBrLocal2017();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const initial = characterWithCampaign(loaded.value.manifest.id);
    const record = recordFor(initial);
    const creatureService = {
      listCreatures: async () => ok([record]),
    } as unknown as CreatureService;
    const repository = characterRepository(initial);
    let id = 0;
    const idGenerator: IdGenerator = {
      uuid: () => asUuid(`cccccccc-cccc-4ccc-8ccc-${String(++id).padStart(12, "0")}`),
      commandId: () => asCommandId(`wild-shape-${++id}`),
    };
    const characterService = createCharacterApplicationService({
      repository,
      debounceMs: 0,
      commandDependencies: { clock: { now: () => asIsoTimestamp("2026-11-11T10:00:00.000Z") }, idGenerator },
    });
    await characterService.select(initial.id);
    const wildShape = createWildShapeApplicationService({
      characterService,
      creatureService,
      baseRulePack: loaded.value,
      idGenerator,
      currentAccountId: () => accountId,
    });

    const catalog = await wildShape.listCampaignCatalog(initial.id);
    expect(catalog.ok && catalog.value.map((entry) => entry.id)).toContain(customBeast.id);
    const beastRef = { rulesetId: initial.rulesetRef.id, entityId: customBeast.id };
    const seen = await wildShape.markSeen({ characterId: initial.id, expectedRevision: initial.revision, beastRef });
    expect(seen.ok && seen.value.result.status, seen.ok ? JSON.stringify(seen.value.result) : JSON.stringify(seen.error)).toBe("success");
    await characterService.hydrate(initial.id);
    const afterSeen = characterService.store.getSnapshot().value!;
    expect(afterSeen.beastSightings).toHaveLength(1);

    const entered = await wildShape.enter({
      characterId: initial.id,
      expectedRevision: afterSeen.revision,
      beastRef,
      equipmentDisposition: "worn",
      availableActions: ["action", "bonus-action"],
    });
    expect(entered.ok && entered.value.result.status).toBe("success");
    await characterService.hydrate(initial.id);
    const reloaded = characterService.store.getSnapshot().value!;
    expect(reloaded.transformation?.formSnapshot?.id).toBe(customBeast.id);
    expect(reloaded.transformation?.originalSnapshot?.id).toBe(initial.id);
    expect(wildShape.effective(reloaded).hp).toEqual(reloaded.transformation?.formHp);
    characterService.dispose();
  });
});

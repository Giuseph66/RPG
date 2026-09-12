import { describe, expect, it } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { applyCreationDecision, createCharacterDraft, materializeCharacter, validateCharacterCreation } from ".";
import { type CreationCatalog } from "./model";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const now = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });
const draft = (partial: Parameters<typeof createCharacterDraft>[0]["partial"] = {}) => {
  const result = createCharacterDraft({ id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: now, partial });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};
const catalog = (): CreationCatalog => {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  return { rulePack: loaded.value, equipmentBundles };
};

describe("domínio de criação", () => {
  it("rejeita matriz padrão alterada e escolhas repetidas", () => {
    const invalid = draft({ abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 15, con: 12, int: 10, wis: 8, cha: 8 } } });
    const report = validateCharacterCreation(catalog(), invalid);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "invalid-ability-scores")).toBe(true);

    const repeated = draft({
      name: "Teste", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [{ choiceId: "fighter.skills", selectedIds: [ref("athletics"), ref("athletics")], grantedAtLevel: 1, grantingRef: ref("fighter") }],
    });
    expect(validateCharacterCreation(catalog(), repeated).issues.some((entry) => entry.code === "duplicate-choice")).toBe(true);

    const unresolved = draft({
      name: "Teste", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "point-buy", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [{ choiceId: "fighter.equipment", selectedIds: [ref("unknown-pack")], grantedAtLevel: 1, grantingRef: ref("fighter") }],
    });
    const unresolvedReport = validateCharacterCreation(catalog(), unresolved);
    expect(unresolvedReport.issues.some((entry) => entry.code === "unresolved-source")).toBe(true);
  });

  it("aplica decisões sem mutar o draft anterior", () => {
    const initial = draft();
    const result = applyCreationDecision(initial, { kind: "race", raceRef: ref("human") });
    expect(result.ok).toBe(true);
    expect(initial.partial.raceRef).toBeUndefined();
    if (result.ok) expect(result.value.partial.raceRef?.entityId).toBe("human");
  });

  it("materializa equipamento, proficiências, PV e valores derivados", () => {
    const value = draft({
      name: "Guerreiro", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [
        { choiceId: "human.language", selectedIds: [ref("elvish")], grantedAtLevel: 1, grantingRef: ref("human") },
        { choiceId: "fighter.skills", selectedIds: [ref("acrobatics"), ref("perception")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "fighter.equipment", selectedIds: [ref("dungeoneer-pack")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "soldier.tools", selectedIds: [ref("proficiency.gaming-set"), ref("proficiency.vehicle-land")], grantedAtLevel: 1, grantingRef: ref("soldier") },
      ],
    });
    const result = materializeCharacter(catalog(), value, { revision: asRevision(0) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.character.schemaVersion).toBe(1);
      expect(result.value.character.inventory.length).toBeGreaterThan(1);
      expect(result.value.derived.abilityScores.find((entry) => entry.ability === "str")?.score.value).toBe(16);
      expect(result.value.derived.hitPointsMax.value).toBe(12);
      expect(result.value.character.hp.current).toBe(12);
      expect(result.value.derived.proficiencyBonus.value).toBe(2);
    }
  });
});

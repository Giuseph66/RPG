import { describe, expect, it } from "vitest";

import { asEntityId, asUuid } from "@domain/contracts/ids";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { applyLevelUp, buildLevelUpPreview, getProgressionStatus, grantExperience } from ".";
import type { ChoiceDefinition } from "@domain/contracts/primitives";

const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const catalog = loaded.value;
const fighter = asEntityId("fighter");
const baseRequest = { classId: fighter, hitPointGain: { kind: "fixed-average" as const, amount: 5 }, choices: [] };

describe("progressão de personagem", () => {
  it("calcula os limiares XP, PB e o limite do nível 20", () => {
    const below = getProgressionStatus(6499, 4, catalog);
    const eligible = getProgressionStatus(6500, 4, catalog);
    expect(below.ok && below.value.eligibleLevels).toEqual([]);
    expect(eligible.ok && eligible.value.eligibleLevels).toEqual([5]);
    const final = getProgressionStatus(355000, 20, catalog);
    expect(final.ok && final.value.proficiencyBonus).toBe(6);
    expect(final.ok && final.value.nextThreshold).toBeUndefined();
    expect(final.ok && final.value.progress).toBe(1);
  });

  it("preserva o estado atual de PV e aplica um nível de classe imutavelmente", () => {
    const character = { ...minimalCharacter, xp: 300, hp: { current: 3, temp: 2 } };
    const result = applyLevelUp(character, baseRequest, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toBe(character);
    expect(result.value.classes[0].level).toBe(2);
    expect(result.value.hp).toEqual(character.hp);
    expect(result.value.progressionHistory).toHaveLength(character.progressionHistory.length + 1);
  });

  it("exige escolha publicada, rejeita opção inválida e impede salto/reaplicação", () => {
    const choice: ChoiceDefinition = { id: "fighter.asi.2", kind: "ability-score-increase", count: { min: 1, max: 1 }, optionSet: { kind: "explicit", options: [
      { rulesetId: catalog.manifest.id, entityId: asEntityId("str") },
    ] }, prerequisites: [], unique: true, sourceRefs: catalog.classes.get(fighter)!.sourceRefs };
    const customClass = { ...catalog.classes.get(fighter)!, progression: catalog.classes.get(fighter)!.progression.map((entry) => entry.level === 2 ? { ...entry, choicesGranted: [choice] } : entry) };
    const custom = { ...catalog, classes: new Map([...catalog.classes, [fighter, customClass]]) };
    const character = { ...minimalCharacter, xp: 300 };
    const missing = buildLevelUpPreview(character, baseRequest, custom);
    expect(missing.ok && missing.value.pending.some((entry) => entry.code === "required-choice")).toBe(true);
    const invalid = buildLevelUpPreview(character, { ...baseRequest, choices: [{ choiceId: choice.id, selectedIds: [{ rulesetId: catalog.manifest.id, entityId: asEntityId("dex") }], grantedAtLevel: 2, grantingRef: { rulesetId: catalog.manifest.id, entityId: fighter } }] }, custom);
    expect(invalid.ok && invalid.value.pending.some((entry) => entry.code === "invalid-choice")).toBe(true);
    const jumped = buildLevelUpPreview(character, { ...baseRequest, targetClassLevel: 3 }, custom);
    expect(jumped.ok && jumped.value.pending.some((entry) => entry.code === "invalid-level")).toBe(true);
    const validSelection = { choiceId: choice.id, selectedIds: [{ rulesetId: catalog.manifest.id, entityId: asEntityId("str") }], grantedAtLevel: 2, grantingRef: { rulesetId: catalog.manifest.id, entityId: fighter } };
    const applied = applyLevelUp(character, { ...baseRequest, choices: [validSelection], targetClassLevel: 2, mode: "milestone" }, custom);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const replay = applyLevelUp(applied.value, { ...baseRequest, targetClassLevel: 2, mode: "milestone" }, custom);
    expect(!replay.ok && replay.error.some((entry) => entry.code === "already-applied")).toBe(true);
  });

  it("multiclasse de guerreiro exige FOR 13 OU DES 13, não os dois", () => {
    const wizardLevelOne = (scores: { str: number; dex: number }) => ({
      ...minimalCharacter,
      xp: 900,
      classes: [{ classId: asEntityId("wizard"), level: 2, choices: [] }],
      abilityGeneration: { ...minimalCharacter.abilityGeneration, baseScores: { ...minimalCharacter.abilityGeneration.baseScores, ...scores } },
    });
    const codes = (scores: { str: number; dex: number }) => {
      const preview = buildLevelUpPreview(wizardLevelOne(scores), baseRequest, catalog);
      return preview.ok ? preview.value.pending.map((entry) => entry.code) : preview.error.map((entry) => entry.code);
    };
    expect(codes({ str: 13, dex: 8 })).not.toContain("multiclass-prerequisite");
    expect(codes({ str: 8, dex: 13 })).not.toContain("multiclass-prerequisite");
    expect(codes({ str: 12, dex: 12 })).toContain("multiclass-prerequisite");
    const rejected = buildLevelUpPreview(wizardLevelOne({ str: 12, dex: 12 }), baseRequest, catalog);
    const message = JSON.stringify(rejected);
    expect(message).toContain("FOR 13 ou DES 13");
  });

  it("mantém XP monotônico e diagnostica ganho inválido", () => {
    const granted = grantExperience(minimalCharacter, 300);
    expect(granted.ok && granted.value.xp).toBe(300);
    expect(grantExperience(minimalCharacter, -1).ok).toBe(false);
    const unavailable = buildLevelUpPreview({ ...minimalCharacter, xp: 300 }, { ...baseRequest, choices: [{ choiceId: "fighter.missing", selectedIds: [], grantedAtLevel: 2, grantingRef: { rulesetId: catalog.manifest.id, entityId: fighter } }] }, catalog);
    expect(unavailable.ok && unavailable.value.pending.some((entry) => entry.code === "invalid-choice")).toBe(true);
  });

  it("preserva gasto somente da referência de recurso do mesmo ruleset", () => {
    const classDefinition = catalog.classes.get(fighter)!;
    const resourceRef = { rulesetId: catalog.manifest.id, entityId: asEntityId("fighter.second-wind") };
    const customClass = {
      ...classDefinition,
      progression: classDefinition.progression.map((entry) => entry.level === 2
        ? { ...entry, resourceChanges: [{ resourceRef, capacityRule: { kind: "fixed" as const, amount: 1 } }] }
        : entry),
    };
    const custom = { ...catalog, classes: new Map([...catalog.classes, [fighter, customClass]]) };
    const foreign = { ...minimalCharacter, xp: 300, resources: [{ id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), definitionRef: { rulesetId: "foreign-pack" as never, entityId: resourceRef.entityId }, ownerInstanceId: minimalCharacter.id, spent: 1 }] };
    const result = applyLevelUp(foreign, { ...baseRequest, mode: "milestone", targetClassLevel: 2 }, custom);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resources).toHaveLength(2);
      expect(result.value.resources.some((entry) => entry.definitionRef.rulesetId === catalog.manifest.id && entry.definitionRef.entityId === resourceRef.entityId && entry.spent === 0)).toBe(true);
    }
  });
});

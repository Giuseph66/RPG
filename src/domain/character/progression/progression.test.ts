import { describe, expect, it } from "vitest";

import { asEntityId } from "@domain/contracts/ids";
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

  it("mantém XP monotônico e diagnostica ganho inválido", () => {
    const granted = grantExperience(minimalCharacter, 300);
    expect(granted.ok && granted.value.xp).toBe(300);
    expect(grantExperience(minimalCharacter, -1).ok).toBe(false);
    const unavailable = buildLevelUpPreview({ ...minimalCharacter, xp: 300 }, { ...baseRequest, choices: [{ choiceId: "fighter.missing", selectedIds: [], grantedAtLevel: 2, grantingRef: { rulesetId: catalog.manifest.id, entityId: fighter } }] }, catalog);
    expect(unavailable.ok && unavailable.value.pending.some((entry) => entry.code === "invalid-choice")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asCentimeters, type SourceRef } from "@domain/contracts/primitives";
import { asEntityId, type DefinitionRef } from "@domain/contracts/ids";
import { type Character } from "@domain/contracts/character";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type RaceDefinition } from "@domain/contracts/definitions/race";
import { type ClassDefinition } from "@domain/contracts/definitions/class";
import { type BackgroundDefinition } from "@domain/contracts/definitions/background";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { deriveCharacter } from "./derive-character";
import { abilityModifier, proficiencyBonusForLevel } from "../core/modifiers";

const source: SourceRef = { sourceId: minimalCharacter.rulesetRef.id, chapter: "Teste", printedPage: 1, pdfPage: 1 };
const ref = (entityId: string): DefinitionRef => ({ rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId(entityId) });

const race: RaceDefinition = {
  id: asEntityId("human"), name: "Humano", tags: [], sourceRefs: [source], abilityIncreases: [], size: "medium",
  speedCm: asCentimeters(9000), languages: [], senses: [], proficiencies: [], traits: [], subraceIds: [], choices: [],
};
const background: BackgroundDefinition = {
  id: asEntityId("soldier"), name: "Soldado", tags: [], sourceRefs: [source], skillProficiencies: [], toolChoices: [],
  languageChoices: [], equipment: [], feature: { name: "", description: "" }, variants: [],
};
const classDefinition: ClassDefinition = {
  id: asEntityId("fighter"), name: "Guerreiro", tags: [], sourceRefs: [source], hitDie: 10, primaryAbilities: ["str"],
  initialProficiencies: [ref("athletics")], savingThrowProficiencies: ["str"],
  skillChoices: { id: "skills", kind: "skill-proficiency", count: { min: 0, max: 2 }, optionSet: { kind: "selector", selector: { kind: "any-skill" } }, prerequisites: [], unique: true, sourceRefs: [source] },
  initialEquipmentChoices: [], progression: [{ level: 1, featureRefs: [], resourceChanges: [], choicesGranted: [] }],
  subclassSelectionLevel: 3, subclassIds: [], multiclassPrerequisites: [], multiclassProficiencies: [],
};

function pack(overrides: {
  readonly features?: readonly FeatureDefinition[];
  readonly conditions?: readonly ConditionDefinition[];
  readonly equipment?: readonly import("@domain/contracts/definitions/equipment").EquipmentDefinition[];
} = {}): RulePack {
  const manifest = {
    id: minimalCharacter.rulesetRef.id, name: "Teste", edition: "teste", version: minimalCharacter.rulesetRef.version,
    language: "pt-BR" as const, sourceRefs: [source], contentPolicy: "embedded" as const,
    entityCounts: {}, checksums: {}, schemaCompatibility: { minSchemaVersion: 1, maxSchemaVersion: 1 },
  };
  const classes = (overrides.features?.length ?? 0) > 0
    ? [{ ...classDefinition, progression: [{ ...classDefinition.progression[0], featureRefs: overrides.features?.map((entry) => ref(String(entry.id))) ?? [] }] }]
    : [classDefinition];
  return {
    manifest, races: new Map([[race.id, race]]), subraces: new Map(), classes: new Map(classes.map((entry) => [entry.id, entry])), subclasses: new Map(),
    backgrounds: new Map([[background.id, background]]), feats: new Map(), features: new Map((overrides.features ?? []).map((entry) => [entry.id, entry])),
    resources: new Map(), conditions: new Map((overrides.conditions ?? []).map((entry) => [entry.id, entry])), equipment: new Map((overrides.equipment ?? []).map((entry) => [entry.id, entry])),
    spells: new Map(), progression: { id: asEntityId("progression"), name: "", tags: [], sourceRefs: [source], table: Array.from({ length: 20 }, (_, index) => ({ totalLevel: index + 1, xpThreshold: 0, proficiencyBonus: 2 + Math.floor(index / 4) })) },
    characterTemplates: new Map(),
  } as unknown as RulePack;
}

function character(overrides: Partial<Character> = {}): Character {
  return { ...minimalCharacter, ...overrides };
}

const context = { gameTime: { day: 1, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] } as const;

describe("deriveCharacter", () => {
  it("aplica floor correto para modificadores negativos", () => {
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(1)).toBe(-5);
  });

  it("usa bônus de proficiência pelos limites da tabela", () => {
    expect(proficiencyBonusForLevel(1, [{ totalLevel: 1, proficiencyBonus: 2 }, { totalLevel: 20, proficiencyBonus: 6 }])).toEqual({ ok: true, value: 2 });
    expect(proficiencyBonusForLevel(20, [{ totalLevel: 1, proficiencyBonus: 2 }, { totalLevel: 20, proficiencyBonus: 6 }])).toEqual({ ok: true, value: 6 });
    expect(proficiencyBonusForLevel(21, [{ totalLevel: 1, proficiencyBonus: 2 }]).ok).toBe(false);
    const result = deriveCharacter(character(), pack(), context);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.proficiencyBonus.value).toBe(2);
  });

  it("soma armadura e escudo, e rejeita duas bases concorrentes", () => {
    const armor = { id: asEntityId("chain-mail"), name: "Cota", tags: [], sourceRefs: [source], category: "armor" as const, weightGrams: 0 as never, valueCp: 0 as never, stackable: false, properties: [], armor: { armorCategory: "heavy" as const, baseArmorClass: 16, dexModifierCap: 0, stealthDisadvantage: true } };
    const shield = { ...armor, id: asEntityId("shield"), name: "Escudo", armor: { armorCategory: "shield" as const, baseArmorClass: 2, stealthDisadvantage: false } };
    const equipped = character({ inventory: [
      { id: "11111111-1111-4111-8111-111111111111" as never, equipmentRef: ref("chain-mail"), quantity: 1, equippedState: "equipped", notes: "" },
      { id: "22222222-2222-4222-8222-222222222222" as never, equipmentRef: ref("shield"), quantity: 1, equippedState: "equipped", notes: "" },
    ] });
    const result = deriveCharacter(equipped, pack({ equipment: [armor, shield] }), context);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.armorClass.value).toBe(18);
    const competing: FeatureDefinition = { id: asEntityId("feature"), name: "", tags: [], sourceRefs: [source], activation: { kind: "passive" }, eligibility: [], resourceCosts: [], choices: [], automationStatus: "automated", pendingDecisionIds: [], effects: [
      { kind: "modifier", modifier: { id: "a", sourceRef: source, target: { kind: "armor-class" }, operator: "set-base", value: { kind: "number", amount: 12 }, predicate: { kind: "always" } } },
      { kind: "modifier", modifier: { id: "b", sourceRef: source, target: { kind: "armor-class" }, operator: "set-base", value: { kind: "number", amount: 13 }, predicate: { kind: "always" } } },
    ] };
    const concurrent = deriveCharacter(character(), pack({ features: [competing] }), context);
    expect(concurrent.ok).toBe(false);
    if (!concurrent.ok) expect(concurrent.error.code).toBe("unresolved-rule");
  });

  it("aplica expertise sem duplicar bônus de proficiência e condição ativa", () => {
    const condition: ConditionDefinition = { id: asEntityId("blessed"), name: "", tags: [], sourceRefs: [source], stackingPolicy: "no-stack", removalTriggers: [], mechanicalEffects: [{ id: "bonus", sourceRef: source, target: { kind: "skill", skill: "athletics" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "while-condition-active", conditionRef: ref("blessed") } }] };
    const skilled = character({
      choices: [{ choiceId: "expertise", selectedIds: [ref("athletics")], grantedAtLevel: 1, grantingRef: ref("fighter") }],
      conditions: [{ id: "33333333-3333-4333-8333-333333333333" as never, definitionRef: ref("blessed"), origin: { kind: "environment", description: "teste" } }],
    });
    const result = deriveCharacter(skilled, pack({ conditions: [condition] }), context);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.skills.find((entry) => entry.skill === "athletics")?.modifier.value).toBe(7);
  });
});

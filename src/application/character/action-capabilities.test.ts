import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { type Character } from "@domain/contracts/character";
import { type CharacterDerived, type Explanation } from "@domain/contracts/derived";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type ClassDefinition } from "@domain/contracts/definitions/class";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { asCommandId, asEntityId, asIsoTimestamp, asUuid, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type IdGenerator } from "@application/ports/id-generator";
import { createSequenceRandomSource, rollExpression } from "@domain/dice";
import { type DiceRoll } from "@domain/contracts/dice";

import { deriveActionCapabilities, type ActionCapabilityExecution } from "./action-capabilities";

const RULESET_ID = minimalCharacter.rulesetRef.id;
const ref = (entityId: string): DefinitionRef => ({ rulesetId: RULESET_ID, entityId: asEntityId(entityId) });
const exp = (value: number): Explanation<number> => ({ value, contributions: [] });

function fakeIdGenerator(): IdGenerator {
  let uuidCounter = 0;
  let commandCounter = 0;
  return {
    uuid: () => asUuid(`00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`),
    commandId: () => asCommandId(`cmd-${++commandCounter}`),
  };
}

const weaponDefinition: EquipmentDefinition = {
  id: asEntityId("dagger"), name: "Adaga", tags: [], sourceRefs: [],
  category: "weapon",
  weightGrams: 0 as never,
  valueCp: 0 as never,
  stackable: false,
  properties: [],
  weapon: {
    damageParts: [{ expression: { quantity: 1, faces: 4 }, damageType: "piercing" }],
    reachCm: 150 as never,
    abilityPolicy: { kind: "fixed", ability: "dex" },
    proficiencyCategory: "simple",
    properties: ["light", "finesse"],
  },
};

const knownSpell: SpellDefinition = {
  id: asEntityId("magic-missile"), name: "Mísseis Mágicos", tags: [], sourceRefs: [],
  level: 1, school: "evocation", castingTime: { kind: "action" }, range: { kind: "self" },
  components: { verbal: true, somatic: true }, duration: { kind: "instantaneous", endTriggers: [] },
  concentration: false, ritual: false, classes: [asEntityId("wizard")],
  targetType: { type: "creature", count: 1, restrictions: [], visibilityRequired: false },
  attackType: "none", damage: [{ expression: { quantity: 1, faces: 4 }, damageType: "force" }], healing: [],
  higherLevels: { kind: "none" }, effects: [], automationStatus: "automated", pendingDecisionIds: [],
};

const blockedSpell: SpellDefinition = {
  ...knownSpell,
  id: asEntityId("wish"), name: "Desejo", automationStatus: "blocked", pendingDecisionIds: ["PEND-WISH"],
};

const resourceDefinition: ResourceDefinition = {
  id: asEntityId("arcane-recovery"), name: "Recuperação Arcana", tags: [], sourceRefs: [],
  ownerRef: ref("wizard"), unit: "uses",
  capacityRule: { kind: "fixed", amount: 1 },
  spendRules: [{ kind: "per-use", amount: 1 }],
  recoveryTriggers: [{ kind: "long-rest" }],
  recoveryAmountRule: { kind: "full" },
};

const blockedFeature: FeatureDefinition = {
  id: asEntityId("wild-shape-block"), name: "Forma Selvagem (bloqueada)", tags: [], sourceRefs: [],
  activation: { kind: "action" }, eligibility: [], effects: [], resourceCosts: [], choices: [],
  automationStatus: "blocked", pendingDecisionIds: ["PEND-005"],
};

const passiveFeature: FeatureDefinition = {
  id: asEntityId("darkvision"), name: "Visão no Escuro", tags: [], sourceRefs: [],
  activation: { kind: "passive" }, eligibility: [], effects: [], resourceCosts: [], choices: [],
  automationStatus: "automated", pendingDecisionIds: [],
};

const wizardClass: ClassDefinition = {
  id: asEntityId("wizard"), name: "Mago", tags: [], sourceRefs: [], hitDie: 6, primaryAbilities: ["int"],
  initialProficiencies: [], savingThrowProficiencies: ["int", "wis"],
  skillChoices: { id: "skills", kind: "skill-proficiency", count: { min: 0, max: 2 }, optionSet: { kind: "selector", selector: { kind: "any-skill" } }, prerequisites: [], unique: true, sourceRefs: [] },
  initialEquipmentChoices: [],
  progression: [{ level: 1, featureRefs: [ref("wild-shape-block"), ref("darkvision")], resourceChanges: [], choicesGranted: [] }],
  subclassSelectionLevel: 3, subclassIds: [], multiclassPrerequisites: [], multiclassProficiencies: [],
};

function pack(): RulePack {
  return {
    manifest: {
      id: RULESET_ID, name: "Teste", edition: "teste", version: minimalCharacter.rulesetRef.version,
      language: "pt-BR", contentPolicy: "embedded", sourceRefs: [], entityCounts: {}, checksums: {},
      schemaCompatibility: { minSchemaVersion: 1, maxSchemaVersion: 1 },
    },
    races: new Map(), subraces: new Map(),
    classes: new Map([[wizardClass.id, wizardClass]]),
    subclasses: new Map(),
    backgrounds: new Map(), feats: new Map(),
    features: new Map([[blockedFeature.id, blockedFeature], [passiveFeature.id, passiveFeature]]),
    resources: new Map([[resourceDefinition.id, resourceDefinition]]),
    conditions: new Map(),
    equipment: new Map([[weaponDefinition.id, weaponDefinition]]),
    spells: new Map([[knownSpell.id, knownSpell], [blockedSpell.id, blockedSpell]]),
    progression: { id: asEntityId("progression"), name: "", tags: [], sourceRefs: [], table: [] },
    characterTemplates: new Map(),
  } as unknown as RulePack;
}

function character(overrides: Partial<Character> = {}): Character {
  return {
    ...minimalCharacter,
    classes: [{ classId: asEntityId("wizard"), level: 1, choices: [] }],
    inventory: [{ id: asUuid("11111111-1111-4111-8111-000000000001"), equipmentRef: ref("dagger"), quantity: 1, equippedState: "equipped", notes: "" }],
    castingSources: [{ id: asUuid("11111111-1111-4111-8111-000000000002"), grantingRef: ref("wizard"), ability: "int", knownSpellRefs: [ref("magic-missile"), ref("wish")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [] }],
    resources: [{ id: asUuid("11111111-1111-4111-8111-000000000003"), definitionRef: ref("arcane-recovery"), ownerInstanceId: asUuid("11111111-1111-4111-8111-000000000004"), spent: 1 }],
    ...overrides,
  };
}

function derivedFor(char: Character): CharacterDerived {
  return {
    characterId: char.id,
    characterRevision: char.revision,
    rulesetRef: char.rulesetRef,
    abilityScores: [], skills: [], savingThrows: [],
    armorClass: exp(11), initiative: exp(1),
    speedsCm: [], proficiencyBonus: exp(2),
    hitPointsMax: exp(18),
    resourceCapacities: [{ definitionRef: ref("arcane-recovery"), capacity: exp(2) }],
    attacks: [{
      sourceRef: ref("dagger"),
      attackModifier: exp(5),
      damageParts: [{ expression: { quantity: 1, faces: 4 }, damageType: "piercing", modifierBonus: exp(3) }],
    }],
    spellcastingSources: [],
    resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] },
    passivePerception: exp(12),
  };
}

describe("deriveActionCapabilities", () => {
  it("deriva ataque, magia, dano/cura manual, descanso, recurso e feature bloqueada", () => {
    const char = character();
    const idGenerator = fakeIdGenerator();
    const { capabilities, executions } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);

    const attack = capabilities.find((c) => c.kind === "attack");
    expect(attack?.status).toBe("available");
    expect(attack?.label).toContain("Adaga");
    expect(executions.get(attack!.id)?.rollPlan).toHaveLength(2); // 1 rolagem de ataque + 1 de dano
    // Achado #1 de QA-004: "attack" sinaliza que precisa da CA do alvo, sem default nenhum.
    expect(attack?.inputKind).toBe("target-armor-class");
    expect(attack?.inputDefault).toBeUndefined();

    const knownSpellCapability = capabilities.find((c) => c.id.endsWith(":magic-missile"));
    expect(knownSpellCapability?.status).toBe("available");
    expect(executions.has(knownSpellCapability!.id)).toBe(true);

    const blockedSpellCapability = capabilities.find((c) => c.id.endsWith(":wish"));
    expect(blockedSpellCapability?.status).toBe("blocked");
    expect(blockedSpellCapability?.blockedReason).toContain("PEND-WISH");
    expect(executions.has(blockedSpellCapability!.id)).toBe(false);

    const manualDamage = capabilities.find((c) => c.id === "manual-damage");
    expect(manualDamage?.kind).toBe("damage");
    expect(manualDamage?.status).toBe("available");
    expect(executions.has("manual-damage")).toBe(true);
    // Achado #1 de QA-004: dano/cura manual pedem uma quantidade com fallback seguro (5).
    expect(manualDamage?.inputKind).toBe("amount");
    expect(manualDamage?.inputDefault).toBe(5);

    const manualHealing = capabilities.find((c) => c.id === "manual-healing");
    expect(manualHealing?.status).toBe("available");
    expect(manualHealing?.inputKind).toBe("amount");
    expect(manualHealing?.inputDefault).toBe(5);

    const restCapabilities = capabilities.filter((c) => c.kind === "rest");
    expect(restCapabilities.map((c) => c.id).sort()).toEqual(["rest:long", "rest:short"]);
    expect(executions.has("rest:short")).toBe(true);
    expect(executions.has("rest:long")).toBe(true);

    const resourceCapability = capabilities.find((c) => c.id === `resource:${char.resources[0].id}`);
    expect(resourceCapability?.status).toBe("unsupported");
    expect(executions.has(resourceCapability!.id)).toBe(false);

    const blockedFeatureCapability = capabilities.find((c) => c.id === "feature:wild-shape-block");
    expect(blockedFeatureCapability?.status).toBe("blocked");
    expect(blockedFeatureCapability?.blockedReason).toContain("PEND-005");
    expect(executions.has(blockedFeatureCapability!.id)).toBe(false);

    // Feature passiva não vira capacidade (nada para "ativar").
    expect(capabilities.some((c) => c.id === "feature:darkvision")).toBe(false);

    // Nenhuma capacidade de concentração: personagem não está concentrando.
    expect(capabilities.some((c) => c.kind === "concentration")).toBe(false);
  });

  it("expõe capacidade de concentração somente quando ativa, com o comando end-concentration", () => {
    const char = character({
      concentration: { effectId: asUuid("22222222-2222-4222-8222-000000000001"), sourceRef: ref("magic-missile"), duration: { kind: "instant" }, pendingSaveIds: [] },
    });
    const idGenerator = fakeIdGenerator();
    const { capabilities, executions } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);
    const concentration = capabilities.find((c) => c.kind === "concentration");
    expect(concentration?.status).toBe("available");
    const execution = executions.get(concentration!.id);
    expect(execution?.command.kind).toBe("end-concentration");
  });

  it("nunca lança quando o pack não tem a definição da magia referenciada", () => {
    const char = character({
      castingSources: [{ id: asUuid("11111111-1111-4111-8111-000000000002"), grantingRef: ref("wizard"), ability: "int", knownSpellRefs: [ref("nao-existe")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [] }],
    });
    const idGenerator = fakeIdGenerator();
    expect(() => deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator)).not.toThrow();
    const { capabilities } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);
    const missing = capabilities.find((c) => c.id.endsWith(":nao-existe"));
    expect(missing?.status).toBe("pending");
  });

  it("resolve de dano/cura manual usa o value do intent e cai no preset (5) sem valor informado", () => {
    const char = character();
    const idGenerator = fakeIdGenerator();
    const { executions } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);
    const rolls = new Map<Uuid, DiceRoll>();

    const damage = executions.get("manual-damage")!;
    const damageWithoutValue = damage.resolve({ character: char, rolls });
    expect(damageWithoutValue.status).toBe("success");
    if (damageWithoutValue.status === "success") expect(damageWithoutValue.nextState.hp.current).toBe(char.hp.current - 5); // preset

    const damageWithValue = damage.resolve({ character: char, rolls, value: 12 });
    expect(damageWithValue.status).toBe("success");
    if (damageWithValue.status === "success") expect(damageWithValue.nextState.hp.current).toBe(Math.max(0, char.hp.current - 12));

    const healing = executions.get("manual-healing")!;
    const healingWithoutValue = healing.resolve({ character: char, rolls });
    expect(healingWithoutValue.status).toBe("success");
    if (healingWithoutValue.status === "success") expect(healingWithoutValue.nextState.hp.current).toBe(char.hp.current + 5); // preset

    const healingWithValue = healing.resolve({ character: char, rolls, value: 2 });
    expect(healingWithValue.status).toBe("success");
    if (healingWithValue.status === "success") expect(healingWithValue.nextState.hp.current).toBe(char.hp.current + 2);
  });

  it("resolve de ataque encaminha a CA do alvo recebida; sem valor mantém needsInput honesto", () => {
    const char = character();
    const idGenerator = fakeIdGenerator();
    const { capabilities, executions } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);
    const attackCapability = capabilities.find((c) => c.kind === "attack")!;
    const execution: ActionCapabilityExecution = executions.get(attackCapability.id)!;

    // d20 15 + mod 5 = 20 (bate qualquer CA razoável, não é natural 1/20); d4 4 + mod 3 = 7 de dano.
    const rng = createSequenceRandomSource([15, 4]);
    const rolls = new Map<Uuid, DiceRoll>();
    for (const planned of execution.rollPlan) {
      const rolled = rollExpression(planned.expression, rng, { id: planned.id, timestamp: asIsoTimestamp("2024-01-01T00:00:00.000Z"), purpose: planned.purpose, characterId: char.id, commandId: execution.command.commandId });
      expect(rolled.ok).toBe(true);
      if (rolled.ok) rolls.set(planned.id, rolled.value);
    }

    const withoutArmorClass = execution.resolve({ character: char, rolls });
    expect(withoutArmorClass.status).toBe("needsInput");

    const withArmorClass = execution.resolve({ character: char, rolls, targetArmorClass: 10 });
    expect(withArmorClass.status).toBe("success");
    if (withArmorClass.status === "success") expect(withArmorClass.nextState.hp.current).toBe(char.hp.current - 7);
  });
});

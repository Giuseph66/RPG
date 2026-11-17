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
import { FAIRY_SUPPLEMENT_ID } from "@data/rulepacks/optional-supplements";

import { deriveActionCapabilities, type ActionCapabilityExecution } from "./action-capabilities";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { composeOptionalRuleContent } from "@domain/character/creation/optional-rules";
import { TASHA_RANGER_SUPPLEMENT_ID } from "@data/rulepacks/optional-supplements";

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

const selfHealingSpell: SpellDefinition = {
  ...knownSpell,
  id: asEntityId("cure-wounds"),
  name: "Curar Ferimentos",
  range: { kind: "touch" },
  classes: [asEntityId("bard")],
  targetType: { type: "creature", count: 1, restrictions: [], visibilityRequired: false },
  damage: [],
  healing: [{ expression: { quantity: 1, faces: 8 }, bonusPerCastingSourceAbility: true }],
};

const featureConcentrationSpell: SpellDefinition = {
  ...knownSpell,
  id: asEntityId("fey-summon"),
  name: "Invocar Feérico",
  classes: [asEntityId("ranger")],
  components: { verbal: false, somatic: false },
  concentration: true,
  duration: { kind: "minutes", amount: 1, unit: "minute", endTriggers: [] },
  damage: [],
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

const variableResourceDefinition: ResourceDefinition = {
  id: asEntityId("channel-divinity"), name: "Canalizar Divindade", tags: [], sourceRefs: [],
  ownerRef: ref("wizard"), unit: "uses",
  capacityRule: { kind: "fixed", amount: 1 },
  spendRules: [{ kind: "variable", description: "Custo depende da opção escolhida." }],
  recoveryTriggers: [{ kind: "short-rest" }],
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
    resources: new Map([[resourceDefinition.id, resourceDefinition], [variableResourceDefinition.id, variableResourceDefinition]]),
    conditions: new Map(),
    equipment: new Map([[weaponDefinition.id, weaponDefinition]]),
    spells: new Map([[knownSpell.id, knownSpell], [blockedSpell.id, blockedSpell], [selfHealingSpell.id, selfHealingSpell], [featureConcentrationSpell.id, featureConcentrationSpell]]),
    progression: { id: asEntityId("progression"), name: "", tags: [], sourceRefs: [], table: [] },
    characterTemplates: new Map(),
  } as unknown as RulePack;
}

function tirelessPack(): RulePack {
  const base = pack();
  const feature: FeatureDefinition = {
    id: asEntityId("ranger.tireless"), name: "Incansável", tags: [], sourceRefs: [],
    activation: { kind: "action" }, eligibility: [],
    effects: [{ kind: "grants-resource", resourceRef: ref("ranger.tireless-use") }],
    resourceCosts: [], choices: [], automationStatus: "assisted", pendingDecisionIds: [],
  };
  const resource: ResourceDefinition = {
    id: asEntityId("ranger.tireless-use"), name: "Incansável", tags: [], sourceRefs: [], ownerRef: ref("ranger.tireless"),
    unit: "uses", capacityRule: { kind: "proficiency-bonus" }, spendRules: [{ kind: "per-use", amount: 1 }],
    recoveryTriggers: [{ kind: "long-rest" }], recoveryAmountRule: { kind: "full" },
  };
  const rangerClass: ClassDefinition = {
    ...wizardClass,
    id: asEntityId("ranger"), name: "Guardião",
    progression: Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      featureRefs: index === 9 ? [ref("ranger.tireless")] : [],
      resourceChanges: [], choicesGranted: [],
    })),
  };
  return {
    ...base,
    classes: new Map([...base.classes, [rangerClass.id, rangerClass]]),
    features: new Map([...base.features, [feature.id, feature]]),
    resources: new Map([...base.resources, [resource.id, resource]]),
  };
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
  it("usa o nome de ação da forma no capability e nos rótulos de rolagem, preservando armas", () => {
    const char = character();
    const transformed = {
      ...derivedFor(char),
      attacks: [{
        sourceRef: ref("appendix-a-ra-gigante"),
        label: "Mordida — Rã Gigante",
        attackModifier: exp(3),
        damageParts: [{ expression: { quantity: 1, faces: 6 as const }, damageType: "piercing" as const, modifierBonus: exp(1) }],
      }],
    };
    const { capabilities, executions } = deriveActionCapabilities(char, transformed, pack(), fakeIdGenerator());
    const capability = capabilities.find(({ id }) => id === "attack:0:appendix-a-ra-gigante");
    expect(capability).toMatchObject({
      label: "Atacar com Mordida — Rã Gigante",
      description: expect.stringContaining("efeitos condicionais publicados devem ser resolvidos manualmente"),
    });
    const execution = executions.get(capability!.id)!;
    expect(execution.rollPlan.map(({ label }) => label)).toEqual([
      "Mordida — Rã Gigante — ataque",
      "Mordida — Rã Gigante — dano piercing",
    ]);
  });

  it("executa Incansável como uma ação atômica com d8 e Sabedoria negativa mínima 1", () => {
    const stateId = asUuid("99999999-9999-4999-8999-999999999991");
    const char = character({
      classes: [{ classId: asEntityId("ranger"), level: 10, choices: [] }],
      hp: { current: 8, temp: 0 },
      resources: [{ id: stateId, definitionRef: ref("ranger.tireless-use"), ownerInstanceId: minimalCharacter.id, spent: 0 }],
    });
    const derived = {
      ...derivedFor(char),
      abilityScores: [{ ability: "wis" as const, score: exp(8), modifier: exp(-1) }],
      resourceCapacities: [{ definitionRef: ref("ranger.tireless-use"), capacity: exp(6) }],
    };
    const { capabilities, executions } = deriveActionCapabilities(char, derived, tirelessPack(), fakeIdGenerator());
    const capability = capabilities.find(({ id }) => id === `resource:${stateId}`);
    expect(capability).toMatchObject({ kind: "resource", status: "available", actionCost: "action" });
    const execution = executions.get(`resource:${stateId}`);
    expect(execution?.command.kind).toBe("use-tireless");
    expect(execution?.rollPlan).toHaveLength(1);
    expect(execution?.rollPlan?.[0]).toMatchObject({ expression: { quantity: 1, faces: 8, modifier: 0 }, purpose: "healing" });
    if (!execution?.rollPlan?.[0]) return;
    expect(capability?.rollsOnConfirm).toEqual([execution.rollPlan[0].id]);
    expect(capability?.preview).toMatchObject({
      status: "needsInput",
      requests: [{ id: execution.rollPlan[0].id, reason: expect.stringContaining("rolagem d8") }],
    });
    const roll: DiceRoll = {
      id: execution.rollPlan[0].id,
      expression: execution.rollPlan[0].expression,
      purpose: "healing", timestamp: asIsoTimestamp("2026-10-01T00:00:00.000Z"),
      rawDice: [1], selectedIndexes: [0], discardedIndexes: [], subtotal: 1, modifier: 0, total: 1, rngVersion: "test",
    };
    const result = execution.resolve({ character: char, rolls: new Map([[roll.id, roll]]) });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.resources[0]?.spent).toBe(1);
      expect(result.nextState.hp.temp).toBe(1); // max(1, d8 1 + SAB -1)
      expect(result.effects.map(({ kind }) => kind)).toEqual(["resource-spent", "hp-changed"]);
    }

    const existingTempHp = { ...char, hp: { ...char.hp, temp: 5 } };
    const doesNotStack = execution.resolve({ character: existingTempHp, rolls: new Map([[roll.id, roll]]) });
    expect(doesNotStack.status).toBe("success");
    if (doesNotStack.status === "success") expect(doesNotStack.nextState.hp.temp).toBe(5);
  });

  it("reduz exaustão no descanso curto apenas quando Incansável está realmente concedido", () => {
    const exhaustion = {
      id: asUuid("99999999-9999-4999-8999-999999999993"),
      definitionRef: ref("exhaustion"),
      origin: { kind: "environment" as const, description: "teste" },
      severity: 1,
    };
    const runShortRest = (level: number, rules: RulePack) => {
      const char = character({ classes: [{ classId: asEntityId("ranger"), level, choices: [] }], conditions: [exhaustion] });
      const { executions } = deriveActionCapabilities(char, derivedFor(char), rules, fakeIdGenerator());
      return executions.get("rest:short")?.resolve({ character: char, rolls: new Map() });
    };

    const active = runShortRest(10, tirelessPack());
    expect(active?.status).toBe("success");
    if (active?.status === "success") expect(active.nextState.conditions).toEqual([]);

    const belowLevel = runShortRest(9, tirelessPack());
    expect(belowLevel?.status).toBe("success");
    if (belowLevel?.status === "success") expect(belowLevel.nextState.conditions).toEqual([exhaustion]);

    const withoutOptionalPack = runShortRest(10, pack());
    expect(withoutOptionalPack?.status).toBe("success");
    if (withoutOptionalPack?.status === "success") expect(withoutOptionalPack.nextState.conditions).toEqual([exhaustion]);
  });

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

    const knownSpellCapability = capabilities.find((c) => c.id.endsWith(":magic-missile:slot"));
    expect(knownSpellCapability?.status).toBe("blocked"); // sem espaço, a capacidade não pode prometer uma conjuração
    expect(knownSpellCapability?.blockedReason).toContain("Nenhum espaço");
    expect(executions.has(knownSpellCapability!.id)).toBe(false);

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
    expect(resourceCapability?.status).toBe("available");
    expect(resourceCapability?.costs).toEqual([{ label: "Usos restantes", remaining: 1 }]); // capacidade 2, gasto 1
    const resourceExecution = executions.get(resourceCapability!.id);
    expect(resourceExecution).toBeDefined();
    expect(resourceExecution?.command.kind).toBe("spend-resource");
    const spent = resourceExecution!.resolve({ character: char, rolls: new Map() });
    expect(spent.status).toBe("success");
    if (spent.status === "success") expect(spent.nextState.resources[0].spent).toBe(2);

    const blockedFeatureCapability = capabilities.find((c) => c.id === "feature:wild-shape-block");
    expect(blockedFeatureCapability?.status).toBe("blocked");
    expect(blockedFeatureCapability?.blockedReason).toContain("PEND-005");
    expect(executions.has(blockedFeatureCapability!.id)).toBe(false);

    // Feature passiva não vira capacidade (nada para "ativar").
    expect(capabilities.some((c) => c.id === "feature:darkvision")).toBe(false);

    // Nenhuma capacidade de concentração: personagem não está concentrando.
    expect(capabilities.some((c) => c.kind === "concentration")).toBe(false);
  });

  it("monta Curar Ferimentos como execução real no próprio personagem", () => {
    const poolId = asUuid("99999999-9999-4999-8999-999999999999");
    const char = character({
      hp: { current: 5, temp: 0 },
      classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 15, con: 13, int: 10, wis: 12, cha: 15 } },
      castingSources: [{ id: asUuid("11111111-1111-4111-8111-000000000002"), grantingRef: ref("bard"), ability: "cha", knownSpellRefs: [ref("cure-wounds")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId] }],
      spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }],
    });
    const derived = { ...derivedFor(char), abilityScores: [{ ability: "cha" as const, score: exp(16), modifier: exp(3) }] };
    const { capabilities, executions } = deriveActionCapabilities(char, derived, pack(), fakeIdGenerator());
    const capability = capabilities.find((entry) => entry.id.endsWith(":cure-wounds:slot"));
    expect(capability?.status).toBe("available");
    expect(capability?.effectSummary?.[0]).toContain("1d8");
    expect(capability?.effectSummary?.[0]).toContain("CAR");
    expect(capability?.description).toContain("Usa espaço de 1º nível");
    expect(capability?.preview).toBeDefined();
    expect(capability?.spellTargeting).toBeUndefined(); // o comando já tem a própria ficha como alvo explícito
    const execution = executions.get(capability!.id)!;
    expect(execution.command.kind).toBe("cast-spell");
    if (execution.command.kind === "cast-spell") {
      expect(execution.command.payload.targetContext.targetIds).toEqual([char.id]);
      expect(execution.command.payload.slotLevel).toBe(1);
      expect(execution.command.payload.resourcePoolId).toBe(poolId);
    }
    const planned = execution.rollPlan[0];
    const rolled = rollExpression(planned.expression, createSequenceRandomSource([7]), { id: planned.id, timestamp: asIsoTimestamp("2024-01-01T00:00:00.000Z"), purpose: planned.purpose, characterId: char.id, commandId: execution.command.commandId });
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    const result = execution.resolve({ character: char, rolls: new Map([[planned.id, rolled.value]]) });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.hp.current).toBe(15); // 1d8 (7) + CAR final 16 (+3), embora a base seja 15
      expect(result.nextState.spellSlots[0].spent).toBe(1);
    }
  });

  it("aceita foco druídico em truque de Guerreiro Druídico com o Tasha ligado, com ou sem seleção antiga gravada", () => {
    const loaded = loadPhbPtBrLocal2017();
    if (!loaded.ok) throw new Error(loaded.error.message);
    const basePack = loaded.value;
    const tashaId = TASHA_RANGER_SUPPLEMENT_ID;
    const tashaRef = (entityId: string): DefinitionRef => ({ rulesetId: basePack.manifest.id, entityId: asEntityId(entityId) });
    const spellRef = tashaRef("bordao-mistico");

    const scenario = (withFocus: boolean) => {
      const selections = [
        { supplementId: tashaId, optionId: asEntityId("ranger.optional-fighting-style"), selectedFeatureRefs: [] },
        ...(withFocus ? [{ supplementId: tashaId, optionId: asEntityId("ranger.optional-druidic-focus"), selectedFeatureRefs: [tashaRef("ranger.druidic-focus")] }] : []),
      ];
      const composed = composeOptionalRuleContent(basePack, [tashaId], selections);
      if (!composed.ok) throw new Error(composed.error.message);
      const sourceId = asUuid(withFocus ? "88888888-8888-4888-8888-888888888881" : "88888888-8888-4888-8888-888888888880");
      const sourceFeature = composed.value.features.get(asEntityId("ranger.druidic-warrior"));
      if (!sourceFeature?.spellcastingSource) throw new Error("Guerreiro Druídico sem origem de conjuração publicada");
      const char = character({
        selectedSupplementIds: [tashaId],
        optionalRuleSelections: selections,
        classes: [{
          classId: asEntityId("ranger"), level: 2, choices: [{
            choiceId: "ranger.fighting-style.2", selectedIds: [tashaRef("ranger.druidic-warrior")],
            grantedAtLevel: 2, grantingRef: tashaRef("ranger.fighting-style"),
          }],
        }],
        castingSources: [{
          id: sourceId, grantingRef: tashaRef("ranger.druidic-warrior"), sourceKind: "feature",
          ability: sourceFeature.spellcastingSource.ability, spellListClassId: sourceFeature.spellcastingSource.spellListClassId,
          knownSpellRefs: [spellRef], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [],
        }],
      });
      const { capabilities } = deriveActionCapabilities(char, derivedFor(char), composed.value, fakeIdGenerator());
      const capability = capabilities.find((entry) => entry.id === `spell:${sourceId}:bordao-mistico`);
      return { char, capability };
    };

    // Foco de Conjuração é automático com o Tasha ligado; fichas antigas com a seleção gravada continuam iguais.
    const withoutOption = scenario(false);
    const withOption = scenario(true);
    expect(basePack.spells.get(spellRef.entityId)?.components.material).toBeDefined();
    expect(withoutOption.char.castingSources[0]).toMatchObject({ sourceKind: "feature", ability: "wis", spellListClassId: "druid" });
    expect(withoutOption.capability).toMatchObject({ spellAllowsFocus: true, spellRequiresMaterial: true });
    expect(withOption.capability).toMatchObject({ spellAllowsFocus: true, spellRequiresMaterial: true });
  });

  it("explica efeito manual somente para a concessão racial assistida autorizada", () => {
    const loaded = loadPhbPtBrLocal2017();
    if (!loaded.ok) throw new Error(loaded.error.message);
    const composed = composeOptionalRuleContent(loaded.value, [FAIRY_SUPPLEMENT_ID], []);
    if (!composed.ok) throw new Error(composed.error.message);
    const fairyGrant = composed.value.races.get(asEntityId("fairy"))?.spellcastingSources?.find((entry) => String(entry.id) === "fairy.magic-faerie-fire");
    if (!fairyGrant) throw new Error("A concessão Fogo das Fadas da Fada não foi publicada");
    const spellRef = ref("fogo-das-fadas");
    const poolId = asUuid("55555555-5555-4555-8555-555555555551");
    const racialSourceId = asUuid("55555555-5555-4555-8555-555555555552");
    const racialCharacter = character({
      raceRef: ref("fairy"),
      selectedSupplementIds: [FAIRY_SUPPLEMENT_ID],
      castingSources: [{
        id: racialSourceId,
        grantingRef: ref("fairy.magic-faerie-fire"),
        sourceKind: "race",
        ability: "wis",
        knownSpellRefs: [spellRef],
        preparedSpellRefs: [],
        spellbookRefs: [],
        resourcePoolIds: [poolId],
      }],
      spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }],
      concentration: {
        effectId: asUuid("55555555-5555-4555-8555-555555555554"),
        sourceRef: ref("old-concentration"),
        duration: { kind: "instant" },
        pendingSaveIds: [],
      },
    });
    const racial = deriveActionCapabilities(racialCharacter, derivedFor(racialCharacter), composed.value, fakeIdGenerator()).capabilities
      .find((entry) => entry.id === `spell:${racialSourceId}:fogo-das-fadas:slot`);
    expect(racial).toMatchObject({ status: "available", assistedRacialGrant: true, spellRequiresEndingConcentration: true, preview: { status: "rejected" } });
    expect(racial?.effectSummary?.join(" ")).toContain("manualmente");
    expect(racial?.spellTargeting?.restrictions).toContain("Alvo e efeito aguardam modelagem estruturada; a entrada permanece bloqueada.");

    const classSourceId = asUuid("55555555-5555-4555-8555-555555555553");
    const classCharacter = character({
      castingSources: [{
        id: classSourceId,
        grantingRef: ref("wizard"),
        sourceKind: "class",
        ability: "int",
        knownSpellRefs: [spellRef],
        preparedSpellRefs: [],
        spellbookRefs: [],
        resourcePoolIds: [poolId],
      }],
      spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }],
    });
    const classCapability = deriveActionCapabilities(classCharacter, derivedFor(classCharacter), composed.value, fakeIdGenerator()).capabilities
      .find((entry) => entry.id === `spell:${classSourceId}:fogo-das-fadas`);
    expect(classCapability).toMatchObject({ status: "blocked", blockedReason: expect.stringContaining("PEND-SPELL-STRUCTURE") });
    expect(classCapability?.assistedRacialGrant).toBeUndefined();
    expect(classCapability?.effectSummary).toBeUndefined();
  });

  it("expõe a alternativa de 1 minuto somente para a magia concedida pela fonte de característica", () => {
    const poolId = asUuid("99999999-9999-4999-8999-999999999991");
    const sourceId = asUuid("11111111-1111-4111-8111-111111111991");
    const option = { kind: "drop-concentration" as const, durationMinutes: 1 };
    const char = character({
      classes: [{ classId: asEntityId("ranger"), level: 11, choices: [] }],
      castingSources: [{
        id: sourceId,
        grantingRef: ref("fey-wanderer-fey-reinforcements"),
        sourceKind: "feature",
        spellListClassId: asEntityId("ranger"),
        ability: "wis",
        knownSpellRefs: [ref("fey-summon")],
        preparedSpellRefs: [],
        spellbookRefs: [],
        resourcePoolIds: [poolId],
        usesSpellSlots: true,
        featureSpellOverrides: [{ spellRef: ref("fey-summon"), ignoreMaterialComponents: true, concentrationAlternativeMinutes: 1 }],
      }],
      spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }],
      concentration: { effectId: asUuid("22222222-2222-4222-8222-222222222292"), sourceRef: ref("old-concentration"), duration: { kind: "instant" }, pendingSaveIds: [] },
    });
    const { capabilities, executions } = deriveActionCapabilities(char, derivedFor(char), pack(), fakeIdGenerator());
    const capability = capabilities.find((entry) => entry.id === `spell:${sourceId}:fey-summon:slot`);
    expect(capability?.featureCastingOptions).toEqual([{ ...option, label: expect.stringContaining("assistida") }]);
    expect(capability?.spellRequiresEndingConcentration).toBe(true);
    const execution = executions.get(capability!.id)!;
    expect(execution.featureCastingOptions).toEqual([option]);
    if (execution.command.kind !== "cast-spell") throw new Error("esperava comando de conjuração");
    const requestedCommand = { ...execution.command, payload: { ...execution.command.payload, targetContext: { targetIds: [char.id] }, featureCastingOption: option } };
    const result = execution.resolve({ character: char, rolls: new Map(), command: requestedCommand });
    expect(result.status, JSON.stringify(result)).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.concentration).toEqual(char.concentration);
      expect(result.explanations.map((item) => item.value).join(" ")).toContain("sem concentração por 1 minuto");
      expect(result.nextState.spellSlots[0].spent).toBe(1);
    }

    const classSource = { ...char.castingSources[0], sourceKind: "class" as const };
    const nonFeature = { ...char, castingSources: [classSource] };
    const nonFeatureCapability = deriveActionCapabilities(nonFeature, derivedFor(nonFeature), pack(), fakeIdGenerator()).capabilities.find((entry) => entry.id === `spell:${sourceId}:fey-summon:slot`);
    expect(nonFeatureCapability?.featureCastingOptions).toBeUndefined();
    expect(nonFeatureCapability?.spellRequiresEndingConcentration).toBe(true);
  });

  it("bloqueia a revisão de cura quando não resta espaço compatível", () => {
    const poolId = asUuid("99999999-9999-4999-8999-999999999999");
    const char = character({
      classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
      castingSources: [{ id: asUuid("11111111-1111-4111-8111-000000000002"), grantingRef: ref("bard"), ability: "cha", knownSpellRefs: [ref("cure-wounds")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId] }],
      spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 1 }],
    });
    const { capabilities } = deriveActionCapabilities(char, derivedFor(char), pack(), fakeIdGenerator());
    const capability = capabilities.find((entry) => entry.id.endsWith(":cure-wounds:slot"));
    expect(capability?.status).toBe("blocked");
    expect(capability?.blockedReason).toContain("Nenhum espaço");
  });

  it("expõe capacidade de concentração somente quando ativa, com o comando end-concentration", () => {
    const char = character({
      concentration: { effectId: asUuid("22222222-2222-4222-8222-000000000001"), sourceRef: ref("magic-missile"), duration: { kind: "instant" }, pendingSaveIds: [] },
    });
    const idGenerator = fakeIdGenerator();
    const { capabilities, executions } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);
    const concentration = capabilities.find((c) => c.kind === "concentration");
    expect(concentration?.status).toBe("available");
    expect(concentration?.preview).toMatchObject({ status: "success", effects: [{ kind: "concentration-ended" }] });
    const execution = executions.get(concentration!.id);
    expect(execution?.command.kind).toBe("end-concentration");
    expect(char.concentration).toBeDefined(); // prévia real e pura: a ficha só muda no commit.
    const endResult = execution!.resolve({ character: char, rolls: new Map() });
    expect(endResult.status).toBe("success");
    expect(char.concentration).toBeDefined();
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

  it("recurso sem capacidade derivada fica unsupported com motivo distinto, sem execução e sem gastar", () => {
    const char = character({
      resources: [
        ...character().resources,
        { id: asUuid("11111111-1111-4111-8111-000000000005"), definitionRef: ref("channel-divinity"), ownerInstanceId: asUuid("11111111-1111-4111-8111-000000000004"), spent: 0 },
      ],
    });
    const idGenerator = fakeIdGenerator();
    const { capabilities, executions } = deriveActionCapabilities(char, derivedFor(char), pack(), idGenerator);

    const variableResource = capabilities.find((c) => c.id === `resource:${char.resources[1].id}`);
    expect(variableResource?.status).toBe("unsupported");
    expect(variableResource?.description).toContain("Capacidade do recurso não foi derivada");
    expect(executions.has(variableResource!.id)).toBe(false);
    // Nada foi gasto: nenhum estado é aplicado para uma capacidade unsupported.
    expect(char.resources[1].spent).toBe(0);
  });

  it("recurso com custo variável fica unsupported mesmo com capacidade derivada", () => {
    const char = character({
      resources: [
        ...character().resources,
        { id: asUuid("11111111-1111-4111-8111-000000000005"), definitionRef: ref("channel-divinity"), ownerInstanceId: asUuid("11111111-1111-4111-8111-000000000004"), spent: 0 },
      ],
    });
    const derived = { ...derivedFor(char), resourceCapacities: [...derivedFor(char).resourceCapacities, { definitionRef: ref("channel-divinity"), capacity: exp(1) }] };
    const { capabilities, executions } = deriveActionCapabilities(char, derived, pack(), fakeIdGenerator());
    const variableResource = capabilities.find((c) => c.id === `resource:${char.resources[1].id}`);
    expect(variableResource?.status).toBe("unsupported");
    expect(variableResource?.description).toContain("Custo de uso variável");
    expect(executions.has(variableResource!.id)).toBe(false);
    expect(char.resources[1].spent).toBe(0);
  });
});

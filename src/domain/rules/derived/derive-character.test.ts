import { describe, expect, it } from "vitest";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asCentimeters, type SourceRef } from "@domain/contracts/primitives";
import { asEntityId, asUuid, type DefinitionRef } from "@domain/contracts/ids";
import { type Character } from "@domain/contracts/character";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type RaceDefinition } from "@domain/contracts/definitions/race";
import { type ClassDefinition } from "@domain/contracts/definitions/class";
import { type BackgroundDefinition } from "@domain/contracts/definitions/background";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { deriveCharacter } from "./derive-character";
import { abilityModifier, applyNumericModifiers, proficiencyBonusForLevel } from "../core/modifiers";
import { races as publishedRaces } from "@data/races/races";
import { findCondition } from "@data/conditions";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";

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
  readonly race?: RaceDefinition;
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
    manifest, races: new Map([[(overrides.race ?? race).id, overrides.race ?? race]]), subraces: new Map(), classes: new Map(classes.map((entry) => [entry.id, entry])), subclasses: new Map(),
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

  it("deriva ataque de Bardo com DEX 15 e proficiência publicada em rapieira", () => {
    const loaded = loadPhbPtBrLocal2017();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const subject = character({
      raceRef: ref("human"),
      classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 13 } },
      progressionHistory: [{ ...minimalCharacter.progressionHistory[0], classId: asEntityId("bard"), hitPointGain: { kind: "first-level-max", amount: 8 } }],
      hitDiceSpent: [{ classId: asEntityId("bard"), hitDie: 8, spent: 0 }],
      inventory: [{ id: "66666666-6666-4666-8666-666666666666" as never, equipmentRef: ref("rapier"), quantity: 1, equippedState: "equipped", notes: "" }],
    });
    const result = deriveCharacter(subject, loaded.value, context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.abilityScores.find((entry) => entry.ability === "dex")?.score.value).toBe(15); // Humano +1
      expect(result.value.proficiencyBonus.value).toBe(2);
      expect(result.value.attacks[0]?.attackModifier.value).toBe(4);
      expect(result.value.attacks[0]?.damageParts[0]?.modifierBonus.value).toBe(2);
    }
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

  it("combina CA da forma com equipamento vestido sem duplicar Destreza, escudo ou bônus geral", () => {
    const beast = {
      id: asEntityId("test-beast"), name: "Besta", creatureType: "beast" as const, size: "medium" as const,
      armorClass: 13, hitPoints: { average: 8 }, speeds: { walkCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 0, denominator: 4 }, sourceRefs: [source],
    };
    const shield = { id: asEntityId("worn-shield"), name: "Escudo", tags: [], sourceRefs: [source], category: "armor" as const, weightGrams: 0 as never, valueCp: 0 as never, stackable: false, properties: [], armor: { armorCategory: "shield" as const, baseArmorClass: 2, stealthDisadvantage: false } };
    const bodyArmor = { ...shield, id: asEntityId("worn-body-armor"), name: "Armadura", armor: { armorCategory: "medium" as const, baseArmorClass: 17, dexModifierCap: 2, stealthDisadvantage: false } };
    const bonus: FeatureDefinition = { id: asEntityId("test-ac-bonus"), name: "Defesa", tags: [], sourceRefs: [source], activation: { kind: "passive" }, eligibility: [], resourceCosts: [], choices: [], automationStatus: "automated", pendingDecisionIds: [], effects: [
      { kind: "modifier", modifier: { id: "test.ac.plus-one", sourceRef: source, target: { kind: "armor-class" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } } },
    ] };
    const transformation = (equipmentDisposition: "worn" | "dropped" | "merged-with-form", formArmorClass = 13): NonNullable<Character["transformation"]> => ({
      id: "33333333-3333-4333-8333-333333333333" as never,
      formRef: ref(String(beast.id)), originalSnapshotRef: "33333333-3333-4333-8333-333333333333" as never,
      originalMaximumHitPoints: 10, formSnapshot: { ...beast, armorClass: formArmorClass }, formMaximumHitPoints: 8, formHp: { current: 8, temp: 0 },
      duration: { kind: "hours", value: 1 }, equipmentDisposition, retainedFeatureIds: [],
    });
    const subject = (equipmentDisposition: "worn" | "dropped" | "merged-with-form", formArmorClass = 13, wearBodyArmor = false): Character => character({
      abilityGeneration: { ...minimalCharacter.abilityGeneration, baseScores: { ...minimalCharacter.abilityGeneration.baseScores, dex: 14 } },
      inventory: [
        { id: "44444444-4444-4444-8444-444444444444" as never, equipmentRef: ref(String(shield.id)), quantity: 1, equippedState: "equipped", notes: "" },
        ...(wearBodyArmor ? [{ id: "55555555-5555-4555-8555-555555555555" as never, equipmentRef: ref(String(bodyArmor.id)), quantity: 1, equippedState: "equipped" as const, notes: "" }] : []),
      ],
      transformation: transformation(equipmentDisposition, formArmorClass),
    });
    const rulePack = pack({ equipment: [shield, bodyArmor], features: [bonus] });

    const worn = deriveCharacter(subject("worn"), rulePack, context);
    expect(worn.ok).toBe(true);
    if (worn.ok) expect(worn.value.armorClass.value).toBe(16); // max(CA 13 + escudo 2, 10 + DES 2 + escudo 2) +1

    const naturalHigh = deriveCharacter(subject("worn", 18), rulePack, context);
    expect(naturalHigh.ok).toBe(true);
    if (naturalHigh.ok) expect(naturalHigh.value.armorClass.value).toBe(21); // CA natural 18 + escudo 2 +1

    const superiorArmor = deriveCharacter(subject("worn", 13, true), rulePack, context);
    expect(superiorArmor.ok).toBe(true);
    if (superiorArmor.ok) expect(superiorArmor.value.armorClass.value).toBe(22); // max(CA 15, armadura 17 + DES 2 + escudo 2) +1

    for (const disposition of ["dropped", "merged-with-form"] as const) {
      const inactive = deriveCharacter(subject(disposition), rulePack, context);
      expect(inactive.ok).toBe(true);
      if (inactive.ok) expect(inactive.value.armorClass.value).toBe(14); // CA 13 + bônus geral +1; armadura/escudo inativos
    }
  });

  it("aplica condições à velocidade da forma e suprime voo e natação", () => {
    const grappled = findCondition("grappled");
    const restrained = findCondition("restrained");
    expect(grappled).toBeDefined();
    expect(restrained).toBeDefined();
    if (!grappled || !restrained) return;
    const beast = {
      id: asEntityId("speed-test-beast"), name: "Besta veloz", creatureType: "beast" as const, size: "medium" as const,
      armorClass: 13, hitPoints: { average: 8 }, speeds: { walkCm: 600 as never, flyCm: 1200 as never, swimCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 0, denominator: 4 }, sourceRefs: [source],
    };
    const transformation: NonNullable<Character["transformation"]> = {
      id: "77777777-7777-4777-8777-777777777777" as never,
      formRef: ref(String(beast.id)), originalSnapshotRef: minimalCharacter.id,
      originalMaximumHitPoints: 10, formSnapshot: beast, formMaximumHitPoints: 8, formHp: { current: 8, temp: 0 },
      duration: { kind: "hours", value: 1 }, equipmentDisposition: "stored", retainedFeatureIds: [],
    };
    const viewed = character({
      transformation,
      beastSightings: [{ beastRef: ref(String(beast.id)) }],
    });
    const rulePack = pack({ conditions: [grappled, restrained] });
    const normal = deriveCharacter(viewed, rulePack, context);
    expect(normal.ok).toBe(true);
    if (normal.ok) {
      expect(normal.value.speedsCm.map(({ kind, value }) => [kind, value.value])).toEqual([["walk", 600]]);
      expect(normal.value.speedsCm.some(({ kind }) => kind === "fly" || kind === "swim")).toBe(false);
    }

    for (const condition of [grappled, restrained]) {
      const affected = deriveCharacter(character({
        ...viewed,
        conditions: [{
          id: "88888888-8888-4888-8888-888888888888" as never,
          definitionRef: ref(String(condition.id)),
          origin: { kind: "environment", description: "teste de condição na forma" },
        }],
      }), rulePack, context);
      expect(affected.ok).toBe(true);
      if (affected.ok) expect(affected.value.speedsCm.find(({ kind }) => kind === "walk")?.value.value).toBe(0);
    }

    const copiedClimb: FeatureDefinition = {
      id: asEntityId("test-climb-copy"), name: "Deslocamento Peregrino", tags: [], sourceRefs: [source],
      activation: { kind: "passive" }, eligibility: [], resourceCosts: [], choices: [], automationStatus: "automated", pendingDecisionIds: [],
      effects: [{ kind: "modifier", modifier: {
        id: "test.climb.copy", sourceRef: source, target: { kind: "speed-copy", speedKind: "climb", from: "walk" },
        operator: "annotate", value: { kind: "flag" }, predicate: { kind: "always" },
      } }],
    };
    const viewedWithPublishedClimb = {
      ...viewed,
      transformation: { ...transformation, formSnapshot: { ...beast, speeds: { ...beast.speeds, climbCm: 900 as never } } },
    };
    const copied = deriveCharacter(viewedWithPublishedClimb, pack({ features: [copiedClimb] }), context);
    expect(copied.ok).toBe(true);
    if (copied.ok) {
      expect(copied.value.speedsCm.find(({ kind }) => kind === "walk")?.value.value).toBe(600);
      expect(copied.value.speedsCm.find(({ kind }) => kind === "climb")?.value.value).toBe(900); // deslocamento publicado prevalece sobre caminhada copiada de 600
    }
  });

  it("automatiza só ataques publicados e exclui danos ou ações de resolução manual", () => {
    const form = {
      id: asEntityId("attack-filter-form"), name: "Besta Condicional", creatureType: "beast" as const, size: "medium" as const,
      armorClass: 12, hitPoints: { average: 8 }, speeds: { walkCm: 600 as never },
      abilityScores: { str: 12, dex: 14, con: 12, int: 3, wis: 10, cha: 5 },
      challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [source],
      actions: [
        { id: "bite", name: "Mordida", description: "Ataque publicado", attackBonus: 4, damage: [
          { damageType: "piercing" as const, formula: { quantity: 1, faces: 6 as never }, flatBonus: 2 },
          { damageType: "poison" as const, formula: { quantity: 2, faces: 6 as never }, requiresManualResolution: true as const, note: "somente após falha em salvaguarda" },
        ] },
        { id: "swallow", name: "Engolir", description: "Ataque condicional e dano por turno", attackBonus: 4, requiresManualResolution: true as const, damage: [
          { damageType: "acid" as const, formula: { quantity: 2, faces: 4 as never }, requiresManualResolution: true as const, note: "no começo de cada turno" },
        ] },
        { id: "missing-bonus", name: "Ação sem jogada publicada", description: "Sem bônus de ataque", damage: [
          { damageType: "bludgeoning" as const, formula: { quantity: 1, faces: 4 as never } },
        ] },
        { id: "partial-damage", name: "Dano parcialmente estruturado", description: "Componente plano sem fórmula", attackBonus: 2, damage: [
          { damageType: "fire" as const, flatBonus: 1 },
          { damageType: "acid" as const, formula: { quantity: 1, faces: 4 as never } },
        ] },
      ],
    };
    const transformation: NonNullable<Character["transformation"]> = {
      id: asUuid("99999999-9999-4999-8999-999999999991"), formRef: ref(String(form.id),), originalSnapshotRef: minimalCharacter.id,
      originalMaximumHitPoints: 10, formSnapshot: form, formMaximumHitPoints: 8, formHp: { current: 8, temp: 0 },
      duration: { kind: "hours", value: 1 }, equipmentDisposition: "stored", retainedFeatureIds: [],
    };
    const result = deriveCharacter(character({ transformation }), pack(), context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attacks).toHaveLength(1);
    expect(result.value.attacks[0]?.attackModifier.value).toBe(4);
    expect(result.value.attacks[0]?.damageParts.map(({ damageType }) => damageType)).toEqual(["piercing"]);

    const loaded = loadPhbPtBrLocal2017();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const wolf = loaded.value.creatures?.get(asEntityId("appendix-a-lobo"));
    expect(wolf?.actions?.[0]?.attackBonus).toBe(4);
    const wolfResult = deriveCharacter(character({ transformation: { ...transformation, formRef: ref("appendix-a-lobo"), formSnapshot: wolf! } }), loaded.value, context);
    expect(wolfResult.ok).toBe(true);
    if (wolfResult.ok) {
      expect(wolfResult.value.attacks).toHaveLength(1);
      expect(wolfResult.value.attacks[0]?.label).toBe(`Mordida — ${wolf!.name}`);
      expect(wolfResult.value.attacks[0]?.attackModifier.value).toBe(4);
      expect(wolfResult.value.attacks[0]?.damageParts.map(({ damageType }) => damageType)).toEqual(["piercing"]);
    }
  });

  it("preserva o ataque imediato de bestas reais e deixa riders condicionais fora do dano automático", () => {
    const loaded = loadPhbPtBrLocal2017();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || !loaded.value.creatures) return;
    const deriveForm = (id: string) => {
      const form = loaded.value.creatures!.get(asEntityId(id));
      expect(form).toBeDefined();
      if (!form) return [];
      const transformation: NonNullable<Character["transformation"]> = {
        id: asUuid("99999999-9999-4999-8999-999999999992"), formRef: ref(id), originalSnapshotRef: minimalCharacter.id,
        originalMaximumHitPoints: 10, formSnapshot: form, formMaximumHitPoints: form.hitPoints.average, formHp: { current: form.hitPoints.average, temp: 0 },
        duration: { kind: "hours", value: 1 }, equipmentDisposition: "stored", retainedFeatureIds: [],
      };
      const result = deriveCharacter(character({ transformation }), loaded.value, context);
      expect(result.ok).toBe(true);
      return result.ok ? result.value.attacks : [];
    };

    const giantFrog = deriveForm("appendix-a-ra-gigante");
    expect(giantFrog.map(({ label }) => label)).toEqual(["Mordida — RÃ GIGANTE"]);
    expect(giantFrog[0]?.damageParts.map(({ damageType }) => damageType)).toEqual(["piercing"]);

    const giantToad = deriveForm("appendix-a-sapo-gigante");
    expect(giantToad.map(({ label }) => label)).toEqual(["Mordida — SAPO GIGANTE"]);
    expect(giantToad[0]?.damageParts.map(({ damageType }) => damageType)).toEqual(["piercing", "poison"]);

    const giantSpider = deriveForm("appendix-a-aranha-gigante");
    expect(giantSpider.map(({ label }) => label)).toEqual(["Mordida — ARANHA GIGANTE"]);
    expect(giantSpider[0]?.damageParts.map(({ damageType }) => damageType)).toEqual(["piercing"]);

    const poisonousSnake = deriveForm("appendix-a-serpente-venenosa-gigante");
    expect(poisonousSnake.map(({ label }) => label)).toEqual(["Mordida — SERPENTE VENENOSA GIGANTE"]);
    expect(poisonousSnake[0]?.damageParts.map(({ damageType }) => damageType)).toEqual(["piercing"]);

    const constrictor = deriveForm("appendix-a-cobra-constritora");
    expect(constrictor.map(({ label }) => label)).toEqual([
      "Mordida — COBRA CONSTRITORA",
      "Constrição — COBRA CONSTRITORA",
    ]);
    expect(constrictor.map(({ damageParts }) => damageParts.map(({ damageType }) => damageType))).toEqual([
      ["piercing"],
      ["bludgeoning"],
    ]);
  });

  it("ignora Destreza positiva e negativa em armadura pesada", () => {
    const armor = { id: asEntityId("plate-armor"), name: "Placas", tags: [], sourceRefs: [source], category: "armor" as const, weightGrams: 0 as never, valueCp: 0 as never, stackable: false, properties: [], armor: { armorCategory: "heavy" as const, baseArmorClass: 18, stealthDisadvantage: true } };
    for (const dex of [8, 18]) {
      const result = deriveCharacter(character({ abilityGeneration: { ...minimalCharacter.abilityGeneration, baseScores: { ...minimalCharacter.abilityGeneration.baseScores, dex } }, inventory: [{ id: "44444444-4444-4444-8444-444444444444" as never, equipmentRef: ref("plate-armor"), quantity: 1, equippedState: "equipped", notes: "" }] }), pack({ equipment: [armor] }), context);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.armorClass.value).toBe(18);
    }
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

  it("usa a ChoiceDefinition ativa de Hábil sem renomear seu ID e exige proficiência existente", () => {
    const loaded = loadPhbPtBrLocal2017();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const tasha = asEntityId("tasha-ranger-options");
    const rangerRef = ref("ranger");
    const cannyRef = ref("ranger.canny");
    const selection = {
      supplementId: tasha,
      optionId: asEntityId("ranger.optional-canny"),
      selectedFeatureRefs: [cannyRef, ref("ranger.roving"), ref("ranger.tireless")],
    };
    const makeCharacter = (expertiseSkill: string): Character => character({
      classes: [{ classId: asEntityId("ranger"), level: 1, choices: [] }],
      progressionHistory: [{ ...minimalCharacter.progressionHistory[0]!, classId: asEntityId("ranger"), hitPointGain: { kind: "first-level-max", amount: 10 } }],
      hitDiceSpent: [{ classId: asEntityId("ranger"), hitDie: 10, spent: 0 }],
      selectedSupplementIds: [tasha],
      optionalRuleSelections: [selection],
      choices: [
        { choiceId: "ranger.skills", selectedIds: [ref("survival")], grantedAtLevel: 1, grantingRef: rangerRef },
        { choiceId: "ranger.canny.skill", selectedIds: [ref(expertiseSkill)], grantedAtLevel: 1, grantingRef: cannyRef },
      ],
    });

    const valid = deriveCharacter(makeCharacter("survival"), loaded.value, context);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      const survival = valid.value.skills.find((entry) => entry.skill === "survival");
      expect(survival?.proficient).toBe(true);
      expect(survival?.expertise).toBe(true);
      expect(survival?.modifier.value).toBe(5); // SAB +1, PB 2 dobrado
    }

    const invalid = deriveCharacter(makeCharacter("persuasion"), loaded.value, context);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("validation-error");
      expect(invalid.error.message).toContain("proficiência já registrada");
    }
  });

  it("aplica Glamour Sobrenatural a testes de Carisma e perícias, mas não a salvaguardas ou ataques", () => {
    const loaded = loadPhbPtBrLocal2017();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const supplementId = asEntityId("tasha-ranger-options");
    const glamourRef = ref("fey-wanderer.otherworldly-glamour");
    const baseScores = { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 14 };
    const makeCharacter = (wisdom: number, withGlamour = true): Character => character({
      raceRef: ref("human"),
      classes: [{ classId: asEntityId("ranger"), level: 3, ...(withGlamour ? { subclassId: asEntityId("fey-wanderer") } : {}), choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { ...baseScores, wis: wisdom } },
      progressionHistory: [1, 2, 3].map((level) => ({
        ...minimalCharacter.progressionHistory[0]!,
        id: asUuid(`77777777-7777-4777-8777-${String(level).padStart(12, "0")}`),
        classId: asEntityId("ranger"),
        level,
        hitPointGain: level === 1 ? { kind: "first-level-max" as const, amount: 10 } : { kind: "fixed-average" as const, amount: 6 },
      })),
      hitDiceSpent: [{ classId: asEntityId("ranger"), hitDie: 10, spent: 0 }],
      selectedSupplementIds: [supplementId],
      inventory: [{ id: asUuid("88888888-8888-4888-8888-888888888888"), equipmentRef: ref("longbow"), quantity: 1, equippedState: "equipped", notes: "" }],
      choices: withGlamour ? [{ choiceId: "fey-wanderer.otherworldly-glamour.skill", selectedIds: [ref("performance")], grantedAtLevel: 3, grantingRef: glamourRef }] : [],
    });

    for (const [wisdom, expectedBonus, expectedPerformance] of [[16, 3, 7], [8, 1, 5]] as const) {
      const subject = makeCharacter(wisdom);
      const result = deriveCharacter(subject, loaded.value, context);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const charisma = result.value.abilityScores.find((entry) => entry.ability === "cha")!;
      const checkBonus = result.value.abilityCheckBonuses?.find((entry) => entry.ability === "cha")?.bonus;
      expect(checkBonus?.value).toBe(expectedBonus);
      expect(charisma.modifier.value + (checkBonus?.value ?? 0)).toBe(expectedBonus + 2); // teste simples de CAR
      expect(result.value.skills.find((entry) => entry.skill === "performance")?.modifier.value).toBe(expectedPerformance);
      expect(result.value.savingThrows.find((entry) => entry.ability === "cha")?.modifier.value).toBe(2);

      const withoutGlamour = deriveCharacter(makeCharacter(wisdom, false), loaded.value, context);
      expect(withoutGlamour.ok).toBe(true);
      if (withoutGlamour.ok) {
        expect(result.value.attacks.map((attack) => attack.attackModifier.value)).toEqual(withoutGlamour.value.attacks.map((attack) => attack.attackModifier.value));
      }
    }
  });

  it("preserva anotações customizadas sem aplicá-las como bônus numérico", () => {
    const custom = {
      id: "dwarf.dwarven-resilience.save",
      sourceRef: source,
      target: { kind: "custom" as const, description: "Vantagem contra veneno" },
      operator: "grant-advantage" as const,
      value: { kind: "flag" as const },
      predicate: { kind: "always" as const },
    };
    const result = deriveCharacter(character(), pack({}), context);
    expect(result.ok).toBe(true);
    expect(applyNumericModifiers(10, [{ modifier: custom, scope: "trait" }], []).ok).toBe(false);
  });

  it("permite derivar um anão com efeitos raciais contextuais", () => {
    const dwarf = publishedRaces.find((entry) => entry.id === "dwarf");
    expect(dwarf).toBeDefined();
    if (!dwarf) return;
    const result = deriveCharacter(character({ raceRef: ref("dwarf") }), pack({ race: dwarf }), context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.abilityScores.find((entry) => entry.ability === "con")?.score.value).toBe(16);
    }
  });

  it("aplica somente os efeitos de exaustão até o nível atual, arredondando o máximo de PV para baixo", () => {
    const exhaustion = findCondition("exhaustion");
    expect(exhaustion).toBeDefined();
    if (!exhaustion) return;
    const exhaustionRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: exhaustion.id };
    const withLevel = (severity: number) => character({ conditions: [{ id: "55555555-5555-4555-8555-555555555555" as never, definitionRef: exhaustionRef, origin: { kind: "environment", description: "teste" }, severity }] });
    const derive = (subject: Character) => {
      const result = deriveCharacter(subject, pack({ conditions: [exhaustion] }), context);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("derivação falhou");
      return { hp: result.value.hitPointsMax.value, walk: result.value.speedsCm.find((entry) => entry.kind === "walk")?.value.value };
    };
    const base = derive(character());
    expect(derive(withLevel(0))).toEqual(base);
    expect(derive(withLevel(1))).toEqual(base);
    expect(derive(withLevel(2))).toEqual({ hp: base.hp, walk: (base.walk ?? 0) / 2 });
    expect(derive(withLevel(4))).toEqual({ hp: Math.floor(base.hp / 2), walk: (base.walk ?? 0) / 2 });
    expect(derive(withLevel(5)).walk).toBe(0);
  });
});

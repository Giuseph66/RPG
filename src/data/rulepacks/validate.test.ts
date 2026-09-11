import { describe, expect, it } from "vitest";

import { asCentimeters, asCopperPieces, asGrams } from "@domain/contracts/primitives";
import { asEntityId, asPackVersion, asRulesetId, type EntityId } from "@domain/contracts/ids";
import { isErr, isOk } from "@domain/contracts/errors";
import { type RulePackManifest } from "@domain/contracts/definitions/rulepack";
import { type RaceDefinition, type SubraceDefinition } from "@domain/contracts/definitions/race";
import { type ClassDefinition, type SubclassDefinition } from "@domain/contracts/definitions/class";
import { type BackgroundDefinition } from "@domain/contracts/definitions/background";
import { type FeatDefinition } from "@domain/contracts/definitions/feat";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { type ProgressionDefinition } from "@domain/contracts/definitions/progression";
import { type CharacterTemplate } from "@domain/contracts/definitions/character-template";
import { type SourceRef } from "@domain/contracts/primitives";

import { validateRulePack, type RulePackInput } from "./validate";
import { type RulePackCatalogs } from "./manifest";
import { computeChecksums } from "./checksum";

const PACK_ID = asRulesetId("phb-ptbr-local-2017");
const OTHER_PACK_ID = asRulesetId("some-other-pack");

function ref(entityId: string) {
  return { rulesetId: PACK_ID, entityId: asEntityId(entityId) };
}

function sourceRef(sourceId = PACK_ID): SourceRef {
  return { sourceId, chapter: "Capítulo Teste" };
}

function buildManifest(overrides: Partial<RulePackManifest> = {}): RulePackManifest {
  return {
    id: PACK_ID,
    name: "Pack de teste",
    edition: "5e, compilação fornecida, base 2014 com divergências registradas",
    version: asPackVersion("1.0.0"),
    language: "pt-BR",
    sourceRefs: [sourceRef()],
    contentPolicy: "embedded",
    entityCounts: {
      race: 0,
      subrace: 0,
      class: 0,
      subclass: 0,
      background: 0,
      feat: 0,
      feature: 0,
      resource: 0,
      condition: 0,
      equipment: 0,
      spell: 0,
      progression: 0,
      "character-template": 0,
    },
    checksums: {},
    schemaCompatibility: { minSchemaVersion: 1, maxSchemaVersion: 1 },
    ...overrides,
  };
}

function buildRace(overrides: Partial<RaceDefinition> = {}): RaceDefinition {
  return {
    id: asEntityId("test-race"),
    name: "Raça Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    abilityIncreases: [{ ability: "str", amount: 1 }],
    size: "medium",
    speedCm: asCentimeters(900),
    languages: [],
    senses: [],
    proficiencies: [],
    traits: [],
    subraceIds: [asEntityId("test-subrace")],
    choices: [],
    ...overrides,
  };
}

function buildSubrace(overrides: Partial<SubraceDefinition> = {}): SubraceDefinition {
  return {
    id: asEntityId("test-subrace"),
    name: "Sub-raça Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    raceId: asEntityId("test-race"),
    additionalModifiers: [],
    traits: [],
    choices: [],
    ...overrides,
  };
}

function buildClass(overrides: Partial<ClassDefinition> = {}): ClassDefinition {
  return {
    id: asEntityId("test-class"),
    name: "Classe Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    hitDie: 8,
    primaryAbilities: ["str"],
    initialProficiencies: [],
    savingThrowProficiencies: ["str", "con"],
    skillChoices: {
      id: "class-skill-choice",
      kind: "skill-proficiency",
      count: { min: 2, max: 2 },
      optionSet: { kind: "selector", selector: { kind: "any-skill" } },
      prerequisites: [],
      unique: true,
      sourceRefs: [sourceRef()],
    },
    initialEquipmentChoices: [],
    progression: [{ level: 1, featureRefs: [], resourceChanges: [], choicesGranted: [] }],
    subclassSelectionLevel: 3,
    subclassIds: [asEntityId("test-subclass")],
    multiclassPrerequisites: [],
    multiclassProficiencies: [],
    ...overrides,
  };
}

function buildSubclass(overrides: Partial<SubclassDefinition> = {}): SubclassDefinition {
  return {
    id: asEntityId("test-subclass"),
    name: "Subclasse Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    classId: asEntityId("test-class"),
    selectionLevel: 3,
    featureGrants: [],
    spellGrants: [],
    resourceChanges: [],
    choices: [],
    ...overrides,
  };
}

function buildBackground(overrides: Partial<BackgroundDefinition> = {}): BackgroundDefinition {
  return {
    id: asEntityId("test-background"),
    name: "Antecedente Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    skillProficiencies: ["insight"],
    toolChoices: [],
    languageChoices: [],
    equipment: [{ equipmentRef: ref("test-equipment"), quantity: 1 }],
    feature: { name: "Feature de Antecedente", description: "Descrição de teste." },
    variants: [],
    ...overrides,
  };
}

function buildFeat(overrides: Partial<FeatDefinition> = {}): FeatDefinition {
  return {
    id: asEntityId("test-feat"),
    name: "Talento Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    prerequisites: [],
    grants: [],
    choices: [],
    repeatable: false,
    optionalRule: true,
    ...overrides,
  };
}

function buildFeature(overrides: Partial<FeatureDefinition> = {}): FeatureDefinition {
  return {
    id: asEntityId("test-feature"),
    name: "Feature Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    activation: { kind: "passive" },
    eligibility: [],
    effects: [],
    resourceCosts: [{ resourceRef: ref("test-resource"), amount: 1 }],
    choices: [],
    automationStatus: "automated",
    pendingDecisionIds: [],
    ...overrides,
  };
}

function buildResource(overrides: Partial<ResourceDefinition> = {}): ResourceDefinition {
  return {
    id: asEntityId("test-resource"),
    name: "Recurso Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    ownerRef: ref("test-class"),
    unit: "uses",
    capacityRule: { kind: "fixed", amount: 1 },
    spendRules: [{ kind: "per-use", amount: 1 }],
    recoveryTriggers: [{ kind: "long-rest" }],
    recoveryAmountRule: { kind: "full" },
    ...overrides,
  };
}

function buildCondition(overrides: Partial<ConditionDefinition> = {}): ConditionDefinition {
  return {
    id: asEntityId("test-condition"),
    name: "Condição Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    mechanicalEffects: [],
    stackingPolicy: "no-stack",
    removalTriggers: [],
    ...overrides,
  };
}

function buildEquipment(overrides: Partial<EquipmentDefinition> = {}): EquipmentDefinition {
  return {
    id: asEntityId("test-equipment"),
    name: "Equipamento Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    category: "adventuring-gear",
    weightGrams: asGrams(500),
    valueCp: asCopperPieces(100),
    stackable: true,
    properties: [],
    ...overrides,
  };
}

function buildSpell(overrides: Partial<SpellDefinition> = {}): SpellDefinition {
  return {
    id: asEntityId("test-spell"),
    name: "Magia Teste",
    tags: [],
    sourceRefs: [sourceRef()],
    level: 1,
    school: "evocation",
    castingTime: { kind: "action" },
    range: { kind: "touch" },
    components: { verbal: true, somatic: true },
    duration: { kind: "instantaneous", endTriggers: [] },
    concentration: false,
    ritual: false,
    classes: [asEntityId("test-class")],
    targetType: { type: "creature", count: 1, restrictions: [], visibilityRequired: false },
    attackType: "none",
    damage: [],
    healing: [],
    higherLevels: { kind: "none" },
    effects: [],
    automationStatus: "automated",
    pendingDecisionIds: [],
    ...overrides,
  };
}

function buildProgression(overrides: Partial<ProgressionDefinition> = {}): ProgressionDefinition {
  return {
    id: asEntityId("test-progression"),
    name: "Progressão Teste",
    tags: ["placeholder"],
    sourceRefs: [sourceRef()],
    table: [{ totalLevel: 1, xpThreshold: 0, proficiencyBonus: 2 }],
    ...overrides,
  };
}

function buildTemplate(overrides: Partial<CharacterTemplate> = {}): CharacterTemplate {
  return {
    templateId: asEntityId("test-template"),
    name: "Template Teste",
    rulesetRef: { id: PACK_ID, version: asPackVersion("1.0.0") },
    suggestedChoices: [],
    sourceRefs: [sourceRef()],
    requiresReview: true,
    ...overrides,
  };
}

function minimalValidInput(): RulePackInput {
  const catalogs: RulePackCatalogs = {
    races: [buildRace()],
    subraces: [buildSubrace()],
    classes: [buildClass()],
    subclasses: [buildSubclass()],
    backgrounds: [buildBackground()],
    feats: [buildFeat()],
    features: [buildFeature()],
    resources: [buildResource()],
    conditions: [buildCondition()],
    equipment: [buildEquipment()],
    spells: [buildSpell()],
    progression: buildProgression(),
    characterTemplates: [buildTemplate()],
  };
  return {
    manifest: buildManifest({
      entityCounts: {
        race: catalogs.races.length,
        subrace: catalogs.subraces.length,
        class: catalogs.classes.length,
        subclass: catalogs.subclasses.length,
        background: catalogs.backgrounds.length,
        feat: catalogs.feats.length,
        feature: catalogs.features.length,
        resource: catalogs.resources.length,
        condition: catalogs.conditions.length,
        equipment: catalogs.equipment.length,
        spell: catalogs.spells.length,
        progression: 1,
        "character-template": catalogs.characterTemplates.length,
      },
      checksums: computeChecksums({
        race: catalogs.races,
        subrace: catalogs.subraces,
        class: catalogs.classes,
        subclass: catalogs.subclasses,
        background: catalogs.backgrounds,
        feat: catalogs.feats,
        feature: catalogs.features,
        resource: catalogs.resources,
        condition: catalogs.conditions,
        equipment: catalogs.equipment,
        spell: catalogs.spells,
        progression: catalogs.progression,
        "character-template": catalogs.characterTemplates,
      }),
    }),
    ...catalogs,
  };
}

describe("validateRulePack — fixture mínima válida", () => {
  it("passa e publica RulePack com Maps e checksums preenchidos", () => {
    const input = minimalValidInput();
    const result = validateRulePack(input);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.races.size).toBe(1);
      expect(result.value.manifest.entityCounts.race).toBe(1);
      expect(result.value.manifest.entityCounts.progression).toBe(1);
      expect(Object.keys(result.value.manifest.checksums).length).toBeGreaterThan(0);
      expect(result.value.manifest.entityCounts).toEqual(input.manifest.entityCounts);
      expect(result.value.manifest.checksums).toEqual(input.manifest.checksums);
      expect(result.value.races.get(asEntityId("test-race"))?.name).toBe("Raça Teste");
    }
  });

  it("rejeita contagem declarada stale sem auto-healing", () => {
    const input = minimalValidInput();
    const result = validateRulePack({
      ...input,
      manifest: {
        ...input.manifest,
        entityCounts: { ...input.manifest.entityCounts, race: 0 },
      },
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual([
        expect.objectContaining({
          code: "manifest-mismatch",
          field: "manifest.entityCounts.race",
        }),
      ]);
    }
  });

  it("rejeita checksum adulterado de forma determinística", () => {
    const input = minimalValidInput();
    const result = validateRulePack({
      ...input,
      manifest: {
        ...input.manifest,
        checksums: { ...input.manifest.checksums, race: "00000000" },
      },
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual([
        expect.objectContaining({
          code: "manifest-mismatch",
          field: "manifest.checksums.race",
        }),
      ]);
    }
  });
});

describe("validateRulePack — códigos de erro individuais", () => {
  it("ID duplicado -> duplicate-id", () => {
    const input = minimalValidInput();
    const result = validateRulePack({ ...input, races: [...input.races, buildRace({ name: "Raça Duplicada" })] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "duplicate-id")).toBe(true);
    }
  });

  it("ID não kebab-case -> invalid-id", () => {
    const input = minimalValidInput();
    const badRace = { ...buildRace(), id: "NotKebabCase" as unknown as EntityId };
    const result = validateRulePack({ ...input, races: [badRace] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "invalid-id")).toBe(true);
    }
  });

  it("sub-raça órfã -> dangling-reference", () => {
    const input = minimalValidInput();
    const orphanSubrace = buildSubrace({ raceId: asEntityId("does-not-exist") });
    const result = validateRulePack({ ...input, subraces: [orphanSubrace] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "dangling-reference")).toBe(true);
    }
  });

  it("definition sem sourceRef -> missing-source", () => {
    const input = minimalValidInput();
    const result = validateRulePack({ ...input, feats: [buildFeat({ sourceRefs: [] })] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "missing-source")).toBe(true);
    }
  });

  it("sourceId de outro pack -> foreign-source", () => {
    const input = minimalValidInput();
    const result = validateRulePack({
      ...input,
      conditions: [buildCondition({ sourceRefs: [sourceRef(OTHER_PACK_ID)] })],
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "foreign-source")).toBe(true);
    }
  });

  it("ciclo de pré-requisito (auto-referência tipo PEND-006) -> cycle", () => {
    const input = minimalValidInput();
    const selfReferencingFeature = buildFeature({
      id: asEntityId("self-cycle-feature"),
      eligibility: [{ kind: "has-feature", featureRef: ref("self-cycle-feature") }],
      resourceCosts: [],
    });
    const result = validateRulePack({ ...input, features: [selfReferencingFeature] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "cycle")).toBe(true);
    }
  });

  it("schemaCompatibility fora de CHARACTER_SCHEMA_VERSION -> incompatible-schema", () => {
    const input = minimalValidInput();
    const result = validateRulePack({
      ...input,
      manifest: buildManifest({ schemaCompatibility: { minSchemaVersion: 2, maxSchemaVersion: 3 } }),
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "incompatible-schema")).toBe(true);
    }
  });

  it("versão do manifesto fora do formato semver -> invalid-version", () => {
    const input = minimalValidInput();
    const result = validateRulePack({
      ...input,
      manifest: buildManifest({ version: "1.0" as unknown as RulePackManifest["version"] }),
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.some((error) => error.code === "invalid-version")).toBe(true);
    }
  });

  it("dois erros simultâneos são ambos reportados (não para no primeiro)", () => {
    const input = minimalValidInput();
    const badRace = { ...buildRace(), id: "NotKebabCase" as unknown as EntityId };
    const result = validateRulePack({ ...input, races: [badRace], feats: [buildFeat({ sourceRefs: [] })] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      const codes = result.error.map((error) => error.code);
      expect(codes).toContain("invalid-id");
      expect(codes).toContain("missing-source");
    }
  });

  it("pack inválido nunca retorna ok (amostragem de todos os casos acima)", () => {
    const input = minimalValidInput();
    const invalidVariants: RulePackInput[] = [
      { ...input, races: [...input.races, buildRace({ name: "Duplicada" })] },
      { ...input, feats: [buildFeat({ sourceRefs: [] })] },
      { ...input, conditions: [buildCondition({ sourceRefs: [sourceRef(OTHER_PACK_ID)] })] },
    ];
    for (const variant of invalidVariants) {
      expect(isOk(validateRulePack(variant))).toBe(false);
    }
  });
});

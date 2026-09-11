/**
 * Fixtures de FRONTEIRA de tipo para os testes deste pacote. Não são fiéis ao PDF em números
 * ou descrições completas — servem para exercitar a forma dos contratos, não o conteúdo
 * canônico do rule pack (isso é responsabilidade de um agente de conteúdo, fora de DATA-001).
 */

import {
  asEntityId,
  asIsoTimestamp,
  asPackVersion,
  asRulesetId,
  asUuid,
  type DefinitionRef,
  type RulesetRef,
} from "./ids";
import { asCentimeters, asCopperPieces, type SourceRef } from "./primitives";
import { asRevision } from "./versioning";
import { CHARACTER_SCHEMA_VERSION, type Character } from "./character";
import { type ConditionDefinition } from "./definitions/condition";
import { type ResourceDefinition } from "./definitions/resource";
import { type SpellDefinition } from "./definitions/spell";
import { type DiceRoll } from "./dice";
import { type RuleResultNeedsInput, type RuleResultRejected, type RuleResultSuccess } from "./rules";

const PACK_ID = "phb-ptbr-local-2017";

// fixture de tipo, não conteúdo canônico
export const fixtureRulesetRef: RulesetRef = {
  id: asRulesetId(PACK_ID),
  version: asPackVersion("1.0.0"),
};

function fixtureSourceRef(chapter: string, printedPage?: number, pdfPage?: number): SourceRef {
  return { sourceId: asRulesetId(PACK_ID), chapter, printedPage, pdfPage };
}

function fixtureRef(entityId: string): DefinitionRef {
  return { rulesetId: asRulesetId(PACK_ID), entityId: asEntityId(entityId) };
}

const FIXED_TIMESTAMP = asIsoTimestamp("2024-01-01T00:00:00.000Z");

// fixture de tipo, não conteúdo canônico — guerreiro humano nível 1
export const minimalCharacter: Character = {
  id: asUuid("11111111-1111-4111-8111-111111111111"),
  schemaVersion: CHARACTER_SCHEMA_VERSION,
  revision: asRevision(0),
  rulesetRef: fixtureRulesetRef,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,

  name: "Guerreiro de Teste",
  raceRef: fixtureRef("human"),
  backgroundRef: fixtureRef("soldier"),
  appearance: "",
  personalityTraits: [],
  ideals: [],
  bonds: [],
  flaws: [],
  history: "",

  classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
  abilityGeneration: {
    method: "standard-array",
    baseScores: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
  },
  choices: [],
  progressionHistory: [
    {
      id: asUuid("22222222-2222-4222-8222-222222222222"),
      classId: asEntityId("fighter"),
      level: 1,
      hitPointGain: { kind: "first-level-max", amount: 10 },
      choices: [],
      recordedAt: FIXED_TIMESTAMP,
    },
  ],

  xp: 0,
  inspiration: false,
  hp: { current: 10, temp: 0 },
  hitDiceSpent: [{ classId: asEntityId("fighter"), hitDie: 10, spent: 0 }],
  deathSaves: { successes: 0, failures: 0, stable: false },
  conditions: [],
  resources: [],
  pendingResolutions: [],

  inventory: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },

  castingSources: [],
  spellSlots: [],
  spellbookEntries: [],
  preparedSelections: [],

  manualAdjustments: [],
};

// fixture de tipo, não conteúdo canônico
export const spellCureWounds: SpellDefinition = {
  id: asEntityId("cure-wounds"),
  name: "Curar Ferimentos",
  tags: ["healing"],
  sourceRefs: [fixtureSourceRef("Capítulo 10", 207, 206)],
  level: 1,
  school: "evocation",
  castingTime: { kind: "action" },
  range: { kind: "touch" },
  components: { verbal: true, somatic: true },
  duration: { kind: "instantaneous", endTriggers: [] },
  concentration: false,
  ritual: false,
  classes: [asEntityId("cleric"), asEntityId("druid"), asEntityId("bard")],
  targetType: { type: "creature", count: 1, restrictions: [], visibilityRequired: false },
  attackType: "none",
  damage: [],
  healing: [{ expression: { quantity: 1, faces: 8 }, bonusPerCasterAbility: "wis" }],
  higherLevels: { kind: "extra-healing-dice-per-slot-level", diceIncrease: { quantity: 1, faces: 8 } },
  effects: [],
  automationStatus: "automated",
  pendingDecisionIds: [],
};

// fixture de tipo, não conteúdo canônico
export const spellFireball: SpellDefinition = {
  id: asEntityId("fireball"),
  name: "Bola de Fogo",
  tags: ["damage", "area"],
  sourceRefs: [fixtureSourceRef("Capítulo 10", 207, 206)],
  level: 3,
  school: "evocation",
  castingTime: { kind: "action" },
  range: { kind: "distance", distanceCm: asCentimeters(15000), origin: "point-chosen-in-range" },
  components: {
    verbal: true,
    somatic: true,
    material: { descriptionSummary: "uma bolinha de guano de morcego e enxofre", consumed: true },
  },
  duration: { kind: "instantaneous", endTriggers: [] },
  concentration: false,
  ritual: false,
  classes: [asEntityId("wizard"), asEntityId("sorcerer")],
  targetType: { type: "point", restrictions: [], visibilityRequired: false },
  area: { shape: "sphere", dimensionsCm: [asCentimeters(600)], originPolicy: "point-in-range" },
  savingThrow: { ability: "dex", successOutcome: "half-damage" },
  attackType: "none",
  damage: [{ expression: { quantity: 8, faces: 6 }, damageType: "fire" }],
  healing: [],
  higherLevels: {
    kind: "extra-damage-dice-per-slot-level",
    diceIncrease: { quantity: 1, faces: 6 },
    perSlotLevels: 1,
  },
  effects: [],
  automationStatus: "automated",
  pendingDecisionIds: [],
};

// fixture de tipo, não conteúdo canônico
export const spellDetectMagic: SpellDefinition = {
  id: asEntityId("detect-magic"),
  name: "Detectar Magia",
  tags: ["divination", "ritual"],
  sourceRefs: [fixtureSourceRef("Capítulo 10", 213, 212)],
  level: 1,
  school: "divination",
  castingTime: { kind: "action" },
  range: { kind: "self" },
  components: { verbal: true, somatic: true },
  duration: { kind: "minutes", amount: 10, unit: "minute", endTriggers: [] },
  concentration: true,
  ritual: true,
  classes: [asEntityId("wizard"), asEntityId("cleric"), asEntityId("druid")],
  targetType: { type: "self", restrictions: [], visibilityRequired: false },
  attackType: "none",
  damage: [],
  healing: [],
  higherLevels: { kind: "none" },
  effects: [{ kind: "narrative", description: "Percebe presença de magia num raio de 9m." }],
  automationStatus: "assisted",
  pendingDecisionIds: [],
};

// fixture de tipo, não conteúdo canônico
export const conditionPoisoned: ConditionDefinition = {
  id: asEntityId("poisoned"),
  name: "Envenenado",
  tags: [],
  sourceRefs: [fixtureSourceRef("Apêndice A", 292, 291)],
  mechanicalEffects: [
    {
      id: "poisoned-attack-disadvantage",
      sourceRef: fixtureSourceRef("Apêndice A", 292, 291),
      target: { kind: "attack-roll" },
      operator: "grant-disadvantage",
      value: { kind: "flag" },
      predicate: { kind: "while-condition-active", conditionRef: fixtureRef("poisoned") },
    },
    {
      id: "poisoned-ability-check-disadvantage",
      sourceRef: fixtureSourceRef("Apêndice A", 292, 291),
      target: { kind: "ability-check" },
      operator: "grant-disadvantage",
      value: { kind: "flag" },
      predicate: { kind: "while-condition-active", conditionRef: fixtureRef("poisoned") },
    },
  ],
  stackingPolicy: "no-stack",
  removalTriggers: [{ kind: "manual-table-decision", description: "Remoção conforme fonte do efeito que aplicou." }],
};

// fixture de tipo, não conteúdo canônico
export const resourceRage: ResourceDefinition = {
  id: asEntityId("rage"),
  name: "Fúria",
  tags: [],
  sourceRefs: [fixtureSourceRef("Capítulo 3 (Bárbaro)", 47, 46)],
  ownerRef: fixtureRef("barbarian"),
  unit: "uses",
  capacityRule: {
    kind: "by-class-level",
    classRef: fixtureRef("barbarian"),
    amountsByLevel: [{ level: 1, count: 2 }],
  },
  spendRules: [{ kind: "per-use", amount: 1 }],
  recoveryTriggers: [{ kind: "long-rest" }],
  recoveryAmountRule: { kind: "full" },
};

// fixture de tipo, não conteúdo canônico — caso determinístico de 11-DICE-ENGINE.md
export const diceRollAdvantageSample: DiceRoll = {
  id: asUuid("33333333-3333-4333-8333-333333333333"),
  expression: { quantity: 1, faces: 20, modifier: 5, mode: "advantage" },
  purpose: "attack",
  timestamp: FIXED_TIMESTAMP,
  rawDice: [3, 17],
  selectedIndexes: [1],
  discardedIndexes: [0],
  subtotal: 17,
  modifier: 5,
  total: 22,
  rngVersion: "test-rng-1",
};

// fixture de tipo, não conteúdo canônico — um exemplo de cada variante de RuleResult
export const ruleResultSamples: {
  readonly success: RuleResultSuccess;
  readonly needsInput: RuleResultNeedsInput;
  readonly rejected: RuleResultRejected;
} = {
  success: {
    status: "success",
    nextState: { ...minimalCharacter, revision: asRevision(1), hp: { current: 9, temp: 0 } },
    effects: [
      {
        kind: "hp-changed",
        payload: { delta: -1, newCurrent: 9, newTemp: 0 },
        sourceRef: fixtureRef("longsword"),
        targetCharacterId: minimalCharacter.id,
      },
    ],
    explanations: [],
    sourceRefs: [],
  },
  needsInput: {
    status: "needsInput",
    requests: [
      {
        id: asUuid("44444444-4444-4444-8444-444444444444"),
        reason: "Escolher perícia adicional concedida pelo antecedente.",
        validOptions: [
          { kind: "definition-ref", ref: fixtureRef("insight") },
          { kind: "definition-ref", ref: fixtureRef("perception") },
        ],
      },
    ],
    sourceRefs: [],
  },
  rejected: {
    status: "rejected",
    errors: [
      {
        code: "insufficient-resource",
        message: "Sem espaços de magia disponíveis no nível solicitado.",
      },
    ],
    sourceRefs: [],
  },
};

// fixture de tipo, não conteúdo canônico — preço de exemplo em cobre
export const fixtureShortSwordPriceCp = asCopperPieces(1000);

import type { RaceDefinition, RaceTrait } from "@domain/contracts/definitions/race";
import type { OptionalRuleContentPack } from "@domain/contracts/definitions/rulepack";
import type { ResourceDefinition } from "@domain/contracts/definitions/resource";
import { asEntityId, asRulesetId, type DefinitionRef } from "@domain/contracts/ids";
import type { Ability, SourceRef } from "@domain/contracts/primitives";
import { asCentimeters } from "@domain/contracts/primitives";
import { PHB_PTBR_LOCAL_2017_ID } from "@data/rulepacks/manifest";

const sourceId = asRulesetId("fada");
const fairySource: SourceRef = {
  sourceId,
  chapter: "Capítulo 1 — Raças Fantásticas",
  printedPage: 14,
  pdfPage: 1,
  section: "Fada",
};
const localRef = (id: string): DefinitionRef => ({ rulesetId: PHB_PTBR_LOCAL_2017_ID, entityId: asEntityId(id) });
const sourceFor = (section: string): SourceRef => ({ ...fairySource, section });

const abilityOptions: readonly Ability[] = ["int", "wis", "cha"];
const abilityChoiceId = "fairy.spellcasting-ability";
const abilityChoice = {
  id: abilityChoiceId,
  kind: "other" as const,
  count: { min: 1, max: 1 },
  optionSet: { kind: "explicit" as const, options: abilityOptions.map((ability) => localRef(ability)) },
  prerequisites: [],
  unique: true,
  sourceRefs: [sourceFor("Magia das Fadas")],
};

const spellcastingSources = [
  {
    id: asEntityId("fairy.magic-druidcraft"), abilityOptions, abilityChoiceId,
    spellRefs: [], cantripRefs: [localRef("druidismo")], sourceRefs: [sourceFor("Magia das Fadas")],
  },
  {
    id: asEntityId("fairy.magic-faerie-fire"), abilityOptions, abilityChoiceId,
    spellRefs: [localRef("fogo-das-fadas")], minTotalLevel: 3, usesPerLongRest: 1,
    resourceRef: localRef("fairy.faerie-fire-use"), canUseSpellSlots: true, spellListClassId: asEntityId("druid"),
    sourceRefs: [sourceFor("Magia das Fadas")],
  },
  {
    id: asEntityId("fairy.magic-enlarge-reduce"), abilityOptions, abilityChoiceId,
    spellRefs: [localRef("aumentar-reduzir")], minTotalLevel: 5, usesPerLongRest: 1,
    resourceRef: localRef("fairy.enlarge-reduce-use"), canUseSpellSlots: true, spellListClassId: asEntityId("druid"),
    sourceRefs: [sourceFor("Magia das Fadas")],
  },
] as const;

const flightModifier = {
  id: "fairy.flight",
  sourceRef: sourceFor("Voo"),
  target: { kind: "speed-copy" as const, speedKind: "fly" as const, from: "walk" as const },
  operator: "annotate" as const,
  value: { kind: "flag" as const },
  predicate: { kind: "while-not-wearing-armor-categories" as const, armorCategories: ["medium" as const, "heavy" as const] },
};

const fairyTraits: readonly RaceTrait[] = [
  {
    id: asEntityId("fairy.faerie-magic"), name: "Magia das Fadas",
    description: "Conhece Druidismo. A partir do nível 3, pode conjurar Fogo das Fadas uma vez por descanso longo; a partir do nível 5, também Aumentar/reduzir. Pode gastar espaços de magia apropriados. Escolhe Inteligência, Sabedoria ou Carisma como atributo de conjuração.",
    modifiers: [], sourceRefs: [sourceFor("Magia das Fadas")],
  },
  {
    id: asEntityId("fairy.flight-trait"), name: "Voo",
    description: "O deslocamento de voo equivale ao deslocamento de caminhada; não pode usar esse voo usando armadura média ou pesada.",
    modifiers: [flightModifier], sourceRefs: [sourceFor("Voo")],
  },
];

/** Fada da fonte local, separada do catálogo base e disponível apenas pelo pack opcional. */
export const fairy: RaceDefinition = {
  id: asEntityId("fairy"), name: "Fada", tags: ["supplement", "race"], creatureType: "fey", sourceRefs: [fairySource],
  // O PDF local não concede aumento de atributo nem lista idiomas como traço mecânico.
  abilityIncreases: [], size: "small", speedCm: asCentimeters(900), languages: [], senses: [],
  proficiencies: [], traits: fairyTraits, spellcastingSources, subraceIds: [], choices: [abilityChoice],
};

const fairyResources: readonly ResourceDefinition[] = [
  {
    id: asEntityId("fairy.faerie-fire-use"), name: "Magia das Fadas: Fogo das Fadas",
    tags: ["supplement", "racial-spell"], sourceRefs: [sourceFor("Magia das Fadas")],
    ownerRef: localRef("fairy.magic-faerie-fire"), unit: "uses", capacityRule: { kind: "fixed", amount: 1 },
    spendRules: [{ kind: "per-use", amount: 1 }], recoveryTriggers: [{ kind: "long-rest" }], recoveryAmountRule: { kind: "full" },
  },
  {
    id: asEntityId("fairy.enlarge-reduce-use"), name: "Magia das Fadas: Aumentar/reduzir",
    tags: ["supplement", "racial-spell"], sourceRefs: [sourceFor("Magia das Fadas")],
    ownerRef: localRef("fairy.magic-enlarge-reduce"), unit: "uses", capacityRule: { kind: "fixed", amount: 1 },
    spendRules: [{ kind: "per-use", amount: 1 }], recoveryTriggers: [{ kind: "long-rest" }], recoveryAmountRule: { kind: "full" },
  },
];

export const FAIRY_PHYSICAL_FEATURES = [
  "Asas como as de pássaro", "Pele brilhante e multicolorida", "Orelhas especialmente longas",
  "Névoa cintilante permanente", "Pequeno chifre espectral", "Pernas de inseto",
  "Cheiro de brownies frescos", "Frio perceptível, mas inofensivo",
] as const;

export const FAIRY_OPTIONAL_PACK: OptionalRuleContentPack = {
  id: asEntityId("fairy-supplement"), name: "Fada (fonte local)", sourceRefs: [fairySource],
  races: [fairy], resources: fairyResources,
};

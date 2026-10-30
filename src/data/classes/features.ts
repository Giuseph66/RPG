import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { asEntityId } from "@domain/contracts/ids";
import { ref, source } from "./common";
import { classes } from "./classes";
import { CLASS_FEATURE_NAMES, SUBCLASS_FEATURE_NAMES } from "./feature-names";
import { OPTION_GROUPS, optionFeatureId } from "@data/evolution/options";
import { SUBCLASS_FEATURE_CHOICES } from "@data/evolution/choices";
import { type Prerequisite } from "@domain/contracts/primitives";

const classFeatureNames = classes.flatMap((entry) => entry.progression.flatMap((level) => level.featureRefs.map((item) => item.entityId)));
const subclassIds = classes.flatMap((entry) => entry.subclassIds);
const subclassFeatureNames = subclassIds.flatMap((subclassId) => Array.from({ length: 20 }, (_, index) => `${subclassId}-feature-level-${index + 1}`));
const featureIds = [...new Set([...classFeatureNames, ...subclassFeatureNames])];
export const FEATURE_PENDING_DECISIONS: Readonly<Record<string, readonly string[]>> = {
  "wizard.signature-spells": ["PEND-005"],
  "druid.wild-shape": ["PEND-008"],
  "warlock.eldritch-invocations": ["PEND-006"],
  "school-of-transmutation-feature-level-6": ["PEND-017"],
};

/**
 * Índice estrutural das características. A fonte fornece regras detalhadas em documentos
 * próprios; o catálogo mantém referências estáveis para a progressão sem duplicar prosa.
 * Efeitos que exigem contexto de mesa permanecem assistidos no Rules Engine.
 */
const classAndSubclassFeatures: readonly FeatureDefinition[] = featureIds.map((featureId) => {
  const [ownerId] = featureId.split(".");
  const subclassOwner = classes.find((entry) => entry.subclassIds.some((subclassId) => featureId.startsWith(`${subclassId}-feature-level-`)));
  const owner = classes.find((entry) => entry.id === ownerId) ?? subclassOwner;
  const ownerClass = owner ?? classes[0];
  const src = source(ownerClass.id === "barbarian" ? 46 : ownerClass.id === "bard" ? 51 : ownerClass.id === "warlock" ? 56 : ownerClass.id === "cleric" ? 63 : ownerClass.id === "druid" ? 71 : ownerClass.id === "sorcerer" ? 77 : ownerClass.id === "fighter" ? 83 : ownerClass.id === "rogue" ? 89 : ownerClass.id === "wizard" ? 94 : ownerClass.id === "monk" ? 102 : ownerClass.id === "paladin" ? 108 : 115, ownerClass.id === "barbarian" ? 45 : ownerClass.id === "bard" ? 50 : ownerClass.id === "warlock" ? 55 : ownerClass.id === "cleric" ? 62 : ownerClass.id === "druid" ? 70 : ownerClass.id === "sorcerer" ? 76 : ownerClass.id === "fighter" ? 82 : ownerClass.id === "rogue" ? 88 : ownerClass.id === "wizard" ? 93 : ownerClass.id === "monk" ? 101 : ownerClass.id === "paladin" ? 107 : 114, "Características e recursos");
  return {
    id: asEntityId(featureId),
    name: CLASS_FEATURE_NAMES[featureId] ?? SUBCLASS_FEATURE_NAMES[featureId] ?? featureId,
    tags: ["player-handbook", "class-feature"],
    sourceRefs: [src],
    activation: { kind: "passive" },
    eligibility: [],
    effects: featureId === "paladin.divine-sense"
      ? [{ kind: "modifier", modifier: { id: "paladin.divine-sense.extra-use", sourceRef: src, target: { kind: "resource-capacity", resourceRef: ref("paladin.divine-sense") }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } } }]
      : [{ kind: "narrative", description: "Regra detalhada na documentação da classe e resolvida conforme contexto." }],
    resourceCosts: [],
    choices: SUBCLASS_FEATURE_CHOICES[featureId] ?? [],
    automationStatus: FEATURE_PENDING_DECISIONS[featureId]?.length ? "blocked" : "assisted",
    pendingDecisionIds: FEATURE_PENDING_DECISIONS[featureId] ?? [],
  };
});

function optionEligibility(groupOwner: string, prerequisites: (typeof OPTION_GROUPS)[number]["options"][number]["prerequisites"]): readonly Prerequisite[] {
  if (!prerequisites) return [];
  const result: Prerequisite[] = [];
  if (prerequisites.classLevel) result.push({ kind: "min-class-level", classRef: ref(groupOwner), level: prerequisites.classLevel });
  if (prerequisites.pact) result.push({ kind: "has-feature", featureRef: ref(optionFeatureId("pact-boon", prerequisites.pact)) });
  if (prerequisites.cantrip) result.push({ kind: "knows-spell", spellRef: ref(prerequisites.cantrip) });
  return result;
}

/** Opções que o jogador escolhe ao evoluir (estilos de luta, metamagia, invocações…) viram características do pack. */
const optionFeatures: readonly FeatureDefinition[] = OPTION_GROUPS.flatMap((group) => group.options.map((option) => ({
  id: asEntityId(optionFeatureId(group.id, option.id)),
  name: option.name,
  tags: ["player-handbook", "evolution-option", group.id],
  sourceRefs: [source(46, 45, group.label)],
  activation: { kind: "passive" as const },
  eligibility: optionEligibility(group.ownerId, option.prerequisites),
  effects: [{ kind: "narrative" as const, description: option.summary ?? "Regra detalhada no texto da característica." }],
  resourceCosts: [],
  choices: [],
  automationStatus: "assisted" as const,
  pendingDecisionIds: [],
})));

export const features: readonly FeatureDefinition[] = [...classAndSubclassFeatures, ...optionFeatures];
export const classFeatures = features;

const RESOURCE_SPECS: readonly [string, string, "charges" | "uses" | "points" | "dice", ResourceDefinition["capacityRule"], ResourceDefinition["recoveryTriggers"], number, number][] = [
  ["barbarian.rage", "Fúria", "uses", { kind: "by-class-level", classRef: ref("barbarian"), amountsByLevel: [{ level: 1, count: 2 }, { level: 3, count: 3 }, { level: 6, count: 4 }, { level: 12, count: 5 }, { level: 17, count: 6 }, { level: 20, count: 999 }] }, [{ kind: "long-rest" }], 46, 45],
  ["bard.bardic-inspiration", "Inspiração de Bardo", "uses", { kind: "ability-modifier", ability: "cha", minimum: 1 }, [{ kind: "short-rest" }, { kind: "long-rest" }], 51, 50],
  ["cleric.channel-divinity", "Canalizar Divindade", "uses", { kind: "by-class-level", classRef: ref("cleric"), amountsByLevel: [{ level: 2, count: 1 }, { level: 6, count: 2 }, { level: 18, count: 3 }] }, [{ kind: "short-rest" }, { kind: "long-rest" }], 63, 62],
  ["monk.ki", "Chi", "points", { kind: "by-class-level", classRef: ref("monk"), amountsByLevel: Array.from({ length: 19 }, (_, index) => ({ level: index + 2, count: index + 2 })) }, [{ kind: "short-rest" }, { kind: "long-rest" }], 102, 101],
  ["sorcerer.sorcery-points", "Pontos de Feitiçaria", "points", { kind: "by-class-level", classRef: ref("sorcerer"), amountsByLevel: Array.from({ length: 19 }, (_, index) => ({ level: index + 2, count: index + 2 })) }, [{ kind: "long-rest" }], 77, 76],
  ["paladin.lay-on-hands", "Cura pelas Mãos", "points", { kind: "by-class-level", classRef: ref("paladin"), amountsByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, count: (index + 1) * 5 })) }, [{ kind: "long-rest" }], 108, 107],
  ["wizard.arcane-recovery", "Recuperação Arcana", "uses", { kind: "fixed", amount: 1 }, [{ kind: "long-rest" }], 94, 93],
  ["fighter.second-wind", "Segundo Fôlego", "uses", { kind: "fixed", amount: 1 }, [{ kind: "short-rest" }, { kind: "long-rest" }], 83, 82],
  ["fighter.action-surge", "Surto de Ação", "uses", { kind: "by-class-level", classRef: ref("fighter"), amountsByLevel: [{ level: 2, count: 1 }, { level: 17, count: 2 }] }, [{ kind: "short-rest" }, { kind: "long-rest" }], 83, 82],
  ["fighter.indomitable", "Indomável", "uses", { kind: "by-class-level", classRef: ref("fighter"), amountsByLevel: [{ level: 9, count: 1 }, { level: 13, count: 2 }, { level: 17, count: 3 }] }, [{ kind: "long-rest" }], 83, 82],
  ["druid.wild-shape", "Forma Selvagem", "uses", { kind: "fixed", amount: 2 }, [{ kind: "short-rest" }, { kind: "long-rest" }], 71, 70],
  ["paladin.divine-sense", "Sentido Divino", "uses", { kind: "ability-modifier", ability: "cha", minimum: 0 }, [{ kind: "long-rest" }], 108, 107],
  ["rogue.stroke-of-luck", "Golpe de Sorte", "uses", { kind: "fixed", amount: 1 }, [{ kind: "short-rest" }, { kind: "long-rest" }], 89, 88],
];

export const resources: readonly ResourceDefinition[] = RESOURCE_SPECS.map(([resourceId, name, unit, capacityRule, recoveryTriggers, printedPage, pdfPage]) => ({
  id: asEntityId(resourceId),
  name,
  tags: ["player-handbook", "class-resource"],
  sourceRefs: [source(printedPage, pdfPage, "Características e recursos")],
  ownerRef: ref(resourceId.split(".")[0]),
  unit,
  capacityRule,
  spendRules: [{ kind: "per-use", amount: 1 }],
  recoveryTriggers,
  recoveryAmountRule: { kind: "full" },
}));

export const classResources = resources;

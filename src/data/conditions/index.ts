import { asEntityId, asRulesetId, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type ConditionInstance } from "@domain/contracts/character";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { type RuleModifier } from "@domain/contracts/primitives";
import { type SourceRef } from "@domain/contracts/primitives";

const PACK = asRulesetId("phb-ptbr-local-2017");

/** Fonte única do catálogo: Livro do Jogador, apêndice A, pp. 291–293/PDF 290–292. */
export const CONDITIONS_SOURCE_REF: SourceRef = {
  sourceId: PACK,
  chapter: "Apêndice A",
  printedPage: 291,
  pdfPage: 290,
  section: "Condições",
};

function ref(id: string): DefinitionRef {
  return { rulesetId: PACK, entityId: asEntityId(id) };
}

function modifier(id: string, target: RuleModifier["target"], operator: RuleModifier["operator"], description: string): RuleModifier {
  const value = operator === "multiply" ? { kind: "number" as const, amount: 0.5 } : operator === "set-maximum" || operator === "set-minimum" ? { kind: "number" as const, amount: 0 } : { kind: "flag" as const };
  return { id: `${id}.${description}`, sourceRef: CONDITIONS_SOURCE_REF, target, operator, value, predicate: { kind: "always" }, stackingGroup: id };
}

function condition(id: string, name: string, mechanicalEffects: readonly RuleModifier[], stackingPolicy: ConditionDefinition["stackingPolicy"] = "stack-independent-origins", severityRange?: ConditionDefinition["severityRange"]): ConditionDefinition {
  return { id: asEntityId(id), name, tags: ["condition"], sourceRefs: [CONDITIONS_SOURCE_REF], mechanicalEffects, stackingPolicy, removalTriggers: [], severityRange };
}

const attackDisadvantage = (id: string) => modifier(`${id}.attack-disadvantage`, { kind: "attack-roll" }, "grant-disadvantage", "desvantagem em ataques");
const attackAdvantage = (id: string) => modifier(`${id}.attack-advantage`, { kind: "attack-roll" }, "grant-advantage", "ataques contra a criatura têm vantagem");
const abilityCheckDisadvantage = (id: string) => modifier(`${id}.ability-check-disadvantage`, { kind: "ability-check" }, "grant-disadvantage", "desvantagem em testes de habilidade");

/** As 14 condições ordinárias da fonte, cada uma com efeitos consultáveis e fonte. */
export const CONDITION_DEFINITIONS: readonly ConditionDefinition[] = [
  condition("grappled", "Agarrado", [modifier("grappled.speed-zero", { kind: "speed", speedKind: "walk" }, "set-maximum", "deslocamento 0")]),
  condition("frightened", "Amedrontado", [abilityCheckDisadvantage("frightened"), attackDisadvantage("frightened")]),
  condition("stunned", "Atordoado", [modifier("stunned.str-dex-save-fail", { kind: "saving-throw" , ability: "str" }, "set-maximum", "falha em resistência de Força"), modifier("stunned.dex-save-fail", { kind: "saving-throw", ability: "dex" }, "set-maximum", "falha em resistência de Destreza")]),
  condition("prone", "Caído", [attackDisadvantage("prone")]),
  condition("blinded", "Cego", [abilityCheckDisadvantage("blinded"), attackDisadvantage("blinded")]),
  condition("charmed", "Enfeitiçado", []),
  condition("poisoned", "Envenenado", [abilityCheckDisadvantage("poisoned"), attackDisadvantage("poisoned")]),
  condition("restrained", "Impedido", [modifier("restrained.speed-zero", { kind: "speed", speedKind: "walk" }, "set-maximum", "deslocamento 0"), attackDisadvantage("restrained"), modifier("restrained.dex-save-disadvantage", { kind: "saving-throw", ability: "dex" }, "grant-disadvantage", "desvantagem na resistência de Destreza")]),
  condition("incapacitated", "Incapacitado", []),
  condition("unconscious", "Inconsciente", [modifier("unconscious.speed-zero", { kind: "speed", speedKind: "walk" }, "set-maximum", "não move"), attackDisadvantage("unconscious")]),
  condition("invisible", "Invisível", [attackAdvantage("invisible")]),
  condition("paralyzed", "Paralisado", []),
  condition("petrified", "Petrificado", []),
  condition("deafened", "Surdo", []),
  condition("exhaustion", "Exaustão", [abilityCheckDisadvantage("exhaustion.1"), modifier("exhaustion.2-speed-half", { kind: "speed", speedKind: "walk" }, "multiply", "deslocamento pela metade"), attackDisadvantage("exhaustion.3"), modifier("exhaustion.3.saves", { kind: "saving-throw" , ability: "str" }, "grant-disadvantage", "desvantagem em resistências"), modifier("exhaustion.4.max-hp-half", { kind: "hit-points-max" }, "multiply", "máximo de PV pela metade"), modifier("exhaustion.5.speed-zero", { kind: "speed", speedKind: "walk" }, "set-maximum", "deslocamento 0")], "stack-severity", { min: 0, max: 6 }),
];

export const conditions = CONDITION_DEFINITIONS;

/** Lacunas que o contrato atual não consegue expressar sem inventar predicados/contexto. */
export const CONDITION_COVERAGE_PENDENCIES = [
  { conditionId: "grappled", description: "encerramento por alcance/incapacidade do agarrador exige evento de campanha" },
  { conditionId: "frightened", description: "linha de visão e restrição de aproximação exigem contexto de mesa" },
  { conditionId: "prone", description: "vantagem/desvantagem recebida depende da distância do atacante" },
  { conditionId: "charmed", description: "causador e efeitos nocivos exigem identidade de origem" },
  { conditionId: "unconscious", description: "crítico de atacante adjacente exige distância explícita" },
  { conditionId: "petrified", description: "resistência a todo dano e suspensão de efeitos exigem composição de defesas" },
  { conditionId: "exhaustion", description: "nível 6 mata e a aplicação de efeitos cumulativos depende da severidade agregada" },
] as const;

export function findCondition(id: string): ConditionDefinition | undefined {
  return CONDITION_DEFINITIONS.find((entry) => String(entry.id) === id);
}

/** Exaustão é a única entrada cujo efeito depende do nível da instância. */
export function exhaustionEffects(level: number): readonly RuleModifier[] {
  const definition = findCondition("exhaustion");
  if (!definition || !Number.isInteger(level) || level <= 0) return [];
  return definition.mechanicalEffects.filter((effect) => {
    const match = /exhaustion\.(\d+)/.exec(effect.id);
    return match ? Number(match[1]) <= level : false;
  });
}

export type ConditionSource = typeof CONDITIONS_SOURCE_REF;
export type ConditionId = ConditionInstance["definitionRef"]["entityId"];
export type ConditionInstanceId = Uuid;

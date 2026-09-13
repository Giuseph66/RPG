/**
 * Primitivos compartilhados por definitions, estado e regras.
 * Autoridade: docs/criacao/dados/schemas.md ("Primitivos"), 09-MODELO-DE-DADOS.md,
 * 10-RULES-ENGINE.md ("Não criar um somador universal").
 */

import { type Brand, type DefinitionRef, type EntityId, type EntityType, type RulesetId } from "./ids";

// ---------------------------------------------------------------------------
// Unidades — branded numbers inteiros
// ---------------------------------------------------------------------------

export type Centimeters = Brand<number, "Centimeters">;
export type Grams = Brand<number, "Grams">;
export type CopperPieces = Brand<number, "CopperPieces">;

function assertFiniteInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error(`${label} deve ser um número inteiro finito; recebido ${value}.`);
  }
}

export function asCentimeters(value: number): Centimeters {
  assertFiniteInteger(value, "Centimeters");
  return value as Centimeters;
}

export function asGrams(value: number): Grams {
  assertFiniteInteger(value, "Grams");
  return value as Grams;
}

export function asCopperPieces(value: number): CopperPieces {
  assertFiniteInteger(value, "CopperPieces");
  if (value < 0) {
    throw new Error(`CopperPieces não pode ser negativo; recebido ${value}.`);
  }
  return value as CopperPieces;
}

/**
 * Faces com semântica explícita no catálogo físico publicado.
 *
 * A lista é fechada de propósito: um valor só entra no contrato quando o
 * catálogo fornece um mapa completo de faces (ou vértices, no d4). Assim o
 * seletor, o parser e o estágio 3D não conseguem anunciar um dado que o
 * engine não saiba resolver.
 */
export const DICE_FACES = [
  1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30, 48, 50, 60, 100, 120,
] as const;

export type DiceFaces = (typeof DICE_FACES)[number];

export function isDiceFaces(value: unknown): value is DiceFaces {
  return typeof value === "number" && Number.isInteger(value) && DICE_FACES.includes(value as DiceFaces);
}

/** Fórmula estática de dados usada em definitions (ex.: dano de arma, dado de vida). */
export interface DiceFormula {
  readonly quantity: number;
  readonly faces: DiceFaces;
}

// ---------------------------------------------------------------------------
// Enumerações fechadas de regra
// ---------------------------------------------------------------------------

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** 18 perícias, IDs em inglês (cap. 7 do Livro do Jogador). */
export type Skill =
  | "acrobatics"
  | "animal-handling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleight-of-hand"
  | "stealth"
  | "survival";

export type DamageType =
  | "acid"
  | "bludgeoning"
  | "cold"
  | "fire"
  | "force"
  | "lightning"
  | "necrotic"
  | "piercing"
  | "poison"
  | "psychic"
  | "radiant"
  | "slashing"
  | "thunder";

export type Size = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";

/** Categorias de armadura; definido aqui (não em definitions/equipment) para evitar ciclo
 * com RuleModifierPredicate, que também precisa desta categoria. */
export type ArmorCategory = "light" | "medium" | "heavy" | "shield";

/** Carteira do personagem: contagem de moedas por denominação, cada uma inteiro >= 0. */
export type CoinDenomination = "cp" | "sp" | "ep" | "gp" | "pp";
export type Currency = Readonly<Record<CoinDenomination, number>>;

/**
 * Tempo de jogo explícito (nunca relógio real). Decisão de contrato: estrutura mínima que
 * cobre dia/hora/minuto de campanha e rodada de combate opcional; ausência de campo não
 * implica zero, apenas que aquele nível de granularidade não é relevante no contexto.
 */
export interface GameTime {
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly round?: number;
}

// ---------------------------------------------------------------------------
// Fonte e identidade de definição
// ---------------------------------------------------------------------------

export interface SourceRef {
  readonly sourceId: RulesetId;
  readonly chapter: string;
  readonly printedPage?: number;
  readonly pdfPage?: number;
  readonly section?: string;
}

export interface DefinitionBase {
  readonly id: EntityId;
  readonly name: string;
  readonly tags: readonly string[];
  readonly sourceRefs: readonly SourceRef[];
}

// ---------------------------------------------------------------------------
// Prerequisitos — closed, declarativo
// ---------------------------------------------------------------------------

export type Prerequisite =
  | { readonly kind: "min-ability-score"; readonly ability: Ability; readonly score: number }
  | { readonly kind: "min-total-level"; readonly level: number }
  | { readonly kind: "min-class-level"; readonly classRef: DefinitionRef; readonly level: number }
  | { readonly kind: "has-proficiency"; readonly proficiencyRef: DefinitionRef }
  | { readonly kind: "has-feature"; readonly featureRef: DefinitionRef }
  | { readonly kind: "spellcasting-ability-present" }
  | { readonly kind: "custom"; readonly description: string; readonly sourceRef: SourceRef };

// ---------------------------------------------------------------------------
// Escolhas — ChoiceDefinition / ChoiceSelection
// ---------------------------------------------------------------------------

/**
 * Seletor declarativo para opções dinâmicas (ex.: "qualquer perícia"), usado quando a lista
 * de opções não é uma enumeração fixa de DefinitionRef.
 */
export type ChoiceSelector =
  | { readonly kind: "any-entity-of-type"; readonly entityType: EntityType; readonly filterTag?: string }
  | { readonly kind: "any-skill" }
  | { readonly kind: "any-language" }
  | { readonly kind: "any-tool-proficiency" };

export type ChoiceOptionSet =
  | { readonly kind: "explicit"; readonly options: readonly DefinitionRef[] }
  | { readonly kind: "selector"; readonly selector: ChoiceSelector };

/** Categoria da escolha; fechado — nova categoria exige revisão do contrato. */
export type ChoiceKind =
  | "skill-proficiency"
  | "tool-proficiency"
  | "language"
  | "spell"
  | "cantrip"
  | "ability-score-increase"
  | "feat"
  | "equipment-pack"
  | "fighting-style"
  | "subclass-option"
  | "expertise"
  | "other";

export interface ChoiceDefinition {
  readonly id: string;
  readonly kind: ChoiceKind;
  readonly count: { readonly min: number; readonly max: number };
  readonly optionSet: ChoiceOptionSet;
  readonly prerequisites: readonly Prerequisite[];
  readonly unique: boolean;
  readonly sourceRefs: readonly SourceRef[];
}

/** Cardinalidade e elegibilidade são verificadas pelo Rules Engine, não neste contrato. */
export interface ChoiceSelection {
  readonly choiceId: string;
  readonly selectedIds: readonly DefinitionRef[];
  readonly grantedAtLevel: number;
  readonly grantingRef: DefinitionRef;
}

// ---------------------------------------------------------------------------
// RuleModifier — operadores fechados, sem "somador universal"
// ---------------------------------------------------------------------------

/**
 * Alvo declarativo do modificador. Fechado: nova espécie de alvo exige revisão do contrato.
 */
export type RuleModifierTarget =
  | { readonly kind: "ability-score"; readonly ability: Ability }
  | { readonly kind: "ability-modifier"; readonly ability: Ability }
  | { readonly kind: "ability-check"; readonly ability?: Ability }
  | { readonly kind: "attack-roll" }
  | { readonly kind: "skill"; readonly skill: Skill }
  | { readonly kind: "saving-throw"; readonly ability: Ability }
  | { readonly kind: "armor-class" }
  | { readonly kind: "initiative" }
  | { readonly kind: "speed"; readonly speedKind: "walk" | "fly" | "swim" | "climb" | "burrow" }
  | { readonly kind: "hit-points-max" }
  | { readonly kind: "hit-points-per-level" }
  | { readonly kind: "proficiency-bonus" }
  | { readonly kind: "resource-capacity"; readonly resourceRef: DefinitionRef }
  | { readonly kind: "spell-save-dc"; readonly castingSourceRef: DefinitionRef }
  | { readonly kind: "spell-attack-modifier"; readonly castingSourceRef: DefinitionRef }
  | { readonly kind: "damage-roll"; readonly damageType?: DamageType }
  | { readonly kind: "carrying-capacity" }
  | { readonly kind: "passive-score"; readonly skill: Skill }
  | { readonly kind: "custom"; readonly description: string };

/** Operadores fechados; cada um tem semântica própria (ver 10-RULES-ENGINE.md). */
export type RuleModifierOperator =
  | "set-base"
  | "add"
  | "multiply"
  | "set-minimum"
  | "set-maximum"
  | "grant-advantage"
  | "grant-disadvantage"
  | "grant-resistance"
  | "grant-immunity"
  | "grant-vulnerability"
  | "grant-proficiency"
  | "grant-expertise"
  /** Efeito descritivo/contextual; nunca entra em uma fórmula numérica. */
  | "annotate";

/** Valor associado ao operador; "flag" cobre operadores booleanos (advantage/proficiency/...). */
export type RuleModifierValue =
  | { readonly kind: "number"; readonly amount: number }
  | { readonly kind: "dice-formula"; readonly formula: DiceFormula }
  | { readonly kind: "damage-type"; readonly damageType: DamageType }
  | { readonly kind: "flag" };

/**
 * Condição declarativa sob a qual o modificador se aplica. Fechado; "table-decision" cobre
 * casos de mesa sem regra escrita, sempre com proveniência distinta de regra do livro.
 */
export type RuleModifierPredicate =
  | { readonly kind: "always" }
  | { readonly kind: "while-condition-active"; readonly conditionRef: DefinitionRef }
  | { readonly kind: "while-wearing-armor-category"; readonly armorCategory: ArmorCategory }
  | { readonly kind: "while-not-wearing-armor" }
  | { readonly kind: "while-wielding-shield" }
  | { readonly kind: "while-concentrating" }
  | { readonly kind: "min-class-level"; readonly classRef: DefinitionRef; readonly level: number }
  | { readonly kind: "min-total-level"; readonly level: number }
  | { readonly kind: "table-decision"; readonly description: string; readonly sourceRef: SourceRef };

export interface RuleModifier {
  readonly id: string;
  readonly sourceRef: SourceRef;
  readonly target: RuleModifierTarget;
  readonly operator: RuleModifierOperator;
  readonly value: RuleModifierValue;
  readonly predicate: RuleModifierPredicate;
  readonly stackingGroup?: string;
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

export type DurationExpiryTrigger =
  | { readonly kind: "end-of-turn"; readonly whose: "caster" | "target" | "any" }
  | { readonly kind: "start-of-turn"; readonly whose: "caster" | "target" | "any" }
  | { readonly kind: "concentration-ends" }
  | { readonly kind: "short-rest" }
  | { readonly kind: "long-rest" }
  | { readonly kind: "condition-removed"; readonly conditionRef: DefinitionRef }
  | { readonly kind: "damage-taken" }
  | { readonly kind: "table-decision"; readonly description: string };

export interface Duration {
  readonly kind: "instant" | "rounds" | "minutes" | "hours" | "untilRemoved" | "special";
  readonly value?: number;
  readonly expiryTrigger?: DurationExpiryTrigger;
}

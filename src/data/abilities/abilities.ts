/**
 * Catálogo das 6 habilidades (atributos) e regras estáticas de geração/custo.
 * Fonte: Livro do Jogador fornecido (pack `phb-ptbr-local-2017`), capítulo 1, p.12–15/PDF11–14
 * e capítulo 7, p.175–181/PDF174–180. Ver docs/criacao/personagem/atributos.md (operacional).
 *
 * Ownership: DATA-002 (src/data/abilities/**). Não redefine `Ability` (fechado em
 * @domain/contracts/primitives); apenas anexa metadados de exibição/fonte por valor da união.
 */

import { asRulesetId, type RulesetId } from "@domain/contracts/ids";
import { type Ability, type SourceRef } from "@domain/contracts/primitives";
import { type ValidationError, err, ok, type Result } from "@domain/contracts/errors";

/** ID técnico do pack local; repetido localmente (sem módulo "shared") por decisão de ownership. */
const PACK_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

function sourceRef(chapter: string, printedPage: number, pdfPage: number, section?: string): SourceRef {
  return { sourceId: PACK_ID, chapter, printedPage, pdfPage, section };
}

/** cap.1 — criação/uso central de cada habilidade. */
const CHAPTER_1_CREATION = sourceRef("Capítulo 1", 12, 11, "Habilidades — criação e uso central");
/** cap.1 p.15/PDF14 — fórmula de modificador, tabela padrão. */
const CHAPTER_1_MODIFIER_TABLE = sourceRef("Capítulo 1", 15, 14, "Tabela de modificadores de habilidade");
/** cap.7 p.175–181/PDF174–180 — testes de habilidade, resistências e proficiência. */
const CHAPTER_7_USAGE = sourceRef("Capítulo 7", 175, 174, "Testes de habilidade e resistências");

export interface AbilityDefinition {
  readonly id: Ability;
  readonly name: string;
  readonly abbreviation: string;
  readonly sourceRefs: readonly SourceRef[];
}

/** 6 habilidades, ordem canônica do Livro do Jogador (Força → Carisma). */
export const ABILITIES: readonly AbilityDefinition[] = [
  {
    id: "str",
    name: "Força",
    abbreviation: "FOR",
    sourceRefs: [CHAPTER_1_CREATION, CHAPTER_7_USAGE],
  },
  {
    id: "dex",
    name: "Destreza",
    abbreviation: "DES",
    sourceRefs: [CHAPTER_1_CREATION, CHAPTER_7_USAGE],
  },
  {
    id: "con",
    name: "Constituição",
    abbreviation: "CON",
    sourceRefs: [CHAPTER_1_CREATION, CHAPTER_7_USAGE],
  },
  {
    id: "int",
    name: "Inteligência",
    abbreviation: "INT",
    sourceRefs: [CHAPTER_1_CREATION, CHAPTER_7_USAGE],
  },
  {
    id: "wis",
    name: "Sabedoria",
    abbreviation: "SAB",
    sourceRefs: [CHAPTER_1_CREATION, CHAPTER_7_USAGE],
  },
  {
    id: "cha",
    name: "Carisma",
    abbreviation: "CAR",
    sourceRefs: [CHAPTER_1_CREATION, CHAPTER_7_USAGE],
  },
];

export function findAbility(id: Ability): AbilityDefinition | undefined {
  return ABILITIES.find((ability) => ability.id === id);
}

/**
 * `modifier = floor((score - 10) / 2)`. Subtrai antes de dividir; arredonda para baixo mesmo
 * com resultado negativo (Math.floor, não truncamento em direção a zero). Ver atributos.md.
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Matriz padrão de criação (atributos.md): 15,14,13,12,10,8, sem atribuição fixa de habilidade. */
export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];

export interface PointBuyRules {
  readonly budget: number;
  readonly min: number;
  readonly max: number;
  readonly costs: Readonly<Record<number, number>>;
}

/** Compra por pontos opcional: orçamento 27, valores 8–15, custos crescentes (atributos.md). */
export const POINT_BUY: PointBuyRules = {
  budget: 27,
  min: 8,
  max: 15,
  costs: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
};

/**
 * Soma o custo de compra por pontos de uma lista de valores-base. Rejeita qualquer valor fora
 * do domínio 8–15 (não trunca nem ignora silenciosamente); PONTO_BUY.budget não é aplicado aqui
 * — comparar orçamento é responsabilidade do chamador (criação de personagem, fora de DATA-002).
 */
export function pointBuyCost(scores: readonly number[]): Result<number, ValidationError> {
  let total = 0;
  for (const score of scores) {
    if (!Number.isInteger(score) || score < POINT_BUY.min || score > POINT_BUY.max) {
      return err({
        code: "validation-error",
        field: "scores",
        message: `Valor de compra por pontos fora do domínio ${POINT_BUY.min}–${POINT_BUY.max}: ${score}.`,
      });
    }
    total += POINT_BUY.costs[score];
  }
  return ok(total);
}

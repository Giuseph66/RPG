/**
 * Regra de carga e peso de moedas, com os valores métricos impressos no Livro do Jogador.
 *
 * Fonte: capítulo 7, p.176/PDF175 ("Capacidade de Carga" e a variação "Sobrecarga") e
 * capítulo 5, p.143/PDF142 ("A moeda padrão pesa cerca de 10 gramas").
 *
 * O domínio (`src/domain/inventory/impact.ts`) já sabe aplicar esta política; ela fica aqui
 * porque são números da fonte, não decisão de composição. A variação de sobrecarga é
 * opcional no livro, por isso vem separada da capacidade máxima.
 */
import { type EncumbrancePolicy } from "@domain/inventory/model";
import { asRulesetId, type RulesetId } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";

const PACK_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

export const CARRYING_CAPACITY_SOURCE_REF: SourceRef = {
  sourceId: PACK_ID,
  chapter: "Capítulo 7",
  printedPage: 176,
  pdfPage: 175,
  section: "Capacidade de Carga",
};

export const COIN_WEIGHT_SOURCE_REF: SourceRef = {
  sourceId: PACK_ID,
  chapter: "Capítulo 5",
  printedPage: 143,
  pdfPage: 142,
  section: "Riqueza — moedas",
};

/** "A moeda padrão pesa cerca de 10 gramas, assim, cem moedas pesam aproximadamente um quilo." */
export const COIN_WEIGHT_GRAMS = 10;

/** "Sua capacidade de carga máxima é igual a 7,5 vezes o seu valor de Força" (kg). */
export const CARRYING_CAPACITY_GRAMS_PER_STRENGTH_POINT = 7_500;

/** "…até duas vezes a sua capacidade de carga (ou 15 vezes o seu valor de Força)". */
export const PUSH_DRAG_LIFT_MULTIPLIER = 2;

/**
 * Variação opcional "Sobrecarga" (cap. 7, p.176). Multiplicadores sobre o valor de Força,
 * em gramas. O livro apresenta isso como variante — habilitar é decisão de mesa.
 */
export const ENCUMBRANCE_VARIANT_THRESHOLDS = {
  /** Acima de 2,5 × Força: deslocamento −3 m. */
  encumberedGramsPerStrengthPoint: 2_500,
  encumberedSpeedPenaltyCm: 300,
  /** Acima de 5 × Força e até a capacidade máxima: −6 m e desvantagem em For/Des/Con. */
  heavilyEncumberedGramsPerStrengthPoint: 5_000,
  heavilyEncumberedSpeedPenaltyCm: 600,
} as const;

/** Política padrão da mesa: capacidade e peso de moedas ligados, variante de sobrecarga fora. */
export const PHB_ENCUMBRANCE_POLICY: EncumbrancePolicy = {
  enabled: true,
  gramsPerStrengthPoint: CARRYING_CAPACITY_GRAMS_PER_STRENGTH_POINT,
  pushDragLiftMultiplier: PUSH_DRAG_LIFT_MULTIPLIER,
  currencyWeightGramsPerCoin: COIN_WEIGHT_GRAMS,
};

/** Peso total das moedas carregadas, em gramas. */
export function currencyWeightGrams(currency: Readonly<Record<string, number>>): number {
  return Object.values(currency).reduce((total, amount) => total + amount, 0) * COIN_WEIGHT_GRAMS;
}

/** Capacidade máxima de carga, em gramas, para um valor de Força. */
export function carryingCapacityGrams(strengthScore: number): number {
  return strengthScore * CARRYING_CAPACITY_GRAMS_PER_STRENGTH_POINT;
}

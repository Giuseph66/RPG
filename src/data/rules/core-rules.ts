/**
 * Constantes estruturais de regra (não ligadas a XP/progressão — isso é DATA-005).
 * Fonte: Livro do Jogador fornecido, capítulo 1, p.15/PDF14 (tabela de bônus de proficiência
 * por nível total) e p.12–15/PDF11–14 (limites de habilidade). Ver
 * docs/criacao/personagem/progressao.md e docs/criacao/personagem/atributos.md.
 *
 * Ownership: DATA-002 (src/data/rules/**). NÃO inclui limiares de XP: a tabela de progressão
 * completa (XP + PB por nível, `ProgressionDefinition`) é entregue por DATA-005.
 */

import { asRulesetId, type RulesetId } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";
import { type ValidationError, err, ok, type Result } from "@domain/contracts/errors";

const PACK_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

/** cap.1 p.15/PDF14 — tabela de nível total / PB (mesma linha da tabela de XP, sem os limiares). */
export const PROFICIENCY_BONUS_SOURCE_REF: SourceRef = {
  sourceId: PACK_ID,
  chapter: "Capítulo 1",
  printedPage: 15,
  pdfPage: 14,
  section: "Progressão de personagem — bônus de proficiência",
};

/** cap.1 p.12–15/PDF11–14 — limites de valor de habilidade. */
export const ABILITY_SCORE_LIMITS_SOURCE_REF: SourceRef = {
  sourceId: PACK_ID,
  chapter: "Capítulo 1",
  printedPage: 12,
  pdfPage: 11,
  section: "Habilidades — limites de valor",
};

export const MAX_CHARACTER_LEVEL = 20;

/** "Limite usual de personagem 20" (atributos.md); exceção expressa exige fonte própria. */
export const ABILITY_SCORE_CAP = 20;

/** "Entidades podem ter valores até 30" (atributos.md) — teto absoluto do domínio validado. */
export const ABILITY_SCORE_HARD_MAX = 30;

/**
 * Índice 0 = nível total 1 ... índice 19 = nível total 20. `PB = 2 + floor((nível-1)/4)`
 * (docs/criacao/personagem/progressao.md, "Derivação e atualização"); tabulado aqui em vez de
 * recalculado para casar byte a byte com a tabela impressa da fonte.
 */
export const PROFICIENCY_BONUS_BY_LEVEL: readonly number[] = [
  2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
];

/**
 * Bônus de proficiência para um nível total de personagem. Rejeita `totalLevel` fora de 1–20
 * (não trunca nem satura no limite mais próximo) — ver docs/criacao/personagem/progressao.md.
 */
export function proficiencyBonus(totalLevel: number): Result<number, ValidationError> {
  if (!Number.isInteger(totalLevel) || totalLevel < 1 || totalLevel > MAX_CHARACTER_LEVEL) {
    return err({
      code: "validation-error",
      field: "totalLevel",
      message: `Nível total fora do domínio 1–${MAX_CHARACTER_LEVEL}: ${totalLevel}.`,
    });
  }
  return ok(PROFICIENCY_BONUS_BY_LEVEL[totalLevel - 1]);
}

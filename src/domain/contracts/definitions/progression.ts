/**
 * ProgressionDefinition. Autoridade: dados/schemas.md, personagem/progressao.md.
 * "independente de nível da classe" -> tabela única de nível total/XP/proficiência.
 */

import { type DefinitionBase } from "../primitives";

export interface ProgressionTableEntry {
  readonly totalLevel: number;
  readonly xpThreshold: number;
  readonly proficiencyBonus: number;
}

export interface ProgressionDefinition extends DefinitionBase {
  /** Exatamente 20 entradas, níveis 1 a 20, xpThreshold não decrescente. */
  readonly table: readonly ProgressionTableEntry[];
}

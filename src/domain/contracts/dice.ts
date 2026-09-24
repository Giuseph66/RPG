/**
 * Dice Engine — contrato independente de UI. Autoridade: 11-DICE-ENGINE.md.
 */

import { type CommandId, type IsoTimestamp, type Uuid } from "./ids";
import { type DiceFaces } from "./primitives";

export type DiceMode = "normal" | "advantage" | "disadvantage";

export type DicePurpose =
  | "free"
  | "attack"
  | "damage"
  | "healing"
  | "saving-throw"
  | "skill-check"
  | "initiative"
  | "death-save"
  | "ability-score-generation";

/**
 * quantity: 1-100 inteiro. faces: união fechada (11-DICE-ENGINE.md). modifier: -1000..1000
 * inteiro. Vantagem/desvantagem só é válida para exatamente 1d20 — a validação de
 * compatibilidade é responsabilidade do engine (DICE-001), não deste tipo estrutural.
 */
export interface DiceExpression {
  readonly quantity: number;
  readonly faces: DiceFaces;
  readonly modifier: number;
  readonly mode: DiceMode;
}

/** Contrato de RNG injetável; produção usa gerador da plataforma, testes injetam sequência fixa. */
export interface RandomSource {
  readonly nextInt: (minInclusive: number, maxInclusive: number) => number;
}

export interface DiceRoll {
  readonly id: Uuid;
  readonly expression: DiceExpression;
  readonly purpose: DicePurpose;
  readonly characterId?: Uuid;
  readonly commandId?: CommandId;
  /** Contexto legível da rolagem ("Sobrevivência", "Espada Longa"), exibido no histórico. */
  readonly label?: string;
  readonly timestamp: IsoTimestamp;
  readonly rawDice: readonly number[];
  readonly selectedIndexes: readonly number[];
  readonly discardedIndexes: readonly number[];
  readonly subtotal: number;
  readonly modifier: number;
  readonly total: number;
  readonly rngVersion: string;
}

/** Ataque/dano com várias parcelas usa um plano de rolagens com chaves nomeadas. */
export interface RollPlanPart {
  readonly key: string;
  readonly expression: DiceExpression;
}

export interface RollPlan {
  readonly parts: readonly RollPlanPart[];
}

export interface AbilityScoreRollGroup {
  readonly rawDice: readonly [number, number, number, number];
  readonly discardedIndex: 0 | 1 | 2 | 3;
  readonly total: number;
}

/**
 * `rollAbilityScores`: seis grupos de 4d6, descarta um menor em cada grupo. Não reutiliza
 * `mode` de DiceExpression — geração de atributos é operação própria (11-DICE-ENGINE.md).
 */
export interface AbilityScoreRollResult {
  readonly id: Uuid;
  readonly groups: readonly [
    AbilityScoreRollGroup,
    AbilityScoreRollGroup,
    AbilityScoreRollGroup,
    AbilityScoreRollGroup,
    AbilityScoreRollGroup,
    AbilityScoreRollGroup,
  ];
  readonly rngVersion: string;
  readonly timestamp: IsoTimestamp;
}

export interface DiceHistoryEntry {
  readonly roll: DiceRoll;
  /** Ausente = rolagem livre global, separada do histórico por personagem. */
  readonly characterId?: Uuid;
}
